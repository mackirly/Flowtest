import logging
import json
import time
from uuid import uuid4

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('flowtest')


class RequestLoggingMiddleware:
    """
    Middleware to log request/response data for debugging and monitoring
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Skip logging for static and media requests
        if request.path.startswith(('/static/', '/media/')):
            return self.get_response(request)
        
        # Generate a unique ID for this request
        request_id = str(uuid4())
        request.id = request_id
        
        # Start timing the request
        start_time = time.time()
        
        # Log the request
        self.log_request(request)
        
        # Process the request
        response = self.get_response(request)
        
        # Calculate request duration
        duration = time.time() - start_time
        
        # Log the response
        self.log_response(request, response, duration)
        
        # Add request ID to response headers for debugging
        if settings.DEBUG:
            response['X-Request-ID'] = request_id
        
        return response
    
    def log_request(self, request):
        """
        Log request data
        """
        # Skip logging for health checks and other noisy endpoints
        if request.path.startswith(('/health/', '/ping/')):
            return
        
        # Basic request data
        log_data = {
            'timestamp': timezone.now().isoformat(),
            'request_id': getattr(request, 'id', 'unknown'),
            'method': request.method,
            'path': request.path,
            'query_params': dict(request.GET.items()),
            'remote_addr': self.get_client_ip(request),
            'user': str(request.user) if request.user.is_authenticated else 'anonymous',
        }
        
        # Don't log file uploads or binary data
        content_type = request.META.get('CONTENT_TYPE', '')
        if request.method in ['POST', 'PUT', 'PATCH'] and not content_type.startswith('multipart/form-data'):
            try:
                # For JSON data, log the body (but sanitize sensitive fields)
                if 'application/json' in content_type:
                    body_data = json.loads(request.body.decode('utf-8')) if request.body else {}
                    # Sanitize sensitive fields
                    sanitized_data = self.sanitize_data(body_data)
                    log_data['body'] = sanitized_data
                # For form data, just log field names
                elif 'application/x-www-form-urlencoded' in content_type:
                    log_data['body'] = {k: '...' for k in request.POST.keys()}
            except Exception as e:
                log_data['body_parse_error'] = str(e)
        
        logger.info(f"Request: {json.dumps(log_data)}")
    
    def log_response(self, request, response, duration):
        """
        Log response data
        """
        # Skip logging for health checks and other noisy endpoints
        if request.path.startswith(('/health/', '/ping/')):
            return
        
        # Basic response data
        log_data = {
            'timestamp': timezone.now().isoformat(),
            'request_id': getattr(request, 'id', 'unknown'),
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration': f"{duration:.4f}s",
        }
        
        # Only log response content if it's JSON and we're in debug mode
        if settings.DEBUG and hasattr(response, 'content'):
            content_type = response.get('Content-Type', '')
            if 'application/json' in content_type:
                try:
                    # No need to sanitize here as response data shouldn't contain secrets
                    if isinstance(response.content, bytes):
                        response_data = json.loads(response.content.decode('utf-8'))
                    else:
                        response_data = json.loads(response.content)
                    
                    # Only include basic structure of response for brevity
                    if isinstance(response_data, dict):
                        log_data['response_keys'] = list(response_data.keys())
                        if 'count' in response_data:
                            log_data['response_count'] = response_data['count']
                    elif isinstance(response_data, list):
                        log_data['response_length'] = len(response_data)
                except Exception:
                    pass
        
        level = logging.INFO if response.status_code < 400 else logging.WARNING
        logger.log(level, f"Response: {json.dumps(log_data)}")
    
    def get_client_ip(self, request):
        """
        Get client IP from the request
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def sanitize_data(self, data):
        """
        Remove sensitive data from logged request data
        """
        if not isinstance(data, dict):
            return data
        
        sensitive_fields = [
            'password', 'token', 'access', 'refresh', 'secret',
            'auth', 'key', 'credential', 'private', 'passwd'
        ]
        
        sanitized = {}
        for key, value in data.items():
            # Check for sensitive keys
            sensitive = any(field in key.lower() for field in sensitive_fields)
            
            if sensitive:
                # Replace sensitive data with asterisks
                sanitized[key] = '******'
            elif isinstance(value, dict):
                # Recursively sanitize nested dictionaries
                sanitized[key] = self.sanitize_data(value)
            elif isinstance(value, list) and value and isinstance(value[0], dict):
                # Sanitize lists of dictionaries
                sanitized[key] = [self.sanitize_data(item) if isinstance(item, dict) else item for item in value]
            else:
                sanitized[key] = value
        
        return sanitized