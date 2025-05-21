from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Role, Permission

User = get_user_model()


@receiver(post_save, sender=User)
def assign_default_role(sender, instance, created, **kwargs):
    """Assign default role to new users if they don't have one"""
    if created and not instance.role:
        # Try to find a default user role
        default_role = Role.objects.filter(name='User').first()
        
        # If a default role exists, assign it
        if default_role:
            instance.role = default_role
            instance.save(update_fields=['role'])


@receiver(post_migrate)
def create_default_permissions(sender, **kwargs):
    """Create default permissions after migration"""
    
    # Only run for core app
    if sender.name != 'core':
        return
        
    # Define default permissions
    default_permissions = [
        # User management permissions
        {
            'name': 'Manage Users',
            'codename': 'manage_users',
            'description': 'Can create, update, and delete users',
            'category': 'user_management'
        },
        {
            'name': 'View Users',
            'codename': 'view_users',
            'description': 'Can view users',
            'category': 'user_management'
        },
        {
            'name': 'Manage Roles',
            'codename': 'manage_roles',
            'description': 'Can create, update, and delete roles',
            'category': 'user_management'
        },
        
        # Project management permissions
        {
            'name': 'Manage Projects',
            'codename': 'manage_projects',
            'description': 'Can create, update, and delete projects',
            'category': 'project_management'
        },
        {
            'name': 'View Projects',
            'codename': 'view_projects',
            'description': 'Can view projects',
            'category': 'project_management'
        },
        {
            'name': 'Manage Project Members',
            'codename': 'manage_project_members',
            'description': 'Can add and remove project members',
            'category': 'project_management'
        },
        
        # Test management permissions
        {
            'name': 'Manage Tests',
            'codename': 'manage_tests',
            'description': 'Can create, update, and delete test cases',
            'category': 'test_management'
        },
        {
            'name': 'View Tests',
            'codename': 'view_tests',
            'description': 'Can view test cases',
            'category': 'test_management'
        },
        {
            'name': 'Execute Tests',
            'codename': 'execute_tests',
            'description': 'Can execute test cases',
            'category': 'test_management'
        },
        {
            'name': 'Manage Folders',
            'codename': 'manage_folders',
            'description': 'Can create, update, and delete folders',
            'category': 'test_management'
        },
        
        # Report management permissions
        {
            'name': 'Manage Reports',
            'codename': 'manage_reports',
            'description': 'Can create, update, and delete reports',
            'category': 'report_management'
        },
        {
            'name': 'View Reports',
            'codename': 'view_reports',
            'description': 'Can view reports',
            'category': 'report_management'
        },
        {
            'name': 'Generate Reports',
            'codename': 'generate_reports',
            'description': 'Can generate reports',
            'category': 'report_management'
        },
        
        # Automation management permissions
        {
            'name': 'Manage Automation',
            'codename': 'manage_automation',
            'description': 'Can create, update, and delete automation projects',
            'category': 'automation_management'
        },
        {
            'name': 'View Automation',
            'codename': 'view_automation',
            'description': 'Can view automation projects',
            'category': 'automation_management'
        },
        {
            'name': 'Execute Automation',
            'codename': 'execute_automation',
            'description': 'Can execute automation tests',
            'category': 'automation_management'
        },
    ]
    
    # Create permissions if they don't exist
    for perm_data in default_permissions:
        Permission.objects.get_or_create(
            codename=perm_data['codename'],
            defaults={
                'name': perm_data['name'],
                'description': perm_data['description'],
                'category': perm_data['category']
            }
        )
    
    # Create default roles if they don't exist
    admin_role, created = Role.objects.get_or_create(
        name='Administrator',
        defaults={
            'description': 'Administrator role with full access',
            'is_admin_role': True
        }
    )
    
    user_role, created = Role.objects.get_or_create(
        name='User',
        defaults={
            'description': 'Regular user with basic permissions',
            'is_admin_role': False
        }
    )
    
    # If user role was just created, assign basic permissions
    if created:
        basic_permissions = Permission.objects.filter(
            codename__in=[
                'view_users',
                'view_projects',
                'view_tests',
                'execute_tests',
                'view_reports',
                'view_automation',
            ]
        )
        user_role.permissions.set(basic_permissions)
    
    # Ensure the admin role has all permissions
    if admin_role.is_admin_role:
        all_permissions = Permission.objects.all()
        admin_role.permissions.set(all_permissions)