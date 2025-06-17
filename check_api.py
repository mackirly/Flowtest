#!/usr/bin/env python3
"""Check FlowTest API for folder counts and test cases"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, '/mnt/d/Flowtest 2.0/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from projects.models import Project, Folder
from testcases.models import TestCase
from projects.serializers import FolderSerializer

# Get all projects
projects = Project.objects.all()
print(f"Found {projects.count()} projects\n")

for project in projects:
    print(f"Project: {project.name}")
    print(f"  Total test cases in project: {project.test_cases.count()}")
    
    # Get folders
    folders = project.folders.all()
    print(f"  Total folders: {folders.count()}")
    
    for folder in folders:
        # Direct count
        direct_count = folder.test_cases.count()
        
        # Serializer count
        serializer = FolderSerializer(folder)
        serializer_count = serializer.data.get('test_cases_count', 0)
        
        print(f"\n  Folder: {folder.name} (ID: {folder.id})")
        print(f"    Direct test cases count: {direct_count}")
        print(f"    Serializer count: {serializer_count}")
        
        # Show test cases
        test_cases = folder.test_cases.all()
        if test_cases:
            print("    Test cases:")
            for tc in test_cases[:5]:  # Show first 5
                print(f"      - {tc.title} (Priority: {tc.priority})")
            if test_cases.count() > 5:
                print(f"      ... and {test_cases.count() - 5} more")
    
    # Show test cases without folders
    orphan_tests = project.test_cases.filter(folder__isnull=True)
    if orphan_tests:
        print(f"\n  Test cases without folder: {orphan_tests.count()}")
        for tc in orphan_tests[:5]:
            print(f"    - {tc.title}")
    
    print("\n" + "="*50 + "\n")