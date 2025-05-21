from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Permission that checks if the user is an admin (superuser or admin role)
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or 
             (request.user.role and request.user.role.is_admin_role))
        )


class HasProjectPermission(permissions.BasePermission):
    """
    Permission that checks if the user has permissions for a specific project
    """
    def has_permission(self, request, view):
        user = request.user
        
        # If not authenticated, deny access
        if not user or not user.is_authenticated:
            return False
            
        # Superusers and admin roles have all permissions
        if user.is_superuser or (user.role and user.role.is_admin_role):
            return True
            
        # Get project ID from URL parameters
        project_id = view.kwargs.get('project_id')
        if not project_id:
            return False
            
        # Check if user is a member of the project
        return user.projects.filter(id=project_id).exists()


class HasUserManagementPermission(permissions.BasePermission):
    """
    Permission that checks if the user has user management permissions
    """
    def has_permission(self, request, view):
        user = request.user
        
        # If not authenticated, deny access
        if not user or not user.is_authenticated:
            return False
            
        # Superusers and admin roles have all permissions
        if user.is_superuser or (user.role and user.role.is_admin_role):
            return True
            
        # Check for specific permissions
        return user.has_permission('manage_users')


class HasProjectManagementPermission(permissions.BasePermission):
    """
    Permission that checks if the user has project management permissions
    """
    def has_permission(self, request, view):
        user = request.user
        
        # If not authenticated, deny access
        if not user or not user.is_authenticated:
            return False
            
        # Superusers and admin roles have all permissions
        if user.is_superuser or (user.role and user.role.is_admin_role):
            return True
            
        # Check for specific permissions
        return user.has_permission('manage_projects')
        

class HasTestManagementPermission(permissions.BasePermission):
    """
    Permission that checks if the user has test management permissions
    """
    def has_permission(self, request, view):
        user = request.user
        
        # If not authenticated, deny access
        if not user or not user.is_authenticated:
            return False
            
        # Superusers and admin roles have all permissions
        if user.is_superuser or (user.role and user.role.is_admin_role):
            return True
            
        # Check for specific permissions
        return user.has_permission('manage_tests')


class HasReportManagementPermission(permissions.BasePermission):
    """
    Permission that checks if the user has report management permissions
    """
    def has_permission(self, request, view):
        user = request.user
        
        # If not authenticated, deny access
        if not user or not user.is_authenticated:
            return False
            
        # Superusers and admin roles have all permissions
        if user.is_superuser or (user.role and user.role.is_admin_role):
            return True
            
        # Check for specific permissions
        return user.has_permission('manage_reports')


class HasAutomationManagementPermission(permissions.BasePermission):
    """
    Permission that checks if the user has automation management permissions
    """
    def has_permission(self, request, view):
        user = request.user
        
        # If not authenticated, deny access
        if not user or not user.is_authenticated:
            return False
            
        # Superusers and admin roles have all permissions
        if user.is_superuser or (user.role and user.role.is_admin_role):
            return True
            
        # Check for specific permissions
        return user.has_permission('manage_automation')


class IsSelf(permissions.BasePermission):
    """
    Permission that only allows users to modify their own resources
    """
    def has_object_permission(self, request, view, obj):
        # Check if the object has a user attribute
        if hasattr(obj, 'id') and hasattr(request.user, 'id'):
            return obj.id == request.user.id
        return False


class IsProjectMember(permissions.BasePermission):
    """
    Permission that only allows members of a project to access its resources
    """
    def has_object_permission(self, request, view, obj):
        # Check if the object has a project attribute
        project = None
        
        if hasattr(obj, 'project'):
            project = obj.project
        elif hasattr(obj, 'get_project'):
            project = obj.get_project()
            
        if project:
            return (request.user.is_superuser or 
                  (hasattr(project, 'members') and project.members.filter(id=request.user.id).exists()))
        
        return False