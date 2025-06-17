from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from django.utils import timezone

from core.permissions import HasProjectPermission, IsProjectMember
from core.utils.pagination import StandardResultsSetPagination
from projects.models import Project
from .models import AutomationProject, AutomationTest, TestSchedule, TestExecution
from .serializers import (
    AutomationProjectSerializer,
    AutomationTestSerializer,
    TestScheduleSerializer,
    TestExecutionSerializer,
    TriggerTestExecutionSerializer,
    SyncRepositorySerializer
)


class AutomationProjectViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing automation projects.
    """
    serializer_class = AutomationProjectSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['repository_type', 'sync_status']
    search_fields = ['name', 'repository_url']
    ordering_fields = ['name', 'created_at', 'updated_at', 'last_sync']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter automation projects based on related project or return all for global access.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        if project_id:
            # Project-specific context
            return AutomationProject.objects.filter(
                project_id=project_id,
                project__members=user
            )
        else:
            # Global context (settings page)
            return AutomationProject.objects.filter(
                project__members=user
            )
    
    def perform_create(self, serializer):
        """
        Create a new automation project and associate with the project.
        """
        project_id = self.kwargs.get('project_id') or self.request.data.get('project_id')
        
        if project_id:
            # Use specified project
            try:
                project = Project.objects.get(id=project_id, members=self.request.user)
            except Project.DoesNotExist:
                raise ValidationError({"project_id": "Project not found or access denied"})
        else:
            # Global context - get user's first project or create default
            user_projects = Project.objects.filter(members=self.request.user)
            if user_projects.exists():
                project = user_projects.first()
            else:
                # Create a default project for the user
                project = Project.objects.create(
                    name="Default Project",
                    description="Auto-created project for automation"
                )
                project.members.add(self.request.user)
        
        serializer.save(project=project)
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None, project_id=None):
        """
        Sync repository with the remote source.
        """
        automation_project = self.get_object()
        serializer = SyncRepositorySerializer(data=request.data)
        
        if serializer.is_valid():
            branch = serializer.validated_data.get('branch')
            force = serializer.validated_data.get('force', False)
            
            # Update branch if provided
            if branch and branch != automation_project.branch:
                automation_project.branch = branch
                automation_project.save()
            
            # Mark as syncing
            automation_project.sync_status = 'syncing'
            automation_project.save()
            
            # Launch async sync task
            from .tasks import sync_repository
            sync_task = sync_repository.delay(automation_project.id, force)
            
            return Response(
                {"message": "Repository sync initiated", "status": "syncing"},
                status=status.HTTP_202_ACCEPTED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def tests(self, request, pk=None, project_id=None):
        """
        Get all tests associated with this automation project.
        """
        automation_project = self.get_object()
        queryset = AutomationTest.objects.filter(project=automation_project)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AutomationTestSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = AutomationTestSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def test(self, request, project_id=None):
        """
        Test repository connection without creating a project.
        """
        try:
            import git
            import os
            import tempfile
            from urllib.parse import urlparse
            
            data = request.data
            repo_url = data.get('url')
            branch = data.get('branch', 'main')
            auth_type = data.get('auth_type', 'none')
            
            if not repo_url:
                return Response({
                    'success': False,
                    'error': 'Repository URL is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create temporary directory for test clone
            with tempfile.TemporaryDirectory() as temp_dir:
                try:
                    # Prepare clone options
                    clone_options = {
                        'depth': 1,  # Shallow clone for testing
                        'branch': branch
                    }
                    
                    # Handle authentication
                    if auth_type == 'basic' and data.get('username') and data.get('password'):
                        parsed_url = urlparse(repo_url)
                        auth_url = f"{parsed_url.scheme}://{data['username']}:{data['password']}@{parsed_url.netloc}{parsed_url.path}"
                        repo_url = auth_url
                        auth_success = True
                    elif auth_type == 'token' and data.get('access_token'):
                        parsed_url = urlparse(repo_url)
                        auth_url = f"{parsed_url.scheme}://{data['access_token']}:x-oauth-basic@{parsed_url.netloc}{parsed_url.path}"
                        repo_url = auth_url
                        auth_success = True
                    else:
                        auth_success = auth_type == 'none'
                    
                    # Attempt to clone
                    repo = git.Repo.clone_from(repo_url, temp_dir, **clone_options)
                    
                    # Count test files throughout entire repository
                    test_files_count = 0
                    test_files_found = []
                    
                    # Common test file patterns for different frameworks
                    test_patterns = [
                        # Python patterns
                        lambda f: f.startswith('test_') and f.endswith('.py'),
                        lambda f: f.endswith('_test.py'),
                        lambda f: f.startswith('test') and f.endswith('.py'),
                        # JavaScript patterns  
                        lambda f: f.endswith('.test.js'),
                        lambda f: f.endswith('.spec.js'),
                        lambda f: f.endswith('.test.ts'),
                        lambda f: f.endswith('.spec.ts'),
                        # Robot Framework
                        lambda f: f.endswith('.robot'),
                        # Playwright
                        lambda f: 'playwright' in f.lower() and f.endswith('.py'),
                        lambda f: 'e2e' in f.lower() and f.endswith('.py'),
                    ]
                    
                    # Walk through entire repository
                    for root, dirs, files in os.walk(temp_dir):
                        # Skip common non-test directories
                        dirs[:] = [d for d in dirs if d not in ['.git', '.pytest_cache', '__pycache__', 'node_modules', '.venv', 'venv']]
                        
                        for file in files:
                            # Check if file matches any test pattern
                            if any(pattern(file) for pattern in test_patterns):
                                test_files_count += 1
                                rel_path = os.path.relpath(os.path.join(root, file), temp_dir)
                                test_files_found.append(rel_path)
                    
                    return Response({
                        'success': True,
                        'auth_success': auth_success,
                        'test_files_count': test_files_count,
                        'test_files_found': test_files_found[:10],  # Show first 10 files as examples
                        'branch': branch,
                        'message': 'Repository connection test successful'
                    })
                    
                except git.exc.GitCommandError as e:
                    error_msg = str(e)
                    if 'Authentication failed' in error_msg or 'invalid username or password' in error_msg:
                        return Response({
                            'success': False,
                            'auth_success': False,
                            'error': 'Authentication failed. Please check your credentials.'
                        })
                    elif 'Repository not found' in error_msg:
                        return Response({
                            'success': False,
                            'error': 'Repository not found. Please check the URL.'
                        })
                    else:
                        return Response({
                            'success': False,
                            'error': f'Git error: {error_msg}'
                        })
                        
        except ImportError:
            return Response({
                'success': False,
                'error': 'Git support not available. Please install GitPython.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AutomationTestViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing automation tests.
    """
    serializer_class = AutomationTestSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['framework', 'is_available', 'project']
    search_fields = ['name', 'description', 'file_path']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter automation tests based on automation project and related project.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        automation_project_id = self.kwargs.get('automation_project_id')
        
        return AutomationTest.objects.filter(
            project_id=automation_project_id,
            project__project_id=project_id,
            project__project__members=user
        )
    
    def perform_create(self, serializer):
        """
        Create a new automation test and associate with the automation project.
        """
        automation_project_id = self.kwargs.get('automation_project_id')
        automation_project = AutomationProject.objects.get(id=automation_project_id)
        serializer.save(project=automation_project)
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None, project_id=None, automation_project_id=None):
        """
        Execute a single automation test.
        """
        automation_test = self.get_object()
        environment = request.data.get('environment', 'default')
        parameters = request.data.get('parameters', {})
        
        # Create test execution
        execution = TestExecution.objects.create(
            automation_test=automation_test,
            triggered_by=request.user,
            status='pending',
            environment=environment,
            parameters=parameters
        )
        
        # Launch async execution task
        from .tasks import execute_automation_test
        execute_task = execute_automation_test.delay(execution.id)
        
        return Response(
            TestExecutionSerializer(execution).data,
            status=status.HTTP_202_ACCEPTED
        )
    
    @action(detail=False, methods=['post'])
    def batch_execute(self, request, project_id=None, automation_project_id=None):
        """
        Execute multiple automation tests.
        """
        serializer = TriggerTestExecutionSerializer(data=request.data)
        
        if serializer.is_valid():
            test_ids = serializer.validated_data.get('test_ids')
            environment = serializer.validated_data.get('environment', 'default')
            parameters = serializer.validated_data.get('parameters', {})
            
            executions = []
            for test_id in test_ids:
                try:
                    automation_test = AutomationTest.objects.get(
                        id=test_id, 
                        project_id=automation_project_id
                    )
                    
                    execution = TestExecution.objects.create(
                        automation_test=automation_test,
                        triggered_by=request.user,
                        status='pending',
                        environment=environment,
                        parameters=parameters
                    )
                    
                    # Launch async execution task
                    from .tasks import execute_automation_test
                    execute_task = execute_automation_test.delay(execution.id)
                    
                    executions.append(execution)
                except AutomationTest.DoesNotExist:
                    pass
            
            return Response(
                TestExecutionSerializer(executions, many=True).data,
                status=status.HTTP_202_ACCEPTED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TestScheduleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing test schedules.
    """
    serializer_class = TestScheduleSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['recurrence', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at', 'next_run']
    ordering = ['next_run']

    def get_queryset(self):
        """
        Filter test schedules based on project.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        return TestSchedule.objects.filter(
            project_id=project_id,
            project__members=user
        )
    
    def perform_create(self, serializer):
        """
        Create a new test schedule and associate with the project.
        """
        project_id = self.kwargs.get('project_id')
        project = Project.objects.get(id=project_id)
        serializer.save(project=project, created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None, project_id=None):
        """
        Run a scheduled test immediately.
        """
        schedule = self.get_object()
        
        executions = []
        for automation_test in schedule.tests.all():
            execution = TestExecution.objects.create(
                automation_test=automation_test,
                triggered_by=request.user,
                scheduled_run=schedule,
                status='pending',
                environment='default'  # Using default since schedule doesn't have environment field
            )
            
            # This would be implemented with Celery
            # execute_task = execute_automation_test.delay(execution.id)
            
            # For now, simulate in-progress
            execution.status = 'in_progress'
            execution.start_time = timezone.now()
            execution.save()
            
            executions.append(execution)
        
        # Update last run time
        schedule.last_run = timezone.now()
        schedule.save()
        
        return Response(
            TestExecutionSerializer(executions, many=True).data,
            status=status.HTTP_202_ACCEPTED
        )
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None, project_id=None):
        """
        Toggle the active status of a schedule.
        """
        schedule = self.get_object()
        schedule.is_active = not schedule.is_active
        schedule.save()
        
        return Response({"is_active": schedule.is_active})


class TestExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for accessing test executions.
    """
    serializer_class = TestExecutionSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'automation_test', 'environment', 'scheduled_run']
    search_fields = ['automation_test__name', 'error_message']
    ordering_fields = ['start_time', 'end_time', 'duration']
    ordering = ['-start_time']

    def get_queryset(self):
        """
        Filter test executions based on project and automation test.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        return TestExecution.objects.filter(
            automation_test__project__project_id=project_id,
            automation_test__project__project__members=user
        )
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None, project_id=None):
        """
        Get detailed logs for a test execution.
        """
        execution = self.get_object()
        
        # In a real implementation, this might fetch logs from a file or service
        logs = execution.logs or "No logs available for this execution."
        
        return Response({"logs": logs})