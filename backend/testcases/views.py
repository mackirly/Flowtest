from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

from core.permissions import HasProjectPermission, IsProjectMember
from core.utils.pagination import StandardResultsSetPagination
from projects.models import Project, Folder
from .models import TestCase, TestRun, TestReport, TestEvent
from .serializers import (
    TestCaseSerializer, 
    AutomatedTestCaseSerializer,
    TestRunSerializer, 
    TestReportSerializer, 
    TestEventSerializer,
    ExecuteTestSerializer,
    BatchExecuteTestsSerializer,
    TestCaseImportSerializer,
    TestCaseExportSerializer
)


class TestCaseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing test cases.
    """
    serializer_class = TestCaseSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'type', 'folder']
    search_fields = ['title', 'description', 'tags__name']
    ordering_fields = ['created_at', 'updated_at', 'title', 'priority', 'status']
    ordering = ['-updated_at']

    def get_queryset(self):
        """
        Filter test cases based on project and folder if provided.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        folder_id = self.request.query_params.get('folder_id')
        
        queryset = TestCase.objects.filter(project_id=project_id)
        
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)
            
        return queryset.filter(project__members=user)
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on the test case type.
        """
        if self.action == 'list' or self.action == 'retrieve':
            instance = self.get_object() if self.action == 'retrieve' else None
            if instance and instance.is_automated:
                return AutomatedTestCaseSerializer
        return TestCaseSerializer
    
    def perform_create(self, serializer):
        """
        Create a new test case and associate with the project.
        """
        project_id = self.kwargs.get('project_id')
        project = Project.objects.get(id=project_id)
        serializer.save(project=project, created_by=self.request.user)
    
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
                executed_by=request.user,
                environment=serializer.validated_data.get('environment', 'Default'),
                status='in_progress'
            )
            
            # If automated, trigger the automation process (will be implemented with Celery)
            if test_case.is_automated:
                # Launch test execution task
                # celery_task = execute_test_case.delay(test_run.id)
                # test_run.task_id = celery_task.id
                # test_run.save()
                pass
            
            return Response(TestRunSerializer(test_run).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
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
            preconditions=test_case.preconditions,
            steps=test_case.steps,
            expected_results=test_case.expected_results,
            status=test_case.status,
            priority=test_case.priority,
            type=test_case.type,
            project=test_case.project,
            folder_id=folder_id if folder_id else test_case.folder_id,
            created_by=request.user,
            is_automated=test_case.is_automated,
            automation_script=test_case.automation_script
        )
        
        # Copy tags
        new_test_case.tags.set(test_case.tags.all())
        
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
                        executed_by=request.user,
                        environment=environment,
                        status='in_progress'
                    )
                    test_runs.append(test_run)
                    
                    # If automated, trigger the automation process
                    if test_case.is_automated:
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
    filterset_fields = ['status', 'environment', 'test_case']
    search_fields = ['notes', 'test_case__title']
    ordering_fields = ['executed_at', 'completed_at', 'status']
    ordering = ['-executed_at']

    def get_queryset(self):
        """
        Filter test runs based on project.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        return TestRun.objects.filter(
            test_case__project_id=project_id,
            test_case__project__members=user
        )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None, project_id=None):
        """
        Update the status of a test run.
        """
        test_run = self.get_object()
        status_value = request.data.get('status')
        notes = request.data.get('notes', '')
        
        if status_value not in ['in_progress', 'passed', 'failed', 'blocked', 'skipped']:
            return Response(
                {"error": "Invalid status value"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        test_run.status = status_value
        test_run.notes = notes
        
        if status_value in ['passed', 'failed', 'blocked', 'skipped']:
            test_run.completed_at = timezone.now()
        
        test_run.save()
        
        # Create an event for the status update
        TestEvent.objects.create(
            test_run=test_run,
            event_type='status_change',
            description=f"Status changed to {status_value}",
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
    filterset_fields = ['created_at', 'report_type']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter test reports based on project.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        return TestReport.objects.filter(
            project_id=project_id,
            project__members=user
        )
    
    @action(detail=False, methods=['post'])
    def generate_report(self, request, project_id=None):
        """
        Generate a new test report.
        """
        title = request.data.get('title', f"Test Report {timezone.now().strftime('%Y-%m-%d %H:%M')}")
        description = request.data.get('description', '')
        report_type = request.data.get('report_type', 'summary')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        test_runs = request.data.get('test_runs', [])
        
        project = Project.objects.get(id=project_id)
        
        # Create the report
        report = TestReport.objects.create(
            title=title,
            description=description,
            report_type=report_type,
            project=project,
            created_by=request.user
        )
        
        # If test_runs are specified, use those specific runs
        if test_runs:
            runs = TestRun.objects.filter(
                id__in=test_runs,
                test_case__project_id=project_id
            )
        # Otherwise, use date range
        else:
            query = Q(test_case__project_id=project_id)
            
            if start_date:
                query &= Q(executed_at__gte=start_date)
            if end_date:
                query &= Q(executed_at__lte=end_date)
                
            runs = TestRun.objects.filter(query)
        
        # Associate test runs with the report
        report.test_runs.set(runs)
        
        # Generate report data (will be implemented)
        # generate_report_data(report.id)
        
        return Response(TestReportSerializer(report).data, status=status.HTTP_201_CREATED)


class TestEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for accessing test events.
    """
    serializer_class = TestEventSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['test_run', 'event_type', 'created_at']
    search_fields = ['description']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter test events based on project and test run.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        test_run_id = self.request.query_params.get('test_run_id')
        
        queryset = TestEvent.objects.filter(
            test_run__test_case__project_id=project_id,
            test_run__test_case__project__members=user
        )
        
        if test_run_id:
            queryset = queryset.filter(test_run_id=test_run_id)
            
        return queryset


# Fix missing imports
from django.utils import timezone
from django.db.models import Q