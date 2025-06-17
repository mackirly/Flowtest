# Git Integration Deployment Guide

## 1. Deploy the Application

Run the following command from the project root directory:

```bash
cd "/mnt/d/Flowtest 2.0"
docker-compose up -d
```

This will:
- Build any changed containers
- Start all services (backend, frontend, postgres, redis, celery)
- Apply database migrations automatically

## 2. Verify Services Are Running

Check that all containers are up:

```bash
docker-compose ps
```

You should see all services with status "Up":
- backend
- frontend
- postgres
- redis
- celery_worker
- celery_beat

## 3. Check Logs for Errors

Monitor the logs to ensure everything started correctly:

```bash
# Check backend logs
docker-compose logs -f backend

# Check celery worker logs (important for Git operations)
docker-compose logs -f celery_worker
```

## 4. Access the Application

Open your browser and navigate to:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

## 5. Test Git Integration

### 5.1 Login to the Application
1. Go to http://localhost:3000
2. Login with your credentials

### 5.2 Navigate to Test Cases
1. Click on a project
2. Click on "Test Cases" tab
3. You should see the "Automation" button in the top-right

### 5.3 Add a Git Repository
1. Click "Automation" button
2. Fill in the repository details:
   - **Name**: e.g., "My Test Repository"
   - **Repository URL**: Your GitHub/GitLab repository URL
   - **Repository Type**: Select GitHub or GitLab
   - **Branch**: Usually "main" or "master"
   - **Access Token**: Your personal access token (required for private repos)

### 5.4 Sync Repository
1. After adding, click "Sync" button
2. Check WebSocket notifications for sync progress
3. The sync will:
   - Clone the repository
   - Discover test files
   - Import test names

### 5.5 Create Automated Test Case
1. Click "New Test Case"
2. Select Type: "Automated"
3. Fill in:
   - Test case name
   - Description
   - Select automation project (your synced repository)
   - Enter automation test name (e.g., `tests/test_login.py::test_successful_login`)

### 5.6 Execute Test
1. Open the test case
2. Click "Run Test" button
3. Monitor real-time execution updates via WebSocket

## 6. Troubleshooting

### If containers fail to start:
```bash
# Stop all containers
docker-compose down

# Rebuild without cache
docker-compose build --no-cache

# Start again
docker-compose up -d
```

### If database migrations fail:
```bash
# Run migrations manually
docker-compose exec backend python manage.py migrate
```

### If Git operations fail:
1. Check celery worker logs: `docker-compose logs celery_worker`
2. Verify access token permissions
3. Ensure repository URL is accessible from container

### If WebSocket connections fail:
1. Check browser console for errors
2. Verify nginx configuration allows WebSocket upgrade
3. Check backend logs for connection errors

## 7. Verify Git Tools

Check that Git and test frameworks are installed in backend container:

```bash
# Access backend container
docker-compose exec backend bash

# Check Git
git --version

# Check Python test frameworks
pip list | grep -E "pytest|unittest|robotframework|playwright"

# Exit container
exit
```

## 8. Initial Data Setup (Optional)

If you need to create test data:

```bash
# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Access Django admin
# http://localhost:8000/admin/
```

## 9. Monitor Background Tasks

You can monitor Celery tasks in real-time:

```bash
# Watch celery worker activity
docker-compose logs -f celery_worker

# Or use flower (if installed)
docker-compose exec backend celery -A flowtest flower
```

## Success Indicators

✅ All containers are running
✅ No errors in backend or celery logs  
✅ Can access frontend at http://localhost:3000
✅ Can add and sync Git repositories
✅ Can discover tests in repositories
✅ Can execute automated tests
✅ WebSocket shows real-time updates

## Next Steps

1. Add your first repository
2. Create automated test cases
3. Execute tests and monitor results
4. Check test execution history in the UI