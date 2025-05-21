# FlowTest 2.0 - Fixed Docker Setup

## What Has Been Fixed

The Docker setup for FlowTest 2.0 has been updated to fix several issues:

1. **Docker Compose Configuration**: 
   - Fixed the main `docker-compose.yml` to use the correct Dockerfile and entrypoint paths
   - Added proper volume mounts for static and media files
   - Added restart policies for all services
   - Fixed environment variables and added missing Celery configuration

2. **Frontend Nginx Configuration**:
   - Fixed proxy settings to use the correct container names instead of host.docker.internal
   - Fixed CORS headers configuration
   - Ensured proper health check endpoint exists

3. **Main Nginx Configuration**:
   - Updated proxy settings for frontend, backend, and WebSocket connections
   - Added proper CORS headers for the API
   - Fixed static and media file serving

4. **Network Connectivity**:
   - Ensured all services can communicate using Docker's internal DNS
   - Fixed service dependencies to ensure proper startup order

## How to Run the Application

1. From the root directory, run:
   ```bash
   docker-compose up -d
   ```

2. To create a superuser (first time setup):
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

3. Access the application:
   - Frontend: http://localhost:8080/
   - Backend API: http://localhost/api/
   - Admin Interface: http://localhost/admin/

## Debugging Issues

If you encounter issues, check the logs of individual services:
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
```

To reset the database and volumes (this will delete all data):
```bash
docker-compose down -v
docker-compose up -d
```

## Container Health Checks

Most containers have healthchecks configured. You can check their status with:
```bash
docker ps
```

Look for the "STATUS" column which will show "(healthy)" or "(unhealthy)" for containers with health checks.

## Common Problems and Solutions

1. **Database Connection Issues**:
   - Check if the database container is running: `docker-compose ps db`
   - Check database logs: `docker-compose logs db`
   - Ensure the environment variables in the backend service match the database credentials

2. **Static/Media Files Not Loading**:
   - Run `docker-compose exec backend python manage.py collectstatic --noinput`
   - Check if volumes are properly mounted: `docker-compose exec backend ls -la /app/static`

3. **Frontend Cannot Connect to Backend**:
   - Check if the backend API is accessible: `docker-compose exec frontend wget -q -O - http://backend:8000/api/`
   - Verify the Nginx configurations for proper proxying

4. **WebSocket Connection Failures**:
   - Ensure the WebSocket endpoint is properly configured in both frontend and Nginx configurations
   - Check logs for any connection errors: `docker-compose logs nginx`