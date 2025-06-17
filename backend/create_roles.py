#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowtest.settings')
django.setup()

from core.models import Permission, Role

# Create permissions
permissions_data = {
    'users': [
        ('can_view_users', 'Can view users'),
        ('can_create_users', 'Can create users'),
        ('can_edit_users', 'Can edit users'),
        ('can_delete_users', 'Can delete users'),
        ('can_manage_user_roles', 'Can manage user roles'),
    ],
    'projects': [
        ('can_view_projects', 'Can view projects'),
        ('can_create_projects', 'Can create projects'),
        ('can_edit_projects', 'Can edit projects'),
        ('can_delete_projects', 'Can delete projects'),
        ('can_manage_project_members', 'Can manage project members'),
    ],
    'testcases': [
        ('can_view_testcases', 'Can view test cases'),
        ('can_create_testcases', 'Can create test cases'),
        ('can_edit_testcases', 'Can edit test cases'),
        ('can_delete_testcases', 'Can delete test cases'),
        ('can_execute_testcases', 'Can execute test cases'),
    ],
    'reports': [
        ('can_view_reports', 'Can view reports'),
        ('can_create_reports', 'Can create reports'),
        ('can_edit_reports', 'Can edit reports'),
        ('can_delete_reports', 'Can delete reports'),
        ('can_export_reports', 'Can export reports'),
    ],
    'automation': [
        ('can_view_automation', 'Can view automation'),
        ('can_manage_automation', 'Can manage automation'),
        ('can_execute_automation', 'Can execute automation'),
    ],
    'system': [
        ('can_manage_system', 'Can manage system settings'),
        ('can_view_logs', 'Can view system logs'),
        ('can_manage_integrations', 'Can manage integrations'),
    ]
}

print("Creating permissions...")
for category, perms in permissions_data.items():
    for codename, name in perms:
        permission, created = Permission.objects.get_or_create(
            codename=codename,
            defaults={
                'name': name,
                'category': category,
                'description': f'{name} in {category} module'
            }
        )
        if created:
            print(f"  Created permission: {name}")
        else:
            print(f"  Permission exists: {name}")

# Create default roles
roles_data = {
    'Admin': {
        'description': 'Full system access with all permissions',
        'is_admin_role': True,
        'is_system': True,
        'permissions': list(Permission.objects.all())
    },
    'Manager': {
        'description': 'Can manage projects, users, and view reports',
        'is_admin_role': False,
        'is_system': True,
        'permissions': Permission.objects.filter(
            codename__in=[
                'can_view_users', 'can_create_users', 'can_edit_users',
                'can_view_projects', 'can_create_projects', 'can_edit_projects', 'can_manage_project_members',
                'can_view_testcases', 'can_create_testcases', 'can_edit_testcases',
                'can_view_reports', 'can_create_reports', 'can_export_reports'
            ]
        )
    },
    'Tester': {
        'description': 'Can create and execute tests, view reports',
        'is_admin_role': False,
        'is_system': True,
        'permissions': Permission.objects.filter(
            codename__in=[
                'can_view_users',
                'can_view_projects',
                'can_view_testcases', 'can_create_testcases', 'can_edit_testcases', 'can_execute_testcases',
                'can_view_reports', 'can_create_reports',
                'can_view_automation', 'can_execute_automation'
            ]
        )
    },
    'Viewer': {
        'description': 'Read-only access to most content',
        'is_admin_role': False,
        'is_system': True,
        'permissions': Permission.objects.filter(
            codename__in=[
                'can_view_users', 'can_view_projects', 'can_view_testcases',
                'can_view_reports', 'can_view_automation'
            ]
        )
    }
}

print("\nCreating roles...")
for role_name, role_data in roles_data.items():
    role, created = Role.objects.get_or_create(
        name=role_name,
        defaults={
            'description': role_data['description'],
            'is_admin_role': role_data['is_admin_role'],
            'is_system': role_data['is_system']
        }
    )
    
    if created:
        print(f"  Created role: {role_name}")
        # Add permissions
        role.permissions.set(role_data['permissions'])
        print(f"    Added {role.permissions.count()} permissions")
    else:
        print(f"  Role exists: {role_name} (permissions: {role.permissions.count()})")

print(f"\nSummary:")
print(f"  Total permissions: {Permission.objects.count()}")
print(f"  Total roles: {Role.objects.count()}")
print(f"  System roles: {Role.objects.filter(is_system=True).count()}")