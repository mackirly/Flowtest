from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.decorators import api_view, permission_classes, parser_classes
from django.http import HttpRequest
from django.views.decorators.csrf import csrf_exempt

User = get_user_model()

# This function will handle any request to the original problematic endpoint
@csrf_exempt
def user_update_profile_bypass(request):
    """
    This function bypasses the problematic endpoint and redirects to our fixed endpoint
    """
    if request.method in ['OPTIONS']:
        # Handle preflight requests
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, PATCH, DELETE'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        return response
        
    # Create a new request to our fixed endpoint
    print(f"[BYPASS] Intercepting request to problematic endpoint: {request.path}")
    print(f"[BYPASS] Request method: {request.method}")
    print(f"[BYPASS] Request content type: {request.content_type}")
    
    # Extract the data from the request
    if request.method in ['POST', 'PUT', 'PATCH']:
        try:
            # Try to parse JSON data
            if request.content_type == 'application/json':
                import json
                data = json.loads(request.body)
                print(f"[BYPASS] Parsed JSON data: {data}")
                
                # Create a new request to our direct_update_profile
                return direct_update_profile(request)
            else:
                print(f"[BYPASS] Using direct update with content type: {request.content_type}")
                return direct_update_profile(request)
        except Exception as e:
            print(f"[BYPASS] Error parsing request data: {str(e)}")
            # Just pass the request through to direct_update_profile
            return direct_update_profile(request)
    else:
        # For GET requests or other methods
        return direct_update_profile(request)

# Add a debug endpoint to test content types
@api_view(['POST', 'PUT', 'PATCH'])
@permission_classes([AllowAny])  # Allow anyone to use for testing
def debug_api(request):
    """Debug endpoint to test content types and request parsing"""
    content_type = request.content_type
    meta_content_type = request.META.get('CONTENT_TYPE')
    parsers = [p.__class__.__name__ for p in request.parser_context['request']._request.parsers]
    
    return Response({
        'success': True,
        'message': 'Debug information',
        'content_type': content_type,
        'meta_content_type': meta_content_type,
        'request_method': request.method,
        'parsers': parsers,
        'data_received': request.data,
        'query_params': request.query_params,
        'headers': {k: v for k, v in request.META.items() if k.startswith('HTTP_')}
    })

# Now we'll modify our update_profile view to accept multiple content types
@api_view(['PUT', 'PATCH', 'POST'])
@permission_classes([IsAuthenticated])
# DO NOT specify parsers - use the defaults from settings.py
def update_profile(request):
    """
    Update user profile information.
    """
    # Debug information - you'll see this in the container logs
    print(f"[DEBUG] update_profile received Content-Type: {request.content_type}")
    print(f"[DEBUG] update_profile META Content-Type: {request.META.get('CONTENT_TYPE')}")
    print(f"[DEBUG] update_profile request.data: {request.data}")
    print(f"[DEBUG] update_profile request headers: {[k for k, v in request.META.items() if k.startswith('HTTP_')]}")
    
    user = request.user
    
    # Get data from request
    data = request.data
    
    # Update user fields if provided in request
    if 'first_name' in data:
        user.first_name = data['first_name']
    
    if 'last_name' in data:
        user.last_name = data['last_name']
    
    if 'email' in data:
        # Note: In a real app you'd want to validate this and possibly verify the new email
        user.email = data['email']
        
    if 'bio' in data:
        # Assuming User model has a bio field; add it if not present
        if hasattr(user, 'bio'):
            user.bio = data['bio']
    
    # Save the user object
    user.save()
    
    # Return updated user data
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'bio': getattr(user, 'bio', '') if hasattr(user, 'bio') else '',
    }, status=status.HTTP_200_OK)