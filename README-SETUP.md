# FlowTest 2.0 Setup Guide

This document provides instructions for setting up and running the FlowTest 2.0 project using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Git (optional, for version control)

## Setup Instructions

1. Clone or download the repository
2. Navigate to the project root directory

## Running with Docker Compose

The project is configured to run with Docker Compose using the fixed configuration file:

```bash
docker-compose -f docker-compose.fix.yml up -d
```

This will start the following services:
- Backend (Django)
- Database (PostgreSQL)
- Redis
- Celery Worker
- Celery Beat
- Frontend (Nginx)
- Nginx Proxy

## Accessing the Application

- Frontend: http://localhost:8080/
- Backend API: http://localhost/api/
- Admin Interface: http://localhost/admin/

## Default Credentials

Admin user:
- Username: admin
- Password: admin

## Development Notes

### Fixes Applied

1. Downgraded from Django 5.0.x to Django 4.2.10 to resolve compatibility issues with django-celery-beat
2. Fixed import errors in various Django apps
3. Fixed related_name clashes between models
4. Created proper Dockerfile and entrypoint script
5. Fixed nginx configurations for both frontend and main proxy

### Docker Containers

- `flowtest-backend`: Django backend application
- `flowtest-db`: PostgreSQL database
- `flowtest-redis`: Redis for Celery and caching
- `flowtest-celery-worker`: Celery worker for asynchronous tasks
- `flowtest-celery-beat`: Celery beat for scheduled tasks
- `flowtest-frontend`: Nginx serving frontend files
- `flowtest-nginx`: Main nginx proxy

## Troubleshooting

If containers fail to start:

1. Check logs with `docker-compose -f docker-compose.fix.yml logs [service_name]`
2. Ensure all required directories exist
3. Verify port availability (8000, 8080, 80, 5432, 6379)
4. For database issues, you may need to run migrations:
   ```bash
   docker-compose -f docker-compose.fix.yml exec backend python manage.py migrate
   ```

## Stopping the Application

```bash
docker-compose -f docker-compose.fix.yml down
```

To remove all data (volumes):
```bash
docker-compose -f docker-compose.fix.yml down -v
```