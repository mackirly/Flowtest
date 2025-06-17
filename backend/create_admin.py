import os
import sys
import django

sys.path.append('/mnt/d/Flowtest 2.0/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowtest.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Role

User = get_user_model()

# Create admin user
admin_role = Role.objects.filter(name='Admin').first()
if admin_role:
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@flowtest.com',
            'first_name': 'Admin',
            'last_name': 'User',
            'is_staff': True,
            'is_superuser': True,
            'role': admin_role
        }
    )
    if created:
        admin_user.set_password('admin123')
        admin_user.save()
        print(f"Created admin user: {admin_user.username}")
    else:
        if not admin_user.role:
            admin_user.role = admin_role
            admin_user.save()
        print(f"Admin user exists: {admin_user.username}")
    
    print(f"Admin user role: {admin_user.role.name if admin_user.role else 'None'}")
else:
    print("Admin role not found!")

print(f"\nTotal roles: {Role.objects.count()}")
for role in Role.objects.all():
    print(f"  - {role.name}: {role.permissions.count()} permissions")