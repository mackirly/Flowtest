#!/usr/bin/env python3

# Quick test script to verify API filtering
import os
import sys
import django

# Setup Django
sys.path.append('/mnt/d/Flowtest 2.0/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowtest.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from core.views.statistics import dashboard_statistics

User = get_user_model()
user = User.objects.first()

print(f'Testing with user: {user.username}')

# Test ALL projects
factory = RequestFactory()
request_all = factory.get('/api/core/dashboard-statistics/')
request_all.user = user
response_all = dashboard_statistics(request_all)

print('\n=== ALL PROJECTS ===')
print(f'Test cases: {response_all.data["basic_stats"]["test_cases_count"]}')

# Test PROJECT 3 only  
request_proj3 = factory.get('/api/core/dashboard-statistics/?project_id=3')
request_proj3.user = user
response_proj3 = dashboard_statistics(request_proj3)

print('\n=== PROJECT 3 ONLY ===')
print(f'Test cases: {response_proj3.data["basic_stats"]["test_cases_count"]}')

# Test PROJECT 1 (should be 0)
request_proj1 = factory.get('/api/core/dashboard-statistics/?project_id=1')
request_proj1.user = user
response_proj1 = dashboard_statistics(request_proj1)

print('\n=== PROJECT 1 ONLY ===')
print(f'Test cases: {response_proj1.data["basic_stats"]["test_cases_count"]}')

print('\n=== SUMMARY ===')
all_count = response_all.data['basic_stats']['test_cases_count']
proj3_count = response_proj3.data['basic_stats']['test_cases_count']
proj1_count = response_proj1.data['basic_stats']['test_cases_count']

print(f'All projects: {all_count}')
print(f'Project 3: {proj3_count}')
print(f'Project 1: {proj1_count}')

if all_count == proj3_count and proj1_count == 0:
    print('✅ API filtering works correctly!')
else:
    print('❌ API filtering has issues!')