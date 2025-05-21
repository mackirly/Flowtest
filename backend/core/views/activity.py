from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.apps import apps
from django.db.models import Model
from django.core.exceptions import AppRegistryNotReady

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activity(request):
    # Get limit from query params, default to 5
    limit = int(request.GET.get('limit', 5))
    
    try:
        # Try to get Activity model if it exists
        Activity = apps.get_model('core', 'Activity')
        
        # Get user's activities
        activities = Activity.objects.filter(user=request.user).order_by('-created_at')[:limit]
        
        # Convert to list of dictionaries
        activity_list = []
        for activity in activities:
            activity_list.append({
                'id': activity.id,
                'type': activity.type,
                'description': activity.description,
                'created_at': activity.created_at.isoformat()
            })
    except (LookupError, AppRegistryNotReady, Model.DoesNotExist):
        # If Activity model doesn't exist yet, return empty list
        activity_list = []
    
    return Response(activity_list)