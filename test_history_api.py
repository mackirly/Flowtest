#!/usr/bin/env python3
"""
Test script to check test runs history API
"""
import requests
import json

# Configuration
BASE_URL = 'http://localhost:8000'
USERNAME = 'admin'  # Replace with your username
PASSWORD = 'admin'  # Replace with your password

# Login to get access token
def login():
    response = requests.post(f'{BASE_URL}/api/auth/login/', json={
        'username': USERNAME,
        'password': PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get('access')
    else:
        print(f"Login failed: {response.status_code}")
        print(response.json())
        return None

# Get test runs for a test case
def get_test_runs(token, project_id, test_case_id):
    headers = {'Authorization': f'Bearer {token}'}
    url = f'{BASE_URL}/api/projects/{project_id}/test-cases/{test_case_id}/test_runs/'
    
    print(f"\nGetting test runs from: {url}")
    response = requests.get(url, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data)} test runs")
        for run in data:
            print(f"  - Run ID: {run['id']}, Status: {run['status']}, Started: {run['started_at']}")
        return data
    else:
        print(f"Error: {response.text}")
        return None

# Create a test run
def create_test_run(token, project_id, test_case_id):
    headers = {'Authorization': f'Bearer {token}'}
    url = f'{BASE_URL}/api/projects/{project_id}/test-cases/{test_case_id}/execute/'
    
    print(f"\nCreating test run via: {url}")
    response = requests.post(url, headers=headers, json={
        'environment': 'test'
    })
    
    print(f"Status Code: {response.status_code}")
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"Created test run: {data}")
        return data
    else:
        print(f"Error: {response.text}")
        return None

def main():
    # Change these values to match your test data
    PROJECT_ID = 3  # Your project ID
    TEST_CASE_ID = 5  # Your test case ID
    
    # Login
    print("Logging in...")
    token = login()
    if not token:
        print("Failed to login")
        return
    
    print(f"Access token obtained")
    
    # Get test runs
    print(f"\n=== Getting test runs for Test Case {TEST_CASE_ID} in Project {PROJECT_ID} ===")
    test_runs = get_test_runs(token, PROJECT_ID, TEST_CASE_ID)
    
    # Optionally create a test run
    # print(f"\n=== Creating a new test run ===")
    # create_test_run(token, PROJECT_ID, TEST_CASE_ID)

if __name__ == '__main__':
    main()