"""Check test runs in database"""
import os
import sys

# Just check if test runs exist in database using raw queries
print("Checking test runs...")

# Try to read the models file to understand structure
with open('/mnt/d/Flowtest 2.0/backend/testcases/models.py', 'r') as f:
    content = f.read()
    
# Find TestRun model definition
import re
match = re.search(r'class TestRun\(.*?\):(.*?)class', content, re.DOTALL)
if match:
    print("TestRun model found:")
    lines = match.group(1).split('\n')[:20]  # First 20 lines
    for line in lines:
        if 'test_case' in line and 'ForeignKey' in line:
            print(f"  Found test_case field: {line.strip()}")
        if 'related_name' in line:
            print(f"  Related name: {line.strip()}")
            
# Check if test runs are being created correctly
print("\nLooking for test run creation in views...")
with open('/mnt/d/Flowtest 2.0/backend/testcases/views.py', 'r') as f:
    view_content = f.read()
    
# Find TestRun.objects.create
creates = re.findall(r'TestRun\.objects\.create\((.*?)\)', view_content, re.DOTALL)
for i, create in enumerate(creates[:3]):
    print(f"\nTestRun creation {i+1}:")
    print(create[:200] + "..." if len(create) > 200 else create)