# FlowTest 2.0

FlowTest is a comprehensive test management system designed to help teams manage test cases, execute automated tests, and generate reports. This version (2.0) is a complete rebuild of the original FlowTest with improved architecture, better code organization, and enhanced user experience.

## Features

- **Test Case Management**: Create, organize and manage test cases in a hierarchical folder structure
- **Project Organization**: Group test cases by projects and control access
- **Test Execution**: Run tests manually or automate them with different frameworks
- **Repository Integration**: Connect to GitHub, GitLab or Bitbucket repositories
- **Reporting**: Generate customizable reports from test results
- **Real-time Updates**: Get real-time notifications about test execution
- **User Management**: Role-based access control
- **Analytics**: Visualize test results and trends

## Tech Stack

### Backend
- Django
- Django REST Framework
- PostgreSQL
- Celery
- Redis
- WebSockets (Django Channels)

### Frontend
- HTML
- Tailwind CSS
- JavaScript

### Deployment
- Docker
- Nginx

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/flowtest.git
   cd flowtest
   ```

2. Create a `.env` file from the example:
   ```
   cp .env.example .env
   ```

3. Start the application with Docker Compose:
   ```
   docker-compose up -d
   ```

4. Create a superuser for admin access:
   ```
   docker-compose exec backend python manage.py createsuperuser
   ```

5. Access the application:
   - Frontend: http://localhost/
   - Admin interface: http://localhost/admin/
   - API: http://localhost/api/

### Development

#### Backend Development

1. Install dependencies:
   ```
   cd backend
   pip install -r requirements.txt
   ```

2. Run migrations:
   ```
   python manage.py migrate
   ```

3. Start the development server:
   ```
   python manage.py runserver
   ```

#### Frontend Development

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Make changes to the HTML, CSS, or JavaScript files
3. If working with Tailwind CSS, compile the CSS:
   ```
   npx tailwindcss -i ./css/tailwind.css -o ./css/output.css --watch
   ```

## Project Structure

- `backend/`: Django backend application
- `frontend/`: Frontend HTML/CSS/JS files
- `nginx/`: Nginx configuration
- `docker-compose.yml`: Docker Compose configuration
- `implementation_plan.md`: Implementation plan document
- `project_structure.md`: Detailed project structure
- `database_schema.md`: Database schema description

## Documentation

Refer to the following documents for more detailed information:

- [Implementation Plan](implementation_plan.md)
- [Project Structure](project_structure.md)
- [Database Schema](database_schema.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Original FlowTest project
- Django and Django REST Framework
- Tailwind CSS