"""
Celery tasks for automation functionality
"""
import os
import subprocess
import json
import re
import shutil
import fnmatch
from pathlib import Path
from datetime import datetime

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail

from .models import AutomationProject, AutomationTest, TestExecution
from testcases.models import TestRun
from .utils import (
    send_test_execution_update,
    send_test_execution_log,
    send_repository_sync_update,
    send_user_notification
)


@shared_task
def sync_repository(automation_project_id, force=False):
    """
    Sync/clone repository and discover tests
    """
    try:
        project = AutomationProject.objects.get(id=automation_project_id)
        project.sync_status = 'syncing'
        project.save()
        
        # Send WebSocket notification
        send_repository_sync_update(
            project.project_id,
            'syncing',
            'Starting repository synchronization...',
            progress=10
        )
        
        # Prepare local path
        repo_path = os.path.join(settings.MEDIA_ROOT, 'automation_projects', str(project.id))
        
        # Clone or pull repository
        if os.path.exists(repo_path):
            if force:
                # Remove and re-clone
                shutil.rmtree(repo_path)
                clone_repository(project, repo_path)
            else:
                # Pull latest changes
                pull_repository(project, repo_path)
        else:
            # Clone repository
            clone_repository(project, repo_path)
        
        # Update local path
        project.local_path = repo_path
        
        # Discover tests
        discovered_tests = discover_tests(project, repo_path)
        
        # Update or create test records
        sync_tests(project, discovered_tests)
        
        # Update sync status
        project.sync_status = 'synced'
        project.last_sync = timezone.now()
        project.sync_message = f'Successfully synced. Found {len(discovered_tests)} tests.'
        project.save()
        
        return {
            'status': 'success',
            'message': f'Repository synced successfully. Found {len(discovered_tests)} tests.',
            'tests_count': len(discovered_tests)
        }
        
    except Exception as e:
        if 'project' in locals():
            project.sync_status = 'error'
            project.sync_message = str(e)
            project.save()
        
        return {
            'status': 'error',
            'message': str(e)
        }


