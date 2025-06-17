#!/bin/bash
cd "/mnt/d/Flowtest 2.0/backend"

echo "Creating roles through Django shell..."
python manage.py shell << 'EOF'
from core.models import Permission, Role

# Clean up existing data
print("Cleaning up existing data...")
Permission.objects.all().delete()
Role.objects.all().delete()

# Create permissions
print("Creating permissions...")
permissions_data = [
    ('can_view_users', 'Can view users', 'users'),
    ('can_manage_users', 'Can manage users', 'users'),
    ('can_view_projects', 'Can view projects', 'projects'), 
    ('can_manage_projects', 'Can manage projects', 'projects'),
    ('can_view_testcases', 'Can view test cases', 'testcases'),
    ('can_manage_testcases', 'Can manage test cases', 'testcases'),
    ('can_view_reports', 'Can view reports', 'reports'),
    ('can_manage_reports', 'Can manage reports', 'reports'),
]

created_permissions = []
for codename, name, category in permissions_data:
    permission = Permission.objects.create(
        codename=codename,
        name=name,
        category=category,
        description=name
    )
    created_permissions.append(permission)
    print(f"Created permission: {name}")

# Create roles
print("Creating roles...")

# Admin role
admin_role = Role.objects.create(
    name='Admin',
    description='Full system administrator',
    is_admin_role=True,
    is_system=True
)
admin_role.permissions.set(created_permissions)
print(f"Created Admin role with {admin_role.permissions.count()} permissions")

# Manager role
manager_role = Role.objects.create(
    name='Manager',
    description='Can manage users and projects',
    is_admin_role=False,
    is_system=True
)
manager_perms = [p for p in created_permissions if p.codename in [
    'can_view_users', 'can_manage_users', 'can_view_projects', 'can_manage_projects',
    'can_view_testcases', 'can_view_reports'
]]
manager_role.permissions.set(manager_perms)
print(f"Created Manager role with {manager_role.permissions.count()} permissions")

# Tester role
tester_role = Role.objects.create(
    name='Tester',
    description='Can work with test cases',
    is_admin_role=False,
    is_system=True
)
tester_perms = [p for p in created_permissions if p.codename in [
    'can_view_users', 'can_view_projects', 'can_view_testcases', 
    'can_manage_testcases', 'can_view_reports'
]]
tester_role.permissions.set(tester_perms)
print(f"Created Tester role with {tester_role.permissions.count()} permissions")

# Viewer role
viewer_role = Role.objects.create(
    name='Viewer',
    description='Read-only access',
    is_admin_role=False,
    is_system=True
)
viewer_perms = [p for p in created_permissions if p.codename in [
    'can_view_users', 'can_view_projects', 'can_view_testcases', 'can_view_reports'
]]
viewer_role.permissions.set(viewer_perms)
print(f"Created Viewer role with {viewer_role.permissions.count()} permissions")

print(f"Total permissions: {Permission.objects.count()}")
print(f"Total roles: {Role.objects.count()}")

# List all roles
for role in Role.objects.all():
    print(f"Role: {role.name} ({role.permissions.count()} permissions)")
EOF

echo "Setup complete!"