from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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
    permission_classes = [IsAuthenticated, HasProjectPermission]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['repository_type', 'sync_status']
    search_fields = ['name', 'repository_url']
    ordering_fields = ['name', 'created_at', 'updated_at', 'last_sync']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter automation projects based on related project.
        """
        user = self.request.user
        project_id = self.kwargs.get('project_id')
        
        return AutomationProject.objects.filter(
            project_id=project_id,
            project__members=user
        )
    
    def perform_create(self, serializer):
        """
        Create a new automation project and associate with the project.
        """
        project_id = self.kwargs.get('project_id')
        project = Project.objects.get(id=project_id)
        serializer.save(project=project, created_by=self.request.user)
    
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
            
            # This would be implemented with Celery
            # sync_task = sync_repository.delay(automation_project.id, force)
            
            # For now, simulate success
            automation_project.sync_status = 'synced'
            automation_project.last_sync = timezone.now()
            automation_project.save()
            
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
        
        # This would be implemented with Celery
        # execute_task = execute_automation_test.delay(execution.id)
        
        # For now, simulate in-progress
        execution.status = 'in_progress'
        execution.start_time = timezone.now()
        execution.save()
        
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
                    
                    # This would be implemented with Celery
                    # execute_task = execute_automation_test.delay(execution.id)
                    
                    # For now, simulate in-progress
                    execution.status = 'in_progress'
                    execution.start_time = timezone.now()
                    execution.save()
                    
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