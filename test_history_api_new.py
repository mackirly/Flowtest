#!/usr/bin/env python3
"""
Test script to check test run history API
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
USERNAME = "admin"
PASSWORD = "admin"

def get_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/core/token/",
        json={"username": USERNAME, "password": PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get('access')
    else:
        print(f"Failed to login: {response.status_code}")
        print(response.text)
        return None

def get_test_runs(token, project_id, test_case_id):
    """Get test run history for a test case"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    url = f"{BASE_URL}/api/projects/{project_id}/test-cases/{test_case_id}/test_runs/"
    print(f"\nGET {url}")
    
    response = requests.get(url, headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return data
    else:
        print(f"Error: {response.text}")
        return None

def get_latest_test_runs(token):
    """Get latest test runs from database"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Try to get all test runs
    url = f"{BASE_URL}/api/testcases/runs/"
    print(f"\nGET {url}")
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if 'results' in data:
            # Paginated response
            runs = data['results'][:5]  # Get first 5
        else:
            runs = data[:5]
            
        print("\nLatest test runs:")
        for run in runs:
            print(f"- Run #{run['id']}: Test case #{run['test_case']} - Status: {run['status']}")
            
        return runs
    else:
        print(f"Error: {response.text}")
        return []

def main():
    print("Testing Test Run History API...")
    
    # Get token
    token = get_token()
    if not token:
        print("Failed to get token")
        return
    
    print(f"Got token: {token[:20]}...")
    
    # Get latest test runs to find a test case
    latest_runs = get_latest_test_runs(token)
    
    if latest_runs:
        # Take the first run and check its history
        first_run = latest_runs[0]
        test_case_id = first_run['test_case']
        
        # Guess project ID (this is a limitation - we need to know the project)
        # Let's try common project IDs
        for project_id in [1, 2, 3, 4, 5]:
            print(f"\nTrying project {project_id}, test case {test_case_id}...")
            result = get_test_runs(token, project_id, test_case_id)
            if result is not None:
                print(f"\nFound {len(result)} test runs for this test case")
                break
    else:
        # Try with hardcoded values
        print("\nNo recent runs found, trying with hardcoded values...")
        get_test_runs(token, 3, 5)  # Project 3, Test case 5

if __name__ == "__main__":
    main()