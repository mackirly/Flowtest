# FlowTest 2.0 Project Configuration

## Build and Run Commands
- **Backend Server**: `python backend/manage.py runserver`
- **Docker Compose**: `docker-compose up -d`
- **Apply Migrations**: `python backend/manage.py migrate`
- **Create Migrations**: `python backend/manage.py makemigrations` 
- **Create Superuser**: `python backend/manage.py createsuperuser`

## Test Commands
- **Run All Tests**: `python backend/manage.py test`
- **Run Specific App Tests**: `python backend/manage.py test testcases`
- **Run Single Test**: `python backend/manage.py test testcases.tests.TestClassName.test_method_name`
- **Run Pytest**: `pytest backend/`

## Linting Commands
- **Black**: `black backend/`
- **Flake8**: `flake8 backend/`
- **isort**: `isort backend/`
- **Pylint**: `pylint backend/**/*.py`

## Code Style Guidelines
- **Python**: Follow PEP 8 standards with Black formatter (line length 88)
- **Imports**: Use isort with sections (stdlib, django, third-party, local)
- **Django Models**: Use explicit verbose_name and help_text for fields
- **Error Handling**: Use custom exceptions in api.exceptions module
- **Type Hints**: Add type annotations for function parameters and returns
- **Naming**: snake_case for variables/functions, PascalCase for classes
- **API Views**: Use ViewSets and Serializers from DRF