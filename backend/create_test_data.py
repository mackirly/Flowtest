#\!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowtest.settings')
django.setup()

from django.contrib.auth import get_user_model
from projects.models import Project, Folder, TestRun
from testcases.models import TestCase
from datetime import datetime

User = get_user_model()

# Создаем пользователя если его нет
try:
    user = User.objects.get(username='testuser')
    print(f"User exists: {user.username}")
except:
    user = User.objects.create_user(username='testuser', password='testpass123', email='test@example.com')
    print(f"Created user: {user.username}")

# Создаем проект
project, created = Project.objects.get_or_create(
    name='Test Project',
    defaults={'description': 'Test project for demo', 'owner': user}
)
print(f"Project: {project.name} (created: {created})")

# Создаем папку
folder, created = Folder.objects.get_or_create(
    name='Test Folder',
    project=project,
    defaults={'description': 'Test folder'}
)
print(f"Folder: {folder.name} (created: {created})")

# Создаем тест-кейсы
for i in range(1, 4):
    tc, created = TestCase.objects.get_or_create(
        title=f'Test Case {i}',
        folder=folder,
        defaults={
            'description': f'Description for test case {i}',
            'priority': ['high', 'medium', 'low'][i-1],
            'test_type': 'manual',
            'author': user
        }
    )
    print(f"Test case: {tc.title} (created: {created})")

# Создаем тестовый прогон
test_run, created = TestRun.objects.get_or_create(
    name=f'Test Run - {datetime.now().strftime("%Y-%m-%d %H:%M")}',
    project=project,
    defaults={
        'created_by': user,
        'status': 'in_progress'
    }
)
print(f"Test run: {test_run.name} (created: {created})")

print("Test data created successfully\!")
ENDOFFILE < /dev/null
