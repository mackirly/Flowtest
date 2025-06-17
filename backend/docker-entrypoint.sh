#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Database is ready!"

# Check if manage.py exists
if [ ! -f /app/manage.py ]; then
    echo "Error: manage.py not found in /app/"
    ls -la /app/
    exit 1
fi

# Create necessary directories
echo "Creating directories..."
mkdir -p /app/media/avatars
mkdir -p /app/media/automation_projects
mkdir -p /app/static
mkdir -p /app/logs

# Initialize Django project structure
echo "Running migrations..."
python /app/manage.py makemigrations --noinput
python /app/manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python /app/manage.py collectstatic --noinput || true

# Create basic roles if needed
if [ "$CREATE_ROLES" = "true" ]; then
    echo "Creating basic roles..."
    python /app/manage.py setup_permissions || true
fi

# Fix BatchExecuteSerializer to BatchExecuteTestsSerializer
if [ -f /app/testcases/serializers.py ]; then
    sed -i 's/class BatchExecuteSerializer/class BatchExecuteTestsSerializer/g' /app/testcases/serializers.py
fi

echo "Starting application..."
# Execute the command provided as arguments
exec "$@"