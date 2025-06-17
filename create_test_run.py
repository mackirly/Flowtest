"""Create a test run for debugging"""

print("""
To create a test run manually, use Django shell:

python manage.py shell

Then run:

from testcases.models import TestCase, TestRun
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

# Get a test case
test_case = TestCase.objects.first()
if test_case:
    # Get a user
    user = User.objects.first()
    
    # Create a test run
    test_run = TestRun.objects.create(
        test_case=test_case,
        executor=user,
        status='passed',
        started_at=timezone.now(),
        finished_at=timezone.now(),
        run_type='manual'
    )
    print(f"Created test run {test_run.id} for test case {test_case.title}")
else:
    print("No test cases found!")
""")