def clone_repository(project, repo_path):
    """
    Clone a repository
    """
    os.makedirs(repo_path, exist_ok=True)
    
    # Prepare git command
    git_url = project.get_repository_url_with_auth()
    cmd = ['git', 'clone', '-b', project.branch, git_url, '.']
    
    # Execute clone
    result = subprocess.run(
        cmd,
        cwd=repo_path,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        raise Exception(f"Failed to clone repository: {result.stderr}")


def pull_repository(project, repo_path):
    """
    Pull latest changes from repository
    """
    # Checkout correct branch
    subprocess.run(
        ['git', 'checkout', project.branch],
        cwd=repo_path,
        capture_output=True
    )
    
    # Pull latest changes
    result = subprocess.run(
        ['git', 'pull', 'origin', project.branch],
        cwd=repo_path,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        raise Exception(f"Failed to pull repository: {result.stderr}")


def discover_tests(project, repo_path):
    """
    Discover tests throughout the entire repository based on framework and patterns
    """
    tests = []
    
    # Auto-detect framework if needed
    framework = project.framework
    if framework == 'auto' or not framework:
        detected_frameworks = detect_frameworks(repo_path)
        if detected_frameworks:
            framework = detected_frameworks[0]
        else:
            framework = 'pytest'  # Default
    
    # Discover tests throughout entire repository based on framework
    if framework == 'pytest':
        tests = discover_pytest_tests(repo_path)
    elif framework == 'unittest':
        tests = discover_unittest_tests(repo_path)
    elif framework == 'robot':
        tests = discover_robot_tests(repo_path)
    elif framework == 'playwright':
        tests = discover_playwright_tests(repo_path)
    else:
        # Generic discovery for unknown frameworks
        tests = discover_generic_tests(repo_path)
    
    return tests


def detect_frameworks(repo_path):
    """
    Detect test frameworks used in the repository
    """
    frameworks = []
    
    # Check for common framework files/patterns
    if os.path.exists(os.path.join(repo_path, 'pytest.ini')) or \
       os.path.exists(os.path.join(repo_path, 'setup.cfg')) or \
       any(Path(repo_path).rglob('test_*.py')) or \
       any(Path(repo_path).rglob('*_test.py')):
        frameworks.append('pytest')
    
    if any(Path(repo_path).rglob('*.robot')):
        frameworks.append('robot')
    
    if os.path.exists(os.path.join(repo_path, 'playwright.config.js')) or \
       os.path.exists(os.path.join(repo_path, 'playwright.config.ts')):
        frameworks.append('playwright')
    
    # Check imports in Python files
    for py_file in Path(repo_path).rglob('*.py'):
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'import unittest' in content or 'from unittest' in content:
                    if 'unittest' not in frameworks:
                        frameworks.append('unittest')
                if 'import pytest' in content or 'from pytest' in content:
                    if 'pytest' not in frameworks:
                        frameworks.append('pytest')
        except:
            pass
    
    return frameworks


def discover_pytest_tests(repo_path):
    """
    Discover pytest tests throughout the entire repository
    """
    tests = []
    
    # First try using pytest to discover tests in entire repository
    cmd = ['pytest', '--collect-only', '-q', repo_path]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=repo_path)
    
    if result.returncode == 0:
        # Parse pytest output
        for line in result.stdout.splitlines():
            if '::' in line:
                # Match test collection output
                match = re.match(r'^(.+?)::(.+?)::(.+?)$', line.strip())
                if match:
                    file_path, class_name, method_name = match.groups()
                    tests.append({
                        'file_path': file_path,
                        'class_name': class_name,
                        'method_name': method_name,
                        'name': f"{class_name}.{method_name}",
                        'framework': 'pytest'
                    })
                else:
                    # Try to match function-only tests
                    match = re.match(r'^(.+?)::(.+?)$', line.strip())
                    if match:
                        file_path, method_name = match.groups()
                        tests.append({
                            'file_path': file_path,
                            'class_name': None,
                            'method_name': method_name,
                            'name': method_name,
                            'framework': 'pytest'
                        })
    
    # If pytest didn't work, fallback to manual discovery
    if not tests:
        tests = discover_generic_tests(repo_path, 'pytest')
    
    return tests


def discover_generic_tests(repo_path, framework='pytest'):
    """
    Generic test discovery by scanning files throughout repository
    """
    tests = []
    
    # Define test file patterns for different frameworks
    patterns_map = {
        'pytest': ['test_*.py', '*_test.py'],
        'unittest': ['test_*.py', '*_test.py'],
        'robot': ['*.robot'],
        'playwright': ['*.spec.js', '*.test.js', '*.spec.ts', '*.test.ts', 'test_*.py']
    }
    
    test_patterns = patterns_map.get(framework, ['test_*.py', '*_test.py'])
    
    for root, dirs, files in os.walk(repo_path):
        # Skip common non-test directories
        dirs[:] = [d for d in dirs if d not in ['.git', '.pytest_cache', '__pycache__', 'node_modules', '.venv', 'venv', '.tox']]
        
        for file in files:
            if any(fnmatch.fnmatch(file, pattern) for pattern in test_patterns):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, repo_path)
                
                # Add basic test entry
                tests.append({
                    'file_path': rel_path,
                    'class_name': None,
                    'method_name': os.path.splitext(file)[0],
                    'name': os.path.splitext(file)[0],
                    'framework': framework,
                    'description': f'Test file: {rel_path}'
                })
    
    return tests


def discover_unittest_tests(repo_path):
    """
    Discover unittest tests throughout repository
    """
    tests = discover_generic_tests(repo_path, 'unittest')
    return tests


def discover_robot_tests(repo_path):
    """
    Discover Robot Framework tests throughout repository
    """
    tests = discover_generic_tests(repo_path, 'robot')
    return tests


