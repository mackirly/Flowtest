from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import json

@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser, FormParser, MultiPartParser])
def direct_update_profile(request):
    """
    A simplified endpoint for updating user profile.
    Accepts both JSON and form data.
    """
    user = request.user
    try:
        data = request.data
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                pass

        changed = False
        # Update user fields if provided and not empty
        for field in ['first_name', 'last_name', 'email', 'bio']:
            value = data.get(field)
            if value is not None and value.strip():  # Check if value exists and is not just whitespace
                setattr(user, field, value.strip() if value else '')
                changed = True

        if changed:
            user.save()

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'bio': getattr(user, 'bio', '') if hasattr(user, 'bio') else '',
            'message': 'Profile updated successfully'
        })
    except Exception as e:
        print(f"[ERROR] Error updating profile: {str(e)}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)