from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from django.utils import timezone
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

from core.permissions import HasProjectPermission, IsProjectMember
from core.utils.pagination import StandardResultsSetPagination
from projects.models import Project, Folder
from automation.models import AutomationProject, AutomationTest, TestExecution
from .models import TestCase, TestRun, TestReport, TestEvent, RegressionRun
from .serializers import (
    TestCaseSerializer, 
    AutomatedTestCaseSerializer,
    TestRunSerializer, 
    TestReportSerializer, 
    TestEventSerializer,
    ExecuteTestSerializer,
    BatchExecuteTestsSerializer,
    TestCaseImportSerializer,
    TestCaseExportSerializer,
    RegressionRunSerializer,
    ManualTestRunSerializer
)
from .tasks import simulate_test_execution


class TestCaseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing test cases.
    """
    serializer_class = TestCaseSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['priority', 'test_type', 'folder']
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['created_at', 'updated_at', 'title', 'priority']
    ordering = ['-updated_at']

    def get_queryset(self):
        """
        Filter test cases based on project and folder if provided.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        folder_id = self.request.query_params.get('folder')
        
        try:
            queryset = TestCase.objects.filter(project_id=project_id)
            
            if folder_id:
                queryset = queryset.filter(folder_id=folder_id)
                
            return queryset.filter(project__members=user).select_related('folder', 'project', 'author')
        except Exception as e:
            logger.error(f"Error in TestCaseViewSet.get_queryset: {e}")
            raise
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on the test case type.
        """
        if self.action == 'list' or self.action == 'retrieve':
            instance = self.get_object() if self.action == 'retrieve' else None
            if instance and instance.test_type == 'automated':
                return AutomatedTestCaseSerializer
        return TestCaseSerializer
    
    def perform_create(self, serializer):
        """
        Create a new test case and associate with the project.
        """
        project_id = self.kwargs.get('project_id')
        project = Project.objects.get(id=project_id)
        serializer.save(project=project, author=self.request.user)
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None, project_id=None):
        """
        Execute a test case.
        """
        test_case = self.get_object()
        serializer = ExecuteTestSerializer(data=request.data)
        
        if serializer.is_valid():
            # Create a test run
            test_run = TestRun.objects.create(
                test_case=test_case,
                executor=request.user,
                status='pending'
            )
            
            # Start test execution using Celery task
            test_run.status = 'running'
            test_run.started_at = timezone.now()
            test_run.save()
            
            # If automated test case with real automation test available
            if test_case.test_type == 'automated' and test_case.automation_project and test_case.automation_test_name:
                try:
                    # Parse the test name to get file path, class, and method
                    test_parts = test_case.automation_test_name.split('::')
                    file_path = test_parts[0] if test_parts else test_case.automation_test_name
                    
                    # Find matching automation test
                    automation_test = AutomationTest.objects.filter(
                        project=test_case.automation_project,
                        file_path__icontains=file_path
                    ).first()
                    
                    if automation_test:
                        # Launch real automation execution
                        from automation.tasks import execute_automation_test
                        environment = serializer.validated_data.get('environment', 'default')
                        parameters = serializer.validated_data.get('parameters', {})
                        
                        execution = TestExecution.objects.create(
                            automation_test=automation_test,
                            triggered_by=request.user,
                            status='pending',
                            environment=environment,
                            parameters=parameters
                        )
                        
                        # Use Celery task for real automation test execution
                        execute_task = execute_automation_test.delay(execution.id, test_run.id)
                        
                        # Refresh object from database to get updated status
                        test_run.refresh_from_db()
                        return Response({
                            'test_run': TestRunSerializer(test_run).data,
                            'execution_id': execution.id,
                            'message': f'Real automation test execution started: {test_case.automation_test_name}'
                        }, status=status.HTTP_201_CREATED)
                    else:
                        # Fallback to simulation using Celery
                        simulate_test_execution.delay(test_run.id, test_case.id)
                except Exception as e:
                    logger.error(f"Error setting up real automation test: {e}")
                    # Fallback to simulation using Celery
                    simulate_test_execution.delay(test_run.id, test_case.id)
            else:
                # Use Celery task for test simulation (manual tests or tests without automation setup)
                simulate_test_execution.delay(test_run.id, test_case.id)
            
            # Refresh object from database to get updated status
            test_run.refresh_from_db()
            return Response({
                'test_run': TestRunSerializer(test_run).data,
                'message': f'Test execution started: {test_case.title}'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def test_runs(self, request, pk=None, project_id=None):
        """
        Get test runs for a specific test case.
        """
        test_case = self.get_object()
        test_runs = TestRun.objects.filter(test_case=test_case).order_by('-id')[:10]
        return Response(TestRunSerializer(test_runs, many=True).data)
    
    @action(detail=True, methods=['get'])
    def latest_run(self, request, pk=None, project_id=None):
        """
        Get the latest test run for a specific test case.
        """
        test_case = self.get_object()
        latest_run = TestRun.objects.filter(test_case=test_case).order_by('-id').first()
        if latest_run:
            return Response(TestRunSerializer(latest_run).data)
        return Response({'message': 'No test runs found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def copy(self, request, pk=None, project_id=None):
        """
        Create a copy of the test case.
        """
        test_case = self.get_object()
        folder_id = request.data.get('folder_id')
        
        # Create a new test case with same attributes
        new_test_case = TestCase.objects.create(
            title=f"Copy of {test_case.title}",
            description=test_case.description,
            condition=test_case.condition,
            steps=test_case.steps,
            expected_results=test_case.expected_results,
            priority=test_case.priority,
            platform=test_case.platform,
            test_type=test_case.test_type,
            test_code=test_case.test_code,
            project=test_case.project,
            folder_id=folder_id if folder_id else test_case.folder_id,
            author=request.user,
            script_path=test_case.script_path,
            class_name=test_case.class_name,
            method_name=test_case.method_name,
            framework=test_case.framework,
            automation_project=test_case.automation_project,
            automation_test_name=test_case.automation_test_name
        )
        
        # Copy tags (tags is a JSONField, not ManyToManyField)
        new_test_case.tags = test_case.tags
        new_test_case.save()
        
        return Response(TestCaseSerializer(new_test_case).data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def batch_execute(self, request, project_id=None):
        """
        Execute multiple test cases at once.
        """
        serializer = BatchExecuteTestsSerializer(data=request.data)
        
        if serializer.is_valid():
            test_case_ids = serializer.validated_data.get('test_case_ids', [])
            environment = serializer.validated_data.get('environment', 'Default')
            
            test_runs = []
            for test_case_id in test_case_ids:
                try:
                    test_case = TestCase.objects.get(id=test_case_id, project_id=project_id)
                    test_run = TestRun.objects.create(
                        test_case=test_case,
                        executor=request.user,
                        status='pending'
                    )
                    test_runs.append(test_run)
                    
                    # If automated, trigger the automation process
                    if test_case.test_type == 'automated':
                        # Launch test execution task
                        # celery_task = execute_test_case.delay(test_run.id)
                        # test_run.task_id = celery_task.id
                        # test_run.save()
                        pass
                except TestCase.DoesNotExist:
                    pass
            
            return Response(
                TestRunSerializer(test_runs, many=True).data, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def import_test_cases(self, request, project_id=None):
        """
        Import test cases from a file.
        """
        serializer = TestCaseImportSerializer(data=request.data)
        
        if serializer.is_valid():
            # Process file import
            file_data = serializer.validated_data.get('file')
            folder_id = serializer.validated_data.get('folder_id')
            
            # Import logic will be implemented
            # imported_test_cases = import_test_cases_from_file(file_data, project_id, folder_id, request.user)
            
            return Response({"message": "Import feature will be implemented"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def available_tests(self, request, pk=None, project_id=None):
        """
        Get available automation tests for a test case from the repository.
        """
        test_case = self.get_object()
        
        if not test_case.automation_project:
            return Response(
                {"error": "Test case has no automation project assigned"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all tests from the automation project
        automation_tests = AutomationTest.objects.filter(
            project=test_case.automation_project,
            is_available=True
        ).values('id', 'name', 'file_path', 'class_name', 'method_name', 'framework')
        
        return Response({
            "automation_project": test_case.automation_project.name,
            "tests": list(automation_tests)
        })
    
    @action(detail=True, methods=['get'])
    def test_runs(self, request, pk=None, project_id=None):
        """
        Get test runs for a specific test case.
        """
        logger.info(f"Getting test runs for test case {pk} in project {project_id}")
        test_case = self.get_object()
        
        # Debug: Check if test case belongs to the right project
        logger.info(f"Test case {test_case.id} belongs to project {test_case.project_id}")
        
        test_runs = TestRun.objects.filter(test_case=test_case).order_by('-started_at', '-id')
        logger.info(f"Found {test_runs.count()} test runs for test case {test_case.id}")
        
        # Debug: Log first test run details if exists
        if test_runs.exists():
            first_run = test_runs.first()
            logger.info(f"First test run: ID={first_run.id}, Status={first_run.status}, Started={first_run.started_at}")
        
        # Serialize the test runs
        serializer = TestRunSerializer(test_runs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def latest_run(self, request, pk=None, project_id=None):
        """
        Get the latest test run for a specific test case.
        """
        test_case = self.get_object()
        latest_run = TestRun.objects.filter(test_case=test_case).order_by('-started_at').first()
        
        if latest_run:
            serializer = TestRunSerializer(latest_run)
            return Response(serializer.data)
        return Response(None)
    
    @action(detail=False, methods=['get'])
    def export_test_cases(self, request, project_id=None):
        """
        Export test cases to a file.
        """
        serializer = TestCaseExportSerializer(data=request.query_params)
        
        if serializer.is_valid():
            format_type = serializer.validated_data.get('format', 'xlsx')
            test_case_ids = serializer.validated_data.get('test_case_ids', [])
            
            # If no test_case_ids provided, export all for the project
            if not test_case_ids:
                test_cases = TestCase.objects.filter(project_id=project_id)
            else:
                test_cases = TestCase.objects.filter(
                    id__in=test_case_ids, 
                    project_id=project_id
                )
            
            # Export logic will be implemented
            # response = export_test_cases_to_file(test_cases, format_type)
            
            return Response({"message": "Export feature will be implemented"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TestRunViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing test runs.
    """
    serializer_class = TestRunSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'test_case']
    search_fields = ['error_message', 'test_case__title']
    ordering_fields = ['started_at', 'finished_at', 'status']
    ordering = ['-started_at']

    def get_queryset(self):
        """
        Filter test runs based on project.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        if project_id:
            return TestRun.objects.filter(
                test_case__project_id=project_id,
                test_case__project__members=user
            )
        else:
            # If no project_id, return all test runs user has access to
            return TestRun.objects.filter(
                test_case__project__members=user
            )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None, project_id=None):
        """
        Update the status of a test run.
        """
        test_run = self.get_object()
        status_value = request.data.get('status')
        error_message = request.data.get('error_message', '')
        output = request.data.get('output', '')
        
        if status_value not in ['pending', 'running', 'passed', 'failed', 'error', 'skipped']:
            return Response(
                {"error": "Invalid status value"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        test_run.status = status_value
        test_run.error_message = error_message
        test_run.output = output
        
        if status_value in ['passed', 'failed', 'error', 'skipped']:
            test_run.finished_at = timezone.now()
        
        test_run.save()
        
        # Create an event for the status update
        TestEvent.objects.create(
            test_case=test_run.test_case,
            event_type='finish' if status_value in ['passed', 'failed', 'error', 'skipped'] else 'info',
            description=f"Test run status changed to {status_value}",
            created_by=request.user
        )
        
        return Response(TestRunSerializer(test_run).data)


class TestReportViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for accessing test reports.
    """
    serializer_class = TestReportSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'execution_date']
    search_fields = ['test_case__title', 'comments']
    ordering_fields = ['execution_date']
    ordering = ['-execution_date']

    def get_queryset(self):
        """
        Filter test reports based on project.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        return TestReport.objects.filter(
            test_case__project_id=project_id,
            test_case__project__members=user
        )
    


class TestEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for accessing test events.
    """
    serializer_class = TestEventSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['test_case', 'event_type', 'timestamp']
    search_fields = ['description']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        """
        Filter test events based on project and test case.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        test_case_id = self.request.query_params.get('test_case_id')
        
        queryset = TestEvent.objects.filter(
            test_case__project_id=project_id,
            test_case__project__members=user
        )
        
        if test_case_id:
            queryset = queryset.filter(test_case_id=test_case_id)
            
        return queryset


class RegressionRunViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing regression runs.
    """
    serializer_class = RegressionRunSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'project']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'started_at', 'completed_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter regression runs based on project.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        return RegressionRun.objects.filter(
            project_id=project_id,
            project__members=user
        )
    
    def perform_create(self, serializer):
        """
        Create a new regression run.
        """
        project_id = self.kwargs.get('project_id')
        project = Project.objects.get(id=project_id)
        serializer.save(project=project, created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None, project_id=None):
        """
        Start a regression run.
        """
        regression_run = self.get_object()
        
        if regression_run.status != 'planned':
            return Response(
                {"error": "Regression run must be in 'planned' status to start"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        regression_run.status = 'in_progress'
        regression_run.started_at = timezone.now()
        regression_run.save()
        
        # Create pending test runs for all test cases in the regression
        for test_case in regression_run.test_cases.all():
            TestRun.objects.create(
                test_case=test_case,
                status='pending',
                run_type='manual',
                regression_run=regression_run,
                executor=request.user
            )
        
        return Response(RegressionRunSerializer(regression_run).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None, project_id=None):
        """
        Complete a regression run.
        """
        regression_run = self.get_object()
        
        if regression_run.status != 'in_progress':
            return Response(
                {"error": "Regression run must be in 'in_progress' status to complete"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        regression_run.status = 'completed'
        regression_run.completed_at = timezone.now()
        regression_run.save()
        
        return Response(RegressionRunSerializer(regression_run).data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None, project_id=None):
        """
        Cancel a regression run.
        """
        regression_run = self.get_object()
        
        if regression_run.status in ['completed', 'cancelled']:
            return Response(
                {"error": "Cannot cancel a completed or already cancelled regression run"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        regression_run.status = 'cancelled'
        regression_run.save()
        
        # Cancel all pending test runs
        regression_run.test_runs.filter(status='pending').update(status='skipped')
        
        return Response(RegressionRunSerializer(regression_run).data)
    
    @action(detail=True, methods=['get'])
    def test_runs(self, request, pk=None, project_id=None):
        """
        Get all test runs for a regression run.
        """
        regression_run = self.get_object()
        test_runs = regression_run.test_runs.all().order_by('test_case__title')
        
        return Response(TestRunSerializer(test_runs, many=True).data)
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None, project_id=None):
        """
        Get detailed progress information for a regression run.
        """
        regression_run = self.get_object()
        
        return Response({
            'progress_percentage': regression_run.get_progress(),
            'statistics': regression_run.get_statistics(),
            'status': regression_run.status,
            'started_at': regression_run.started_at,
            'completed_at': regression_run.completed_at
        })


class ManualTestRunViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing manual test runs.
    """
    serializer_class = ManualTestRunSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'test_case', 'regression_run']
    search_fields = ['error_message', 'test_case__title']
    ordering_fields = ['started_at', 'finished_at', 'status']
    ordering = ['-started_at']

    def get_queryset(self):
        """
        Filter manual test runs based on project.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        return TestRun.objects.filter(
            test_case__project_id=project_id,
            test_case__project__members=user,
            run_type='manual'
        )
    
    def perform_create(self, serializer):
        """
        Create a new manual test run.
        """
        serializer.save(executor=self.request.user, run_type='manual')
    
    @action(detail=True, methods=['post'])
    def update_result(self, request, pk=None, project_id=None):
        """
        Update the result of a manual test run.
        """
        test_run = self.get_object()
        status_value = request.data.get('status')
        error_message = request.data.get('error_message', '')
        output = request.data.get('output', '')
        
        if status_value not in ['passed', 'failed', 'error', 'skipped']:
            return Response(
                {"error": "Invalid status value for manual test result"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        test_run.status = status_value
        test_run.error_message = error_message
        test_run.output = output
        
        if not test_run.started_at:
            test_run.started_at = timezone.now()
        
        test_run.finished_at = timezone.now()
        test_run.save()
        
        # Create an event for the manual test result
        TestEvent.objects.create(
            test_case=test_run.test_case,
            event_type='finish',
            description=f"Manual test completed with status: {status_value}",
            created_by=request.user,
            details={
                'manual_run': True,
                'status': status_value,
                'error_message': error_message
            }
        )
        
        return Response(ManualTestRunSerializer(test_run).data)