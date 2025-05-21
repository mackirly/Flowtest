from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django.apps import apps
from django.db.models import Model
from django.core.exceptions import AppRegistryNotReady

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
        # Try to get Activity model
        Activity = apps.get_model('core', 'Activity')
        activities = Activity.objects.filter(user=user)
        
        statistics['activities'].update({
            'total_activities': activities.count(),
            'weekly_activities': activities.filter(created_at__gte=week_ago).count(),
            'monthly_activities': activities.filter(created_at__gte=month_ago).count(),
        })
        
        if activities.exists():
            statistics['last_activity'] = activities.order_by('-created_at').first().created_at.isoformat()
    except (LookupError, AppRegistryNotReady, Model.DoesNotExist):
        pass
    
    try:
        # Try to get Project model
        Project = apps.get_model('core', 'Project')
        projects = Project.objects.filter(user=user)
        
        statistics['projects'].update({
            'total_projects': projects.count(),
            'active_projects': projects.filter(status='active').count(),
        })
    except (LookupError, AppRegistryNotReady, Model.DoesNotExist):
        pass
    
    try:
        # Try to get TestCase model
        TestCase = apps.get_model('core', 'TestCase')
        test_cases = TestCase.objects.filter(user=user)
        
        statistics['test_cases'].update({
            'total_test_cases': test_cases.count(),
            'passed_cases': test_cases.filter(status='passed').count(),
            'failed_cases': test_cases.filter(status='failed').count(),
        })
    except (LookupError, AppRegistryNotReady, Model.DoesNotExist):
        pass
    
    return Response(statistics)