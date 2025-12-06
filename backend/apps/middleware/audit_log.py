"""
Audit Logging Middleware
Tracks all API requests for compliance and security monitoring.
"""
import json
import time
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser


class AuditLogMiddleware:
    """
    Middleware to log all API requests for audit trail.
    Captures user, IP, endpoint, method, and response status.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Skip logging for static files and admin
        if request.path.startswith('/static/') or request.path.startswith('/admin/'):
            return self.get_response(request)
        
        # Capture request start time
        start_time = time.time()
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Process request
        response = self.get_response(request)
        
        # Calculate response time
        response_time = (time.time() - start_time) * 1000  # in milliseconds
        
        # Log to database (async recommended for production)
        try:
            from apps.authentication.models import AuditLog
            
            # Determine action from method
            action_map = {
                'GET': 'view',
                'POST': 'create',
                'PUT': 'update',
                'PATCH': 'update',
                'DELETE': 'delete',
            }
            action = action_map.get(request.method, 'view')
            
            # Extract resource type from path
            path_parts = request.path.strip('/').split('/')
            resource_type = path_parts[1] if len(path_parts) > 1 else 'unknown'
            
            # Get resource ID if present
            resource_id = path_parts[-1] if len(path_parts) > 2 and path_parts[-1].isdigit() else None
            
            # Create description
            description = f"{request.method} {request.path} - Status: {response.status_code} - Time: {response_time:.2f}ms"
            
            AuditLog.objects.create(
                user=request.user if not isinstance(request.user, AnonymousUser) else None,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                description=description,
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            )
        except Exception as e:
            # Don't fail the request if logging fails
            print(f"Audit log error: {e}")
        
        # Add response time header
        response['X-Response-Time'] = f"{response_time:.2f}ms"
        
        return response
