import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/mnt/d/Flowtest 2.0/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowtest.settings')
django.setup()

from core.models import Permission, Role

# Create basic permissions first
basic_permissions = [
    ('can_view_users', 'Can view users', 'users'),
    ('can_manage_users', 'Can manage users', 'users'),
    ('can_view_projects', 'Can view projects', 'projects'),
    ('can_manage_projects', 'Can manage projects', 'projects'),
    ('can_view_testcases', 'Can view test cases', 'testcases'),
    ('can_manage_testcases', 'Can manage test cases', 'testcases'),
    ('can_view_reports', 'Can view reports', 'reports'),
    ('can_manage_reports', 'Can manage reports', 'reports'),
]

print("Creating basic permissions...")
created_permissions = []
for codename, name, category in basic_permissions:
    permission, created = Permission.objects.get_or_create(
        codename=codename,
        defaults={
            'name': name,
            'category': category,
            'description': name
        }
    )
    created_permissions.append(permission)
    status = "CREATED" if created else "EXISTS"
    print(f"  {status}: {name}")

# Create basic roles
print("\nCreating basic roles...")

# Admin role - all permissions
admin_role, created = Role.objects.get_or_create(
    name='Admin',
    defaults={
        'description': 'Full system administrator with all permissions',
        'is_admin_role': True,
        'is_system': True
    }
)
if created:
    admin_role.permissions.set(created_permissions)
    print(f"  CREATED: Admin role with {admin_role.permissions.count()} permissions")
else:
    print(f"  EXISTS: Admin role with {admin_role.permissions.count()} permissions")

# Manager role - user and project management
manager_role, created = Role.objects.get_or_create(
    name='Manager',
    defaults={
        'description': 'Can manage users and projects',
        'is_admin_role': False,
        'is_system': True
    }
)
if created:
    manager_perms = Permission.objects.filter(codename__in=[
        'can_view_users', 'can_manage_users', 
        'can_view_projects', 'can_manage_projects',
        'can_view_testcases', 'can_view_reports'
    ])
    manager_role.permissions.set(manager_perms)
    print(f"  CREATED: Manager role with {manager_role.permissions.count()} permissions")
else:
    print(f"  EXISTS: Manager role with {manager_role.permissions.count()} permissions")

# Tester role - can work with test cases
tester_role, created = Role.objects.get_or_create(
    name='Tester',
    defaults={
        'description': 'Can create and manage test cases',
        'is_admin_role': False,
        'is_system': True
    }
)
if created:
    tester_perms = Permission.objects.filter(codename__in=[
        'can_view_users', 'can_view_projects', 
        'can_view_testcases', 'can_manage_testcases',
        'can_view_reports'
    ])
    tester_role.permissions.set(tester_perms)
    print(f"  CREATED: Tester role with {tester_role.permissions.count()} permissions")
else:
    print(f"  EXISTS: Tester role with {tester_role.permissions.count()} permissions")

# Viewer role - read-only access
viewer_role, created = Role.objects.get_or_create(
    name='Viewer',
    defaults={
        'description': 'Read-only access to system',
        'is_admin_role': False,
        'is_system': True
    }
)
if created:
    viewer_perms = Permission.objects.filter(codename__in=[
        'can_view_users', 'can_view_projects', 
        'can_view_testcases', 'can_view_reports'
    ])
    viewer_role.permissions.set(viewer_perms)
    print(f"  CREATED: Viewer role with {viewer_role.permissions.count()} permissions")
else:
    print(f"  EXISTS: Viewer role with {viewer_role.permissions.count()} permissions")

print(f"\nFinal summary:")
print(f"Total permissions: {Permission.objects.count()}")
print(f"Total roles: {Role.objects.count()}")
print(f"System roles: {Role.objects.filter(is_system=True).count()}")

# List all roles
print("\nAll roles:")
for role in Role.objects.all():
    print(f"  - {role.name}: {role.permissions.count()} permissions (System: {role.is_system})")