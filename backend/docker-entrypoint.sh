#!/bin/sh
set -e

# Initialize Django project structure
python /app/manage.py makemigrations
python /app/manage.py migrate
python /app/manage.py collectstatic --noinput

# Fix BatchExecuteSerializer to BatchExecuteTestsSerializer
if [ -f /app/testcases/serializers.py ]; then
    sed -i 's/class BatchExecuteSerializer/class BatchExecuteTestsSerializer/g' /app/testcases/serializers.py
fi

# Execute the command provided as arguments
exec "$@"