from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from .models import Project, Folder
from .serializers import (
    ProjectSerializer,
    ProjectDetailSerializer,
    FolderSerializer,
    FolderDetailSerializer,
    ProjectMemberSerializer,
    ProjectStatsSerializer
)
from core.permissions import (
    HasProjectManagementPermission,
    IsProjectMember
)


@extend_schema_view(
    list=extend_schema(
        description="List all projects",
        parameters=[
            OpenApiParameter(name="search", type=str, description="Search projects by name or description"),
            OpenApiParameter(name="status", type=str, description="Filter projects by status (active, archived)"),
            OpenApiParameter(name="member", type=int, description="Filter projects by member ID")
        ]
    ),
    retrieve=extend_schema(description="Get a specific project by ID"),
    create=extend_schema(description="Create a new project"),
    update=extend_schema(description="Update a project"),
    partial_update=extend_schema(description="Partially update a project"),
    destroy=extend_schema(description="Delete a project"),
)
class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for handling project operations"""
    serializer_class = ProjectSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role and permissions"""
        user = self.request.user
        
        # Admin users can see all projects
        if user.is_superuser or (user.role and user.role.is_admin_role):
            queryset = Project.objects.all()
        # Users with project management permission can see all projects
        elif user.has_permission('manage_projects'):
            queryset = Project.objects.all()
        # Regular users can only see projects they are members of
        else:
            queryset = user.projects.all()
        
        # Apply filters
        search = self.request.query_params.get('search', None)
        status_filter = self.request.query_params.get('status', None)
        member_id = self.request.query_params.get('member', None)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        if member_id:
            queryset = queryset.filter(members__id=member_id)
            
        return queryset.order_by('name')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, HasProjectManagementPermission]
        elif self.action in ['retrieve', 'list']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
            
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        """Create a new project and add the creator as a member"""
        project = serializer.save()
        # Add the creator as a member
        project.members.add(self.request.user)
    
    @extend_schema(
        description="Add members to a project",
        request=ProjectMemberSerializer,
        responses={200: {"type": "object", "properties": {"message": {"type": "string"}}}}
    )
    @action(detail=True, methods=['post'], url_path='add-members')
    def add_members(self, request, pk=None):
        """Add members to a project"""
        project = self.get_object()
        serializer = ProjectMemberSerializer(data=request.data)
        
        if serializer.is_valid():
            user_ids = serializer.validated_data['user_ids']
            users = User.objects.filter(id__in=user_ids)
            
            # Add users to project
            for user in users:
                project.members.add(user)
            
            return Response({
                'message': f'Added {len(users)} members to the project.'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        description="Remove members from a project",
        request=ProjectMemberSerializer,
        responses={200: {"type": "object", "properties": {"message": {"type": "string"}}}}
    )
    @action(detail=True, methods=['post'], url_path='remove-members')
    def remove_members(self, request, pk=None):
        """Remove members from a project"""
        project = self.get_object()
        serializer = ProjectMemberSerializer(data=request.data)
        
        if serializer.is_valid():
            user_ids = serializer.validated_data['user_ids']
            users = User.objects.filter(id__in=user_ids)
            
            # Remove users from project
            for user in users:
                project.members.remove(user)
            
            return Response({
                'message': f'Removed {len(users)} members from the project.'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        description="Archive a project",
        responses={200: {"type": "object", "properties": {"message": {"type": "string"}}}}
    )
    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        """Archive a project"""
        project = self.get_object()
        project.status = 'archived'
        project.save()
        
        return Response({
            'message': f'Project "{project.name}" has been archived.'
        })
    
    @extend_schema(
        description="Restore an archived project",
        responses={200: {"type": "object", "properties": {"message": {"type": "string"}}}}
    )
    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """Restore an archived project"""
        project = self.get_object()
        project.status = 'active'
        project.save()
        
        return Response({
            'message': f'Project "{project.name}" has been restored.'
        })


@extend_schema_view(
    list=extend_schema(
        description="List all folders in a project",
        parameters=[
            OpenApiParameter(name="search", type=str, description="Search folders by name or description"),
            OpenApiParameter(name="parent", type=int, description="Filter folders by parent folder ID"),
            OpenApiParameter(name="root_only", type=bool, description="Filter only root folders (no parent)")
        ]
    ),
    retrieve=extend_schema(description="Get a specific folder by ID"),
    create=extend_schema(description="Create a new folder"),
    update=extend_schema(description="Update a folder"),
    partial_update=extend_schema(description="Partially update a folder"),
    destroy=extend_schema(description="Delete a folder"),
)
class FolderViewSet(viewsets.ModelViewSet):
    """ViewSet for handling folder operations within a project"""
    serializer_class = FolderSerializer
    
    def get_queryset(self):
        """Filter queryset to folders in the specified project"""
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        
        # Check if user has access to this project
        user = self.request.user
        if not (user.is_superuser or (user.role and user.role.is_admin_role) or 
                user.has_permission('manage_projects') or project.members.filter(id=user.id).exists()):
            return Folder.objects.none()
            
        queryset = project.folders.all()
        
        # Apply filters
        search = self.request.query_params.get('search', None)
        parent_id = self.request.query_params.get('parent', None)
        root_only = self.request.query_params.get('root_only', None)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        if parent_id:
            queryset = queryset.filter(parent_folder_id=parent_id)
        
        if root_only and root_only.lower() == 'true':
            queryset = queryset.filter(parent_folder__isnull=True)
            
        return queryset.order_by('name')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'retrieve':
            return FolderDetailSerializer
        return FolderSerializer
    
    def perform_create(self, serializer):
        """Create a new folder"""
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, id=project_id)
        
        # Set project and author
        serializer.save(project=project)
    
    @extend_schema(
        description="Move folder to another parent",
        request={"type": "object", "properties": {"parent_id": {"type": "integer", "nullable": True}}},
        responses={200: FolderSerializer}
    )
    @action(detail=True, methods=['post'], url_path='move')
    def move(self, request, project_id=None, pk=None):
        """Move folder to another parent"""
        folder = self.get_object()
        parent_id = request.data.get('parent_id')
        
        # If parent_id is None, move to root level
        if parent_id is None:
            folder.parent_folder = None
        else:
            parent_folder = get_object_or_404(Folder, id=parent_id)
            
            # Check that parent folder is in the same project
            if parent_folder.project_id != int(project_id):
                return Response(
                    {'error': 'Parent folder must be in the same project'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Check for circular reference
            current = parent_folder
            while current is not None:
                if current.id == folder.id:
                    return Response(
                        {'error': 'Cannot move a folder to its own descendant'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                current = current.parent_folder
                
            folder.parent_folder = parent_folder
            
        folder.save()
        serializer = self.get_serializer(folder)
        return Response(serializer.data)


class ProjectStatsView(APIView):
    """View for project statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        description="Get project statistics",
        responses={200: ProjectStatsSerializer}
    )
    def get(self, request, project_id):
        """Get statistics for a project"""
        project = get_object_or_404(Project, id=project_id)
        
        # Check if user has access to this project
        user = request.user
        if not (user.is_superuser or (user.role and user.role.is_admin_role) or 
                user.has_permission('manage_projects') or project.members.filter(id=user.id).exists()):
            return Response(
                {'error': 'You do not have access to this project'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get statistics
        total_test_cases = project.test_cases.count()
        automated_test_cases = project.test_cases.filter(test_type='automated').count()
        manual_test_cases = project.test_cases.filter(test_type='manual').count()
        
        # Count passed and failed tests from most recent test runs
        from testcases.models import TestRun
        passed_tests = 0
        failed_tests = 0
        
        # Get the latest test run for each test case
        test_case_ids = project.test_cases.values_list('id', flat=True)
        latest_runs = {}
        
        for run in TestRun.objects.filter(test_case_id__in=test_case_ids).order_by('test_case_id', '-started_at'):
            if run.test_case_id not in latest_runs:
                latest_runs[run.test_case_id] = run
                
                if run.status == 'passed':
                    passed_tests += 1
                elif run.status in ['failed', 'error']:
                    failed_tests += 1
        
        # Other statistics
        folders_count = project.folders.count()
        members_count = project.members.count()
        test_execution_count = TestRun.objects.filter(test_case__project=project).count()
        
        # Recent activity
        recent_activity = []
        
        # Add recent test runs
        recent_runs = TestRun.objects.filter(
            test_case__project=project
        ).order_by('-started_at')[:5]
        
        for run in recent_runs:
            activity = {
                'type': 'test_run',
                'id': run.id,
                'test_case_id': run.test_case_id,
                'test_case_title': run.test_case.title,
                'status': run.status,
                'timestamp': run.started_at,
                'user': run.executor.get_full_name() if run.executor else None
            }
            recent_activity.append(activity)
            
        # Add recent folder creations
        recent_folders = project.folders.order_by('-created_at')[:3]
        
        for folder in recent_folders:
            activity = {
                'type': 'folder_created',
                'id': folder.id,
                'name': folder.name,
                'timestamp': folder.created_at,
                'user': folder.author.get_full_name() if folder.author else None
            }
            recent_activity.append(activity)
            
        # Add recent test case creations
        recent_test_cases = project.test_cases.order_by('-created_at')[:3]
        
        for test_case in recent_test_cases:
            activity = {
                'type': 'test_case_created',
                'id': test_case.id,
                'title': test_case.title,
                'timestamp': test_case.created_at,
                'user': test_case.author.get_full_name() if test_case.author else None
            }
            recent_activity.append(activity)
            
        # Sort by timestamp
        recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_activity = recent_activity[:10]  # Limit to 10 activities
        
        stats = {
            'total_test_cases': total_test_cases,
            'automated_test_cases': automated_test_cases,
            'manual_test_cases': manual_test_cases,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'folders_count': folders_count,
            'members_count': members_count,
            'test_execution_count': test_execution_count,
            'recent_activity': recent_activity
        }
        
        serializer = ProjectStatsSerializer(stats)
        return Response(serializer.data)


class ProjectMembersView(APIView):
    """View for project members"""
    permission_classes = [permissions.IsAuthenticated, HasProjectManagementPermission]
    
    @extend_schema(
        description="Get project members",
        responses={200: {"type": "array", "items": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "username": {"type": "string"},
                "email": {"type": "string"},
                "name": {"type": "string"}
            }
        }}}
    )
    def get(self, request, project_id):
        """Get members of a project"""
        project = get_object_or_404(Project, id=project_id)
        
        # Get members
        members = project.members.all()
        
        # Serialize members
        data = [{
            'id': member.id,
            'username': member.username,
            'email': member.email,
            'name': member.get_full_name()
        } for member in members]
        
        return Response(data)
    
    @extend_schema(
        description="Update project members",
        request={"type": "object", "properties": {
            "add": {"type": "array", "items": {"type": "integer"}},
            "remove": {"type": "array", "items": {"type": "integer"}}
        }},
        responses={200: {"type": "object", "properties": {"message": {"type": "string"}}}}
    )
    def post(self, request, project_id):
        """Update project members"""
        project = get_object_or_404(Project, id=project_id)
        
        # Get user IDs to add and remove
        add_ids = request.data.get('add', [])
        remove_ids = request.data.get('remove', [])
        
        # Add users
        added_count = 0
        if add_ids:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            users_to_add = User.objects.filter(id__in=add_ids)
            for user in users_to_add:
                project.members.add(user)
            added_count = users_to_add.count()
            
        # Remove users
        removed_count = 0
        if remove_ids:
            users_to_remove = project.members.filter(id__in=remove_ids)
            for user in users_to_remove:
                project.members.remove(user)
            removed_count = users_to_remove.count()
            
        return Response({
            'message': f'Added {added_count} and removed {removed_count} members from the project.'
        })