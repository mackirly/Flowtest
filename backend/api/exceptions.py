from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status
from django.utils.translation import gettext_lazy as _


class ServiceUnavailableException(APIException):
    """
    Exception raised when a service is unavailable (e.g. database connection error)
    """
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = _('Service temporarily unavailable, please try again later.')
    default_code = 'service_unavailable'


class ResourceNotFoundException(APIException):
    """
    Exception raised when a requested resource is not found
    """
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = _('The requested resource was not found.')
    default_code = 'not_found'


class ValidationException(APIException):
    """
    Exception raised when validation fails
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = _('Invalid data provided.')
    default_code = 'invalid'


class PermissionDeniedException(APIException):
    """
    Exception raised when permission is denied
    """
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = _('You do not have permission to perform this action.')
    default_code = 'permission_denied'


class AuthenticationFailedException(APIException):
    """
    Exception raised when authentication fails
    """
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = _('Authentication failed.')
    default_code = 'authentication_failed'


def custom_exception_handler(exc, context):
    """
    Custom exception handler that ensures consistent error responses
    """
    # Call the default exception handler first
    response = exception_handler(exc, context)
    
    # If response is not defined, use the default exception handling
    if response is None:
        return response
    
    # Customize the response format
    if isinstance(response.data, dict):
        # Format dictionary response
        error_data = {
            'error': {
                'status_code': response.status_code,
                'message': response.data.get('detail', str(response.data)),
                'code': getattr(exc, 'default_code', 'error')
            }
        }
        
        # Include validation errors if present
        field_errors = {}
        for field, errors in response.data.items():
            if field != 'detail':
                if isinstance(errors, list):
                    field_errors[field] = errors
                else:
                    field_errors[field] = [str(errors)]
        
        if field_errors:
            error_data['error']['field_errors'] = field_errors
            
        response.data = error_data
    else:
        # Format list or other response
        response.data = {
            'error': {
                'status_code': response.status_code,
                'message': str(response.data),
                'code': getattr(exc, 'default_code', 'error')
            }
        }
    
    return response