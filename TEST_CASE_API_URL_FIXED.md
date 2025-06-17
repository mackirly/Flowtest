# Test Case API URL Configuration Fix

## Problem
The test case creation was failing with 404 error because the URL `/api/projects/{id}/test-cases/` was not configured in the Django backend.

## Solution
Added the test case endpoints under projects in the Django URL configuration.

## Changes Made

### 1. Updated `/backend/projects/urls.py`
Added test cases as a nested resource under projects:

```python
from testcases.views import TestCaseViewSet

# Create a custom router for test cases under projects
testcase_router = DefaultRouter()
testcase_router.register(r'test-cases', TestCaseViewSet, basename='project-testcase')

urlpatterns = [
    # ... existing patterns ...
    
    # Test cases under projects
    path('<int:project_id>/', include(testcase_router.urls)),
    
    # ... other patterns ...
]
```

This creates the following endpoints:
- `GET /api/projects/{project_id}/test-cases/` - List test cases
- `POST /api/projects/{project_id}/test-cases/` - Create test case
- `GET /api/projects/{project_id}/test-cases/{id}/` - Get test case details
- `PATCH /api/projects/{project_id}/test-cases/{id}/` - Update test case
- `DELETE /api/projects/{project_id}/test-cases/{id}/` - Delete test case

## Result
Now the test case creation should work properly with the correct URL structure that matches what the frontend expects.

## Note
After making these changes, you may need to restart the Django development server for the URL changes to take effect:

```bash
docker-compose restart backend
```