def discover_playwright_tests(repo_path):
    """
    Discover Playwright tests throughout repository
    """
    tests = discover_generic_tests(repo_path, 'playwright')
    return tests


def link_test_cases_with_automation_tests(project):
    """
    Link test cases that have automation_test_name with discovered automation tests
    """
    from testcases.models import TestCase
    
    # Get all test cases that have automation_test_name set
    test_cases = TestCase.objects.filter(
        automation_test_name__isnull=False,
        automation_test_name__gt=''
    ).exclude(
        automation_test_name=''
    )
    
    # Get all available automation tests for this project
    automation_tests = project.tests.filter(is_available=True)
    
    # Create a mapping of test identifiers
    test_map = {}
    for test in automation_tests:
        # Create various possible identifiers for the test
        identifiers = []
        
        # Full path with class and method
        if test.class_name:
            identifiers.append(f"{test.file_path}::{test.class_name}::{test.method_name}")
            identifiers.append(f"{test.class_name}.{test.method_name}")
            identifiers.append(f"{test.class_name}::{test.method_name}")
        
        # Just file and method
        identifiers.append(f"{test.file_path}::{test.method_name}")
        
        # Just method name
        identifiers.append(test.method_name)
        
        # Store all identifiers
        for identifier in identifiers:
            test_map[identifier] = test
    
    # Link test cases with automation tests
    matched_count = 0
    for test_case in test_cases:
        automation_test_name = test_case.automation_test_name.strip()
        
        # Try to find matching automation test
        if automation_test_name in test_map:
            # Direct match found
            test_case.automation_test = test_map[automation_test_name]
            test_case.save()
            matched_count += 1
        else:
            # Try partial matches
            for identifier, test in test_map.items():
                if automation_test_name in identifier or identifier in automation_test_name:
                    test_case.automation_test = test
                    test_case.save()
                    matched_count += 1
                    break
    
    return matched_count


def sync_tests(project, discovered_tests):
    """
    Sync discovered tests with database
    """
    # Get existing tests
    existing_tests = {
        (t.file_path, t.class_name, t.method_name): t
        for t in project.tests.all()
    }
    
    # Update or create tests
    for test_data in discovered_tests:
        key = (test_data['file_path'], test_data['class_name'], test_data['method_name'])
        
        if key in existing_tests:
            # Update existing test
            test = existing_tests[key]
            test.is_available = True
            test.framework = test_data['framework']
            test.save()
            del existing_tests[key]
        else:
            # Create new test
            AutomationTest.objects.create(
                project=project,
                name=test_data['name'],
                file_path=test_data['file_path'],
                class_name=test_data['class_name'],
                method_name=test_data['method_name'],
                framework=test_data['framework'],
                is_available=True
            )
    
    # Mark remaining tests as unavailable
    for test in existing_tests.values():
        test.is_available = False
        test.save()
    
    # Link test cases with automation tests
    link_test_cases_with_automation_tests(project)


@shared_task
def execute_automation_test(execution_id, test_run_id=None):
    """
    Execute an automation test
    """
    try:
        execution = TestExecution.objects.get(id=execution_id)
        test = execution.automation_test
        project = test.project
        
        # Update execution status
        execution.status = 'in_progress'
        execution.start_time = timezone.now()
        execution.save()
        
        # Update test run if provided
        if test_run_id:
            test_run = TestRun.objects.get(id=test_run_id)
            test_run.status = 'running'
            test_run.started_at = timezone.now()
            test_run.save()
        
        # Prepare test command
        repo_path = project.local_path
        if not repo_path or not os.path.exists(repo_path):
            raise Exception("Repository not found. Please sync the repository first.")
        
        # Build command based on framework
        cmd = build_test_command(test, execution.environment, execution.parameters)
        
        # Execute test
        result = subprocess.run(
            cmd,
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=600  # 10 minutes timeout
        )
        
        # Process results
        execution.end_time = timezone.now()
        execution.duration = execution.end_time - execution.start_time
        execution.output = result.stdout
        execution.logs = result.stderr
        
        if result.returncode == 0:
            execution.status = 'success'
            execution.result = 'Test passed successfully'
            if test_run_id:
                test_run.status = 'passed'
        else:
            execution.status = 'failed'
            execution.error_message = f"Test failed with exit code {result.returncode}"
            execution.result = 'Test failed'
            if test_run_id:
                test_run.status = 'failed'
                test_run.error_message = execution.error_message
        
        execution.save()
        
        # Update test run
        if test_run_id:
            test_run.finished_at = timezone.now()
            test_run.duration = (test_run.finished_at - test_run.started_at).total_seconds()
            test_run.output = execution.output
            test_run.save()
        
        # Send notifications if configured
        if hasattr(settings, 'SEND_TEST_NOTIFICATIONS') and settings.SEND_TEST_NOTIFICATIONS:
            send_test_notification(execution)
        
        return {
            'status': execution.status,
            'message': execution.result or execution.error_message,
            'duration': str(execution.duration)
        }
        
    except subprocess.TimeoutExpired:
        if 'execution' in locals():
            execution.status = 'timeout'
            execution.error_message = 'Test execution timed out'
            execution.end_time = timezone.now()
            execution.save()
        
        if test_run_id and 'test_run' in locals():
            test_run.status = 'error'
            test_run.error_message = 'Test execution timed out'
            test_run.finished_at = timezone.now()
            test_run.save()
        
        return {
            'status': 'timeout',
            'message': 'Test execution timed out'
        }
        
    except Exception as e:
        if 'execution' in locals():
            execution.status = 'error'
            execution.error_message = str(e)
            execution.end_time = timezone.now()
            execution.save()
        
        if test_run_id and 'test_run' in locals():
            test_run.status = 'error'
            test_run.error_message = str(e)
            test_run.finished_at = timezone.now()
            test_run.save()
        
        return {
            'status': 'error',
            'message': str(e)
        }


def build_test_command(test, environment='default', parameters=None):
    """
    Build test execution command based on framework
    """
    if test.framework == 'pytest':
        cmd = ['pytest', '-v']
        
        # Add test path
        if test.class_name and test.method_name:
            cmd.append(f"{test.file_path}::{test.class_name}::{test.method_name}")
        elif test.method_name:
            cmd.append(f"{test.file_path}::{test.method_name}")
        else:
            cmd.append(test.file_path)
        
        # Add parameters
        if parameters:
            if 'markers' in parameters:
                cmd.extend(['-m', parameters['markers']])
            if 'options' in parameters:
                cmd.extend(parameters['options'].split())
        
    elif test.framework == 'unittest':
        cmd = ['python', '-m', 'unittest']
        
        # Convert file path to module path
        module_path = test.file_path.replace('/', '.').replace('\\', '.').replace('.py', '')
        
        if test.class_name and test.method_name:
            cmd.append(f"{module_path}.{test.class_name}.{test.method_name}")
        else:
            cmd.append(module_path)
        
    elif test.framework == 'robot':
        cmd = ['robot']
        
        if test.method_name:
            cmd.extend(['-t', test.method_name])
        
        cmd.append(test.file_path)
        
    elif test.framework == 'playwright':
        cmd = ['npx', 'playwright', 'test', test.file_path]
        
        if parameters and 'browser' in parameters:
            cmd.extend(['--browser', parameters['browser']])
    
    else:
        # Default to pytest
        cmd = ['pytest', test.file_path]
    
    return cmd


def send_test_notification(execution):
    """
    Send email notification about test execution
    """
    if execution.triggered_by and execution.triggered_by.email:
        subject = f"Test Execution {'Passed' if execution.status == 'success' else 'Failed'}: {execution.automation_test.name}"
        
        message = f"""
        Test: {execution.automation_test.name}
        Status: {execution.status}
        Duration: {execution.duration}
        Environment: {execution.environment}
        
        Result: {execution.result or execution.error_message}
        
        View details: {settings.FRONTEND_URL}/test-executions/{execution.id}
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [execution.triggered_by.email],
            fail_silently=True
        )


@shared_task
def cleanup_old_executions():
    """
    Clean up old test executions (older than 30 days)
    """
    cutoff_date = timezone.now() - timezone.timedelta(days=30)
    
    old_executions = TestExecution.objects.filter(
        created_at__lt=cutoff_date,
        status__in=['success', 'failed', 'error', 'timeout']
    )
    
    count = old_executions.count()
    old_executions.delete()
    
    return f"Deleted {count} old test executions"


@shared_task
def process_due_events():
    """
    Process test-execution events that are due for execution
    """
    from events.models import Event
    from django.utils import timezone
    from datetime import timedelta
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Get current time
        now = timezone.now()
        current_date = now.date()
        current_time = now.time()
        
        # Create time buffer (2 minutes to handle processing delays)
        buffer_time = timedelta(minutes=2)
        check_window_start = now - buffer_time
        check_window_end = now + buffer_time
        
        logger.info(f"Processing due events at {now}")
        
        # Find test-execution events that could be due today
        candidate_events = Event.objects.filter(
            event_type='test-execution',
            date__lte=current_date
        )
        
        logger.info(f"Found {candidate_events.count()} candidate test-execution events")
        
        processed_count = 0
        executed_count = 0
        
        for event in candidate_events:
            logger.info(f"Checking event: {event.title} (date: {event.date}, time: {event.time})")
            
            # For events without specific time, execute once at midnight
            event_time = event.time or timezone.datetime.min.time()
            
            # Create event datetime
            try:
                event_datetime = timezone.make_aware(
                    timezone.datetime.combine(event.date, event_time)
                )
            except Exception as dt_error:
                logger.error(f"Error creating datetime for event {event.id}: {dt_error}")
                continue
            
            # For recurring events, check if we should execute today
            should_execute = False
            
            if event.recurring:
                # Check if today matches recurrence pattern
                next_occurrence = event.get_next_occurrence(current_date)
                if next_occurrence == current_date:
                    should_execute = True
                    logger.info(f"Event {event.title} matches recurrence pattern for today")
            else:
                # Non-recurring event: execute only on its exact date
                if event.date == current_date:
                    should_execute = True
                    logger.info(f"Event {event.title} is scheduled for today")
            
            if not should_execute:
                continue
                
            # Check if we're within execution time window
            event_today = timezone.make_aware(
                timezone.datetime.combine(current_date, event_time)
            )
            
            if not (check_window_start <= event_today <= check_window_end):
                logger.debug(f"Event {event.title} not in time window. Event time: {event_today}, Window: {check_window_start} - {check_window_end}")
                continue
                
            processed_count += 1
            
            # Check if we've already executed this event occurrence today
            execution_key = f"event_{event.id}_{current_date.strftime('%Y%m%d')}"
            
            # Use Redis to track processed events (prevent duplicates)
            from django.core.cache import cache
            if cache.get(execution_key):
                logger.info(f"Event {event.title} already executed today")
                continue
                
            # Mark as processed (expires in 25 hours to handle timezone issues)
            cache.set(execution_key, True, timeout=90000)
            
            logger.info(f"Executing tests for event: {event.title}")
            
            # Execute the event's tests
            result = execute_event_tests(event, event_today)
            if result['success']:
                executed_count += 1
                logger.info(f"Successfully executed {result['executions_count']} tests for event {event.title}")
                
                # Send notification if configured  
                try:
                    # Пока отключим уведомления, так как функция не реализована полностью
                    logger.info(f"Would send notification to {event.created_by.username}: Event '{event.title}' triggered {result['executions_count']} test executions.")
                except Exception as notif_error:
                    logger.error(f"Failed to send notification: {notif_error}")
            else:
                logger.error(f"Failed to execute tests for event {event.title}: {result.get('error', 'Unknown error')}")
        
        logger.info(f"Processing complete. Processed: {processed_count}, Executed: {executed_count}")
        
        return {
            'processed_events': processed_count,
            'executed_events': executed_count,
            'message': f'Processed {processed_count} due events, executed {executed_count}'
        }
        
    except Exception as e:
        logger.error(f"Error processing due events: {str(e)}")
        return {
            'error': str(e),
            'message': f'Error processing due events: {str(e)}'
        }


def execute_event_tests(event, execution_time):
    """
    Execute tests based on event configuration
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Executing tests for event: {event.title} (ID: {event.id})")
        executions = []
        
        # Check if event has a project
        if not event.project:
            logger.error(f"Event {event.title} has no associated project")
            return {
                'success': False,
                'error': 'Event has no associated project'
            }
        
        # Get automation project for the event's project
        automation_projects = AutomationProject.objects.filter(
            project=event.project,
            sync_status='synced'
        )
        
        logger.info(f"Found {automation_projects.count()} synced automation projects for project {event.project.name}")
        
        if not automation_projects.exists():
            logger.error(f"No synced automation project found for project {event.project.name}")
            return {
                'success': False,
                'error': f'No synced automation project found for project {event.project.name}'
            }
        
        automation_project = automation_projects.first()
        logger.info(f"Using automation project: {automation_project.name}")
        
        # Get tests to execute based on event configuration
        tests_to_execute = []
        
        if event.test_selection_type == 'all':
            # Execute all available tests in the project
            tests_to_execute = list(automation_project.tests.filter(is_available=True))
            logger.info(f"Selected ALL tests: {len(tests_to_execute)} tests")
            
        elif event.test_selection_type == 'folder':
            # Execute tests from selected folders
            from testcases.models import TestCase
            if event.selected_folders:
                logger.info(f"Selected folders: {event.selected_folders}")
                folder_test_cases = TestCase.objects.filter(
                    folder__id__in=event.selected_folders,
                    automation_test__isnull=False,
                    automation_test__is_available=True
                )
                tests_to_execute = [tc.automation_test for tc in folder_test_cases]
                logger.info(f"Selected FOLDER tests: {len(tests_to_execute)} tests")
            else:
                logger.warning("No folders selected for folder-based test selection")
            
        elif event.test_selection_type == 'specific':
            # Execute specific selected test cases
            selected_test_cases = event.test_cases.filter(
                automation_test__isnull=False,
                automation_test__is_available=True
            )
            tests_to_execute = [tc.automation_test for tc in selected_test_cases]
            logger.info(f"Selected SPECIFIC tests: {len(tests_to_execute)} tests")
        else:
            logger.warning(f"Unknown test selection type: {event.test_selection_type}")
        
        if not tests_to_execute:
            logger.warning(f"No tests to execute for event {event.title}")
            return {
                'success': True,
                'executions_count': 0,
                'execution_ids': [],
                'message': 'No tests to execute'
            }
        
        # Create test executions
        for automation_test in tests_to_execute:
            logger.info(f"Creating execution for test: {automation_test.name}")
            execution = TestExecution.objects.create(
                automation_test=automation_test,
                triggered_by=event.created_by,
                status='pending',
                environment='default',
                parameters={
                    'triggered_by_event': event.id,
                    'event_title': event.title,
                    'execution_time': execution_time.isoformat()
                }
            )
            
            # Launch async execution task
            logger.info(f"Launching async execution task for test: {automation_test.name}")
            execute_automation_test.delay(execution.id)
            executions.append(execution)
        
        logger.info(f"Created {len(executions)} test executions for event {event.title}")
        
        return {
            'success': True,
            'executions_count': len(executions),
            'execution_ids': [ex.id for ex in executions]
        }
        
    except Exception as e:
        logger.error(f"Error executing tests for event {event.title}: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }