# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Notes

- The project uses `Dockerfile.fix` instead of `Dockerfile` for the backend service
- The backend service runs in `/app` directory inside the container
- Database migrations run automatically on container startup via docker-entrypoint.sh

## Development Commands

### Backend (Django)

```bash
# Local development
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Run tests
pytest
python manage.py test

# Code quality
black .                    # Format code
flake8                    # Lint code
isort .                   # Sort imports
pylint */**.py            # Additional linting

# Database operations
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Celery workers (in separate terminals)
celery -A flowtest worker --loglevel=info
celery -A flowtest beat --loglevel=info
```

### Frontend

```bash
cd frontend

# Development
npm run dev               # Watch and compile Tailwind CSS
npm run serve            # Serve frontend locally

# Build for production
npm run build            # Minify CSS

# Run tests
npm run test:avatar      # Run avatar upload tests
```

### Docker Commands

```bash
# Build containers (required after Dockerfile changes)
docker-compose build

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f celery_worker

# Execute Django commands in container
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser

# Access container shell
docker-compose exec backend bash

# Rebuild and restart if having issues
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Architecture Overview

### Technology Stack
- **Backend**: Django 4.2.10 with Django REST Framework
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **Database**: PostgreSQL 15
- **Cache/Message Broker**: Redis
- **Task Queue**: Celery with Redis backend
- **WebSockets**: Django Channels
- **Web Server**: Nginx (reverse proxy)
- **Container**: Docker with Docker Compose

### Key Architecture Patterns

1. **API-First Design**: Backend provides RESTful API consumed by frontend
2. **JWT Authentication**: Using djangorestframework-simplejwt
3. **Real-time Updates**: WebSocket support via Django Channels
4. **Asynchronous Tasks**: Celery for background processing
5. **Microservices Ready**: Each service runs in its own container

### Django Apps Structure

- **core**: User management, authentication, permissions
- **projects**: Project and folder organization
- **testcases**: Test case management and execution
- **automation**: Git integration and automated test execution
- **reports**: Test reporting and analytics
- **api**: Shared API utilities and middleware

### Frontend Architecture

- **Single Page Application**: Client-side routing with vanilla JS
- **Module Pattern**: Each page/component in separate module
- **API Client**: Centralized API communication in `js/api/`
- **Event-Driven**: Custom event system for component communication

## Critical Implementation Details

### Authentication Flow
1. Frontend sends credentials to `/api/auth/login/`
2. Backend returns JWT tokens (access + refresh)
3. Frontend stores tokens in localStorage
4. All API requests include `Authorization: Bearer <token>` header
5. Token refresh handled automatically by interceptor

### WebSocket Implementation
- Connection URL: `ws://localhost/ws/notifications/`
- Authentication via JWT token in query string
- Handles real-time test execution updates

### File Storage
- User uploads: `/media/` directory (served by Nginx)
- Static files: Collected to `/static/` via whitenoise
- Automation repos: `/automation_projects/` volume

### Database Relationships
- Projects contain Folders (hierarchical)
- Folders contain TestCases
- TestCases can be manual or automated
- AutomationProjects link to git repositories
- TestRuns track execution history

### API Endpoints Pattern
```
/api/auth/           - Authentication endpoints
/api/core/           - User management, profiles
/api/projects/       - Project CRUD operations
/api/testcases/      - Test case management
/api/automation/     - Repository sync, test execution
/api/reports/        - Report generation
```

### Environment Variables
Key variables set in docker-compose.yml:
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `POSTGRES_*` (database connection)
- `REDIS_*` (Redis connection)
- `CELERY_*` (Celery configuration)

## Common Development Tasks

### Adding a New API Endpoint
1. Create serializer in `<app>/serializers.py`
2. Create view in `<app>/views.py`
3. Add URL pattern in `<app>/urls.py`
4. Update frontend API client in `frontend/js/api/`

### Creating Database Migration
1. Modify model in `<app>/models.py`
2. Run `python manage.py makemigrations <app>`
3. Review migration file
4. Apply with `python manage.py migrate`

### Adding Frontend Page
1. Create HTML file in `frontend/`
2. Create JS module in `frontend/js/pages/`
3. Add routing in main navigation
4. Style with Tailwind classes

### Debugging
- Backend logs: `docker-compose logs -f backend`
- Django debug toolbar available in DEBUG mode
- Frontend console for JS errors
- Network tab for API debugging