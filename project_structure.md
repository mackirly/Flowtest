# FlowTest 2.0 Project Structure

## Backend Structure

```
backend/
├── Dockerfile                      # Docker configuration for backend
├── manage.py                       # Django management script
├── requirements.txt                # Python dependencies
├── flowtest/                       # Django project directory
│   ├── __init__.py                 # Package indicator
│   ├── asgi.py                     # ASGI configuration
│   ├── celery.py                   # Celery configuration
│   ├── settings.py                 # Django settings
│   ├── urls.py                     # Main URL configuration
│   ├── wsgi.py                     # WSGI configuration
│   └── routing.py                  # Websocket routing
├── core/                           # Core application (users, auth, etc.)
│   ├── __init__.py                 # Package indicator
│   ├── admin.py                    # Django admin configuration
│   ├── apps.py                     # App configuration
│   ├── models.py                   # Database models for core functionality
│   ├── serializers.py              # DRF serializers for core models
│   ├── views.py                    # API views for core functionality
│   ├── urls.py                     # URL routing for core app
│   ├── permissions.py              # Custom permissions
│   ├── validators.py               # Custom validators
│   ├── tasks.py                    # Celery tasks for core app
│   ├── signals.py                  # Django signals
│   ├── migrations/                 # Database migrations
│   └── tests/                      # Tests for core app
├── projects/                       # Projects application
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── tasks.py
│   ├── services.py                 # Business logic services
│   ├── migrations/
│   └── tests/
├── testcases/                      # Test cases application
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── tasks.py
│   ├── services.py
│   ├── migrations/
│   └── tests/
├── automation/                     # Test automation application
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── tasks.py
│   ├── services/                   # Business logic services
│   │   ├── __init__.py
│   │   ├── repository_service.py   # Repository management
│   │   ├── test_execution.py       # Test execution
│   │   └── scheduler_service.py    # Scheduling service
│   ├── migrations/
│   └── tests/
├── reports/                        # Reporting application
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── tasks.py
│   ├── templates/                  # Report templates
│   ├── services/                   # Report generation services
│   ├── migrations/
│   └── tests/
├── api/                            # API utilities and shared resources
│   ├── __init__.py
│   ├── apps.py
│   ├── pagination.py               # Custom pagination
│   ├── mixins.py                   # Reusable view mixins
│   ├── exceptions.py               # Custom API exceptions
│   ├── throttling.py               # Rate limiting
│   └── utils.py                    # Shared API utilities
├── common/                         # Shared utilities across apps
│   ├── __init__.py
│   ├── middleware/                 # Custom middleware
│   ├── utils/                      # Utility functions
│   └── decorators/                 # Reusable decorators
├── media/                          # User uploaded files
└── static/                         # Static files
```

## Frontend Structure

```
frontend/
├── Dockerfile                      # Docker configuration for frontend
├── index.html                      # Main HTML entry point
├── css/                            # CSS styles
│   ├── tailwind.css                # Tailwind entry file
│   ├── custom.css                  # Custom styles
│   └── components/                 # Component-specific styles
├── js/                             # JavaScript files
│   ├── app.js                      # Main application entry point
│   ├── config.js                   # Application configuration
│   ├── api/                        # API client modules
│   │   ├── client.js               # Base API client
│   │   ├── auth.js                 # Authentication API
│   │   ├── projects.js             # Projects API
│   │   ├── testcases.js            # Test cases API
│   │   ├── automation.js           # Automation API
│   │   └── reports.js              # Reports API
│   ├── services/                   # Frontend services
│   │   ├── auth.js                 # Authentication service
│   │   ├── storage.js              # Local storage service
│   │   ├── notification.js         # Notification service
│   │   └── events.js               # Event handling service
│   ├── components/                 # UI components
│   │   ├── sidebar.js              # Navigation sidebar
│   │   ├── modal.js                # Modal dialog
│   │   ├── folder-tree.js          # Folder tree component
│   │   ├── test-editor.js          # Test case editor
│   │   ├── charts.js               # Charts and analytics
│   │   └── toast.js                # Toast notifications
│   ├── pages/                      # Page controllers
│   │   ├── login.js                # Login page
│   │   ├── dashboard.js            # Dashboard page
│   │   ├── projects.js             # Projects page
│   │   ├── test-cases.js           # Test cases page
│   │   ├── automation.js           # Automation page
│   │   └── reports.js              # Reports page
│   └── utils/                      # Utility functions
│       ├── date.js                 # Date manipulation
│       ├── validation.js           # Form validation
│       ├── formatting.js           # Data formatting
│       └── dom.js                  # DOM manipulation
├── images/                         # Image assets
├── templates/                      # HTML templates
│   ├── components/                 # Component templates
│   │   ├── sidebar.html            # Sidebar template
│   │   ├── modal.html              # Modal dialog template
│   │   └── ...                     # Other component templates
│   └── pages/                      # Page templates
│       ├── login.html              # Login page
│       ├── dashboard.html          # Dashboard page
│       ├── projects.html           # Projects page
│       ├── test-cases.html         # Test cases page
│       ├── automation.html         # Automation page
│       └── reports.html            # Reports page
├── package.json                    # Node.js dependencies for development
├── tailwind.config.js              # Tailwind CSS configuration
└── postcss.config.js               # PostCSS configuration
```

## Nginx Configuration

```
nginx/
├── Dockerfile                      # Docker configuration for Nginx
├── nginx.conf                      # Main Nginx configuration
└── conf.d/                         # Additional configuration files
    └── default.conf                # Default server configuration
```

## Docker Compose Configuration

```
docker-compose.yml                  # Docker compose configuration
```

## Root Directory Files

```
.env.example                        # Example environment variables
.gitignore                          # Git ignore file
README.md                           # Project documentation
implementation_plan.md              # Implementation plan
project_structure.md                # This document
```