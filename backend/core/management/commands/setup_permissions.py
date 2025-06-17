from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import Permission, Role


class Command(BaseCommand):
    help = 'Creates default permissions and roles'

    def handle(self, *args, **options):
        self.stdout.write('Setting up default permissions and roles...')
        
        with transaction.atomic():
            # Create default permissions
            permissions_data = [
                # User Management
                {'name': 'View Users', 'codename': 'view_users', 'category': 'user_management', 
                 'description': 'Can view user list and details'},
                {'name': 'Create Users', 'codename': 'create_users', 'category': 'user_management',
                 'description': 'Can create new users'},
                {'name': 'Edit Users', 'codename': 'edit_users', 'category': 'user_management',
                 'description': 'Can edit user information'},
                {'name': 'Delete Users', 'codename': 'delete_users', 'category': 'user_management',
                 'description': 'Can delete users'},
                {'name': 'Manage Roles', 'codename': 'manage_roles', 'category': 'user_management',
                 'description': 'Can create, edit and delete roles'},
                {'name': 'Assign Roles', 'codename': 'assign_roles', 'category': 'user_management',
                 'description': 'Can assign roles to users'},
                
                # Project Management
                {'name': 'View Projects', 'codename': 'view_projects', 'category': 'project_management',
                 'description': 'Can view project list and details'},
                {'name': 'Create Projects', 'codename': 'create_projects', 'category': 'project_management',
                 'description': 'Can create new projects'},
                {'name': 'Edit Projects', 'codename': 'edit_projects', 'category': 'project_management',
                 'description': 'Can edit project information'},
                {'name': 'Delete Projects', 'codename': 'delete_projects', 'category': 'project_management',
                 'description': 'Can delete projects'},
                {'name': 'Manage Project Members', 'codename': 'manage_project_members', 'category': 'project_management',
                 'description': 'Can add or remove project members'},
                
                # Test Management
                {'name': 'View Test Cases', 'codename': 'view_testcases', 'category': 'test_management',
                 'description': 'Can view test cases'},
                {'name': 'Create Test Cases', 'codename': 'create_testcases', 'category': 'test_management',
                 'description': 'Can create new test cases'},
                {'name': 'Edit Test Cases', 'codename': 'edit_testcases', 'category': 'test_management',
                 'description': 'Can edit test cases'},
                {'name': 'Delete Test Cases', 'codename': 'delete_testcases', 'category': 'test_management',
                 'description': 'Can delete test cases'},
                {'name': 'Execute Tests', 'codename': 'execute_tests', 'category': 'test_management',
                 'description': 'Can execute test cases'},
                {'name': 'View Test Results', 'codename': 'view_test_results', 'category': 'test_management',
                 'description': 'Can view test execution results'},
                
                # Report Management
                {'name': 'View Reports', 'codename': 'view_reports', 'category': 'report_management',
                 'description': 'Can view reports'},
                {'name': 'Create Reports', 'codename': 'create_reports', 'category': 'report_management',
                 'description': 'Can create new reports'},
                {'name': 'Edit Reports', 'codename': 'edit_reports', 'category': 'report_management',
                 'description': 'Can edit reports'},
                {'name': 'Delete Reports', 'codename': 'delete_reports', 'category': 'report_management',
                 'description': 'Can delete reports'},
                {'name': 'Export Reports', 'codename': 'export_reports', 'category': 'report_management',
                 'description': 'Can export reports in various formats'},
                
                # Event Management
                {'name': 'View Events', 'codename': 'view_events', 'category': 'event_management',
                 'description': 'Can view events and activities'},
                {'name': 'Create Events', 'codename': 'create_events', 'category': 'event_management',
                 'description': 'Can create new events'},
                {'name': 'Edit Events', 'codename': 'edit_events', 'category': 'event_management',
                 'description': 'Can edit events'},
                {'name': 'Delete Events', 'codename': 'delete_events', 'category': 'event_management',
                 'description': 'Can delete events'},
                
                # Automation Management
                {'name': 'View Automation', 'codename': 'view_automation', 'category': 'automation_management',
                 'description': 'Can view automation settings and scripts'},
                {'name': 'Configure Automation', 'codename': 'configure_automation', 'category': 'automation_management',
                 'description': 'Can configure automation settings'},
                {'name': 'Execute Automation', 'codename': 'execute_automation', 'category': 'automation_management',
                 'description': 'Can execute automated tests'},
                {'name': 'Manage Repositories', 'codename': 'manage_repositories', 'category': 'automation_management',
                 'description': 'Can connect and manage test repositories'},
            ]
            
            # Create permissions
            created_permissions = 0
            for perm_data in permissions_data:
                permission, created = Permission.objects.get_or_create(
                    codename=perm_data['codename'],
                    defaults={
                        'name': perm_data['name'],
                        'description': perm_data['description'],
                        'category': perm_data['category']
                    }
                )
                if created:
                    created_permissions += 1
                    self.stdout.write(f'Created permission: {permission.name}')
            
            self.stdout.write(self.style.SUCCESS(f'Created {created_permissions} new permissions'))
            
            # Create default roles
            roles_data = {
                'Admin': {
                    'description': 'Full system access with all permissions',
                    'is_admin_role': True,
                    'is_system': True,
                    'permissions': []  # Admin role has all permissions implicitly
                },
                'Manager': {
                    'description': 'Can manage projects, users and view all data',
                    'is_admin_role': False,
                    'is_system': True,
                    'permissions': [
                        'view_users', 'create_users', 'edit_users', 'assign_roles',
                        'view_projects', 'create_projects', 'edit_projects', 'manage_project_members',
                        'view_testcases', 'create_testcases', 'edit_testcases',
                        'execute_tests', 'view_test_results',
                        'view_reports', 'create_reports', 'export_reports',
                        'view_events', 'create_events',
                        'view_automation'
                    ]
                },
                'Tester': {
                    'description': 'Can create and execute tests, view reports',
                    'is_admin_role': False,
                    'permissions': [
                        'view_projects',
                        'view_testcases', 'create_testcases', 'edit_testcases',
                        'execute_tests', 'view_test_results',
                        'view_reports', 'create_reports',
                        'view_events',
                        'view_automation', 'execute_automation'
                    ]
                },
                'Viewer': {
                    'description': 'Read-only access to all data',
                    'is_admin_role': False,
                    'permissions': [
                        'view_users',
                        'view_projects',
                        'view_testcases',
                        'view_test_results',
                        'view_reports',
                        'view_events',
                        'view_automation'
                    ]
                }
            }
            
            # Create roles
            created_roles = 0
            for role_name, role_data in roles_data.items():
                role, created = Role.objects.get_or_create(
                    name=role_name,
                    defaults={
                        'description': role_data['description'],
                        'is_admin_role': role_data['is_admin_role']
                    }
                )
                
                if created or not role.permissions.exists():
                    # Add permissions to role
                    for perm_codename in role_data['permissions']:
                        try:
                            permission = Permission.objects.get(codename=perm_codename)
                            role.permissions.add(permission)
                        except Permission.DoesNotExist:
                            self.stdout.write(
                                self.style.WARNING(f'Permission {perm_codename} not found for role {role_name}')
                            )
                    
                    if created:
                        created_roles += 1
                        self.stdout.write(f'Created role: {role_name}')
                    else:
                        self.stdout.write(f'Updated role permissions: {role_name}')
            
            self.stdout.write(self.style.SUCCESS(f'Created {created_roles} new roles'))
            self.stdout.write(self.style.SUCCESS('Default permissions and roles setup completed!'))