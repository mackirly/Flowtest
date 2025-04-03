# FlowTest Development Guidelines

## Build & Run Commands
- Backend: `python manage.py runserver`  
- Services: `python start_services.py` (starts Redis, Celery, Django)
- Celery: `celery -A FlowTest worker --pool=solo --loglevel=info`
- Frontend: `npm run build:css` (compile Tailwind CSS)
- Watch CSS: `npm run watch:css` (auto-rebuild on changes)
- Static files: `python manage.py collectstatic` or `collect_static.bat`

## Test Commands
- Run all tests: `pytest`
- Run single test: `pytest path/to/test_file.py::test_function_name -v`
- Run with specific options: `pytest --headed --video=on` (default in pytest.ini)
- Debug tests: `pytest -v --log-cli-level=INFO` (cli logs enabled in pytest.ini)

## Lint & Type Check
- Python linting: `flake8`
- CSS building: `npm run build:css`

## Frontend CSS Guidelines
- Use the compiled Tailwind CSS file (`css/tailwind.min.css`) in HTML files
- Never use CDN version of Tailwind in production (`cdn.tailwindcss.com`)
- Always run `npm run build:css` after making changes to Tailwind config
- For development, use `npm run watch:css` to automatically rebuild CSS on changes

## Code Style Guidelines
- Backend: Django with PostgreSQL database and Flask API backend
- Frontend: HTML + Tailwind CSS + JavaScript (Vue.js being phased out)
- Models: Use Django models with descriptive docstrings for complex models
- Naming: CamelCase for classes, snake_case for functions and variables
- Indentation: 4 spaces for Python, 2 spaces for HTML/JS/CSS
- Error handling: Use try/except with specific exception types
- Imports: Group standard library, third-party, and local imports
- Localization: Support for English (en), Russian (ru), and German (de)
- Authentication: JWT tokens for API authentication
- Validation: Use Django validators for model fields
- Testing: Write pytest tests with descriptive function names