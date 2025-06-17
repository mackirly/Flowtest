from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta, datetime
from django.apps import apps
from django.db.models import Model
from django.core.exceptions import AppRegistryNotReady

try:
    from projects.models import Project
except ImportError:
    Project = None
    
try:
    from testcases.models import TestCase, TestRun
except ImportError:
    TestCase = None
    TestRun = None
    
try:
    from core.models import Activity, CustomUser
except ImportError:
    Activity = None
    CustomUser = None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_statistics(request):
    # Get current user
    user = request.user
    
    # Calculate date ranges
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Initialize default statistics
    statistics = {
        'activities': {
            'total_activities': 0,
            'weekly_activities': 0,
            'monthly_activities': 0,
        },
        'projects': {
            'total_projects': 0,
            'active_projects': 0,
        },
        'test_cases': {
            'total_test_cases': 0,
            'passed_cases': 0,
            'failed_cases': 0,
        },
        'last_activity': None,
        'member_since': user.date_joined.isoformat()
    }
    
    try:
        # Get Activity data
        if Activity:
            activities = Activity.objects.filter(user=user)
            
            statistics['activities'].update({
                'total_activities': activities.count(),
                'weekly_activities': activities.filter(created_at__gte=week_ago).count(),
                'monthly_activities': activities.filter(created_at__gte=month_ago).count(),
            })
            
            if activities.exists():
                statistics['last_activity'] = activities.order_by('-created_at').first().created_at.isoformat()
    except Exception as e:
        print(f"Error loading activities: {e}")
    
    try:
        # Get Project data
        if Project:
            projects = Project.objects.filter(members=user)
            
            statistics['projects'].update({
                'total_projects': projects.count(),
                'active_projects': projects.count(),  # All projects are active
            })
    except Exception as e:
        print(f"Error loading projects: {e}")
    
    try:
        # Get TestCase data
        if TestCase and Project:
            test_cases = TestCase.objects.filter(project__members=user)
            
            statistics['test_cases'].update({
                'total_test_cases': test_cases.count(),
                'passed_cases': 0,  # Will be calculated from test runs
                'failed_cases': 0,  # Will be calculated from test runs
            })
    except Exception as e:
        print(f"Error loading test cases: {e}")
    
    return Response(statistics)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_statistics(request):
    """Dashboard statistics for charts and metrics"""
    user = request.user
    
    if not all([Project, TestCase, TestRun, CustomUser]):
        return Response({
            'basic_stats': {
                'test_cases_count': 0,
                'passed_tests_count': 0,
                'failed_tests_count': 0,
                'pending_tests_count': 0
            },
            'charts': {
                'tests_over_time': [],
                'execution_time': [],
                'priority_distribution': {'high': 0, 'medium': 0, 'low': 0},
                'results_distribution': {'passed': 0, 'failed': 0, 'pending': 0}
            },
            'top_lists': {
                'active_users': [],
                'failing_tests': []
            }
        })
    
    # Get user's projects
    user_projects = Project.objects.filter(members=user)
    
    # Filter by specific project if requested
    project_id = request.GET.get('project_id')
    if project_id:
        try:
            user_projects = user_projects.filter(id=project_id)
            if not user_projects.exists():
                # User doesn't have access to this project
                return Response({
                    'basic_stats': {
                        'test_cases_count': 0,
                        'passed_tests_count': 0,
                        'failed_tests_count': 0,
                        'pending_tests_count': 0
                    },
                    'charts': {
                        'tests_over_time': [],
                        'execution_time': [],
                        'priority_distribution': {'high': 0, 'medium': 0, 'low': 0},
                        'results_distribution': {'passed': 0, 'failed': 0, 'pending': 0}
                    },
                    'top_lists': {
                        'active_users': [],
                        'failing_tests': []
                    }
                })
        except (ValueError, TypeError):
            # Invalid project_id format
            pass
    
    # Get all test cases in user's projects
    all_test_cases = TestCase.objects.filter(project__in=user_projects)
    total_test_cases = all_test_cases.count()
    
    # Get all test runs in user's projects
    all_test_runs = TestRun.objects.filter(test_case__project__in=user_projects)
    
    # Basic metrics
    passed_count = all_test_runs.filter(status='passed').count()
    failed_count = all_test_runs.filter(status='failed').count()
    pending_count = all_test_runs.filter(status='pending').count()
    
    # If no pending runs, count test cases without any runs as pending
    if pending_count == 0:
        test_cases_with_runs = all_test_cases.filter(test_runs__isnull=False).distinct().count()
        pending_count = max(0, total_test_cases - test_cases_with_runs)
    
    # Tests over time (last 30 days)
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    
    tests_time_data = []
    for i in range(30):
        date = thirty_days_ago + timedelta(days=i)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        count = all_test_runs.filter(
            started_at__gte=day_start,
            started_at__lt=day_end
        ).count()
        
        tests_time_data.append({
            'date': day_start.strftime('%m-%d'),
            'count': count
        })
    
    # Execution time trends (last 30 test runs)
    recent_runs = all_test_runs.filter(
        finished_at__isnull=False,
        started_at__isnull=False
    ).order_by('-started_at')[:30]
    
    execution_time_data = []
    for run in recent_runs:
        if run.started_at and run.finished_at:
            duration = (run.finished_at - run.started_at).total_seconds() * 1000  # in ms
            execution_time_data.append({
                'test': run.test_case.title[:20] + '...' if len(run.test_case.title) > 20 else run.test_case.title,
                'duration': int(duration)
            })
    
    # Priority distribution
    priority_counts = all_test_cases.values('priority').annotate(count=Count('id'))
    priority_data = {'high': 0, 'medium': 0, 'low': 0}
    for item in priority_counts:
        priority_data[item['priority']] = item['count']
    
    # Top active users (who created most test cases)
    active_users = CustomUser.objects.filter(
        authored_tests__project__in=user_projects
    ).annotate(
        test_count=Count('authored_tests')
    ).filter(test_count__gt=0).order_by('-test_count')[:5]
    
    active_users_data = []
    for user_obj in active_users:
        active_users_data.append({
            'id': user_obj.id,
            'name': f"{user_obj.first_name} {user_obj.last_name}".strip() or user_obj.username,
            'email': user_obj.email,
            'test_cases_count': user_obj.test_count,
            'avatar': user_obj.avatar.url if user_obj.avatar else None
        })
    
    # Top failing tests
    failing_tests = all_test_cases.annotate(
        failure_count=Count('test_runs', filter=Q(test_runs__status='failed'))
    ).filter(failure_count__gt=0).order_by('-failure_count')[:5]
    
    failing_tests_data = []
    for test_case in failing_tests:
        last_failure = all_test_runs.filter(
            test_case=test_case,
            status='failed'
        ).order_by('-started_at').first()
        
        failing_tests_data.append({
            'id': test_case.id,
            'name': test_case.title,
            'failure_count': test_case.failure_count,
            'last_failure': last_failure.started_at.isoformat() if last_failure else None,
            'project': test_case.project.name
        })
    
    return Response({
        'basic_stats': {
            'test_cases_count': total_test_cases,
            'passed_tests_count': passed_count,
            'failed_tests_count': failed_count,
            'pending_tests_count': pending_count
        },
        'charts': {
            'tests_over_time': tests_time_data,
            'execution_time': execution_time_data,
            'priority_distribution': priority_data,
            'results_distribution': {
                'passed': passed_count,
                'failed': failed_count,
                'pending': pending_count
            }
        },
        'top_lists': {
            'active_users': active_users_data,
            'failing_tests': failing_tests_data
        }
    })