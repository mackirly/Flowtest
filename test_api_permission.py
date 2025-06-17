#!/usr/bin/env python3
"""
Test script to check TestRun API permissions
"""
import requests
import json
import time

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

def test_get_test_run(token, test_run_id):
    """Test getting a specific test run"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(
        f"{BASE_URL}/api/testcases/runs/{test_run_id}/",
        headers=headers
    )
    
    print(f"GET /api/testcases/runs/{test_run_id}/")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Error: {response.text}")
    
    return response.status_code == 200

def test_list_test_runs(token):
    """Test listing all test runs"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(
        f"{BASE_URL}/api/testcases/runs/",
        headers=headers
    )
    
    print("\nGET /api/testcases/runs/")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {data.get('count', 0)}")
        if data.get('results'):
            print(f"First run ID: {data['results'][0]['id']}")
            return data['results'][0]['id']
    else:
        print(f"Error: {response.text}")
    
    return None

def main():
    print("Testing TestRun API permissions...")
    
    # Get token
    token = get_token()
    if not token:
        print("Failed to get token")
        return
    
    print(f"Got token: {token[:20]}...")
    
    # Test listing runs
    first_run_id = test_list_test_runs(token)
    
    # Test getting specific run
    if first_run_id:
        time.sleep(1)
        test_get_test_run(token, first_run_id)
    else:
        # Try with a hardcoded ID
        print("\nTrying with hardcoded ID 34...")
        test_get_test_run(token, 34)

if __name__ == "__main__":
    main()