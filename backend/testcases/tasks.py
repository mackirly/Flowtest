"""
Celery tasks for test case execution
"""
import random
import time
from celery import shared_task
from django.utils import timezone

from .models import TestRun, TestCase


@shared_task
def simulate_test_execution(test_run_id, test_case_id):
    """
    Simulate test case execution using Celery
    """
    try:
        # Get fresh objects from database
        test_run = TestRun.objects.get(id=test_run_id)
        test_case = TestCase.objects.get(id=test_case_id)
        
        print(f"[SIMULATION] Starting simulated execution for test: {test_case.title} (ID: {test_case_id})")
        print(f"[SIMULATION] Test type: {test_case.test_type}, Automation project: {test_case.automation_project_id}")
        print(f"[SIMULATION] Automation test name: {test_case.automation_test_name}")
        
        # Simulate test execution time
        time.sleep(3)
        
        # Random result for demonstration (75% success rate)
        success = random.choice([True, True, True, False])
        
        if success:
            test_run.status = 'passed'
            test_run.output = f'✅ Test "{test_case.automation_test_name or test_case.title}" executed successfully'
        else:
            test_run.status = 'failed'
            test_run.error_message = f'❌ Test assertion failed in "{test_case.automation_test_name or test_case.title}"'
            test_run.output = 'Test failed during execution'
        
        test_run.finished_at = timezone.now()
        test_run.save()
        
        return {
            'status': test_run.status,
            'message': test_run.output or test_run.error_message,
            'test_run_id': test_run_id
        }
        
    except Exception as e:
        try:
            test_run = TestRun.objects.get(id=test_run_id)
            test_run.status = 'error'
            test_run.error_message = f'Test execution failed: {str(e)}'
            test_run.finished_at = timezone.now()
            test_run.save()
        except:
            pass
        
        return {
            'status': 'error',
            'message': str(e),
            'test_run_id': test_run_id
        }