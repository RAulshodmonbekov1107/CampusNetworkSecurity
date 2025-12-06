"""
Custom Exception Handler
Provides consistent error responses across the API.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # If response is None, it's an unhandled exception
    if response is None:
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return Response(
            {
                'error': 'Internal server error',
                'detail': str(exc) if settings.DEBUG else 'An error occurred',
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Customize the response format
    custom_response_data = {
        'error': response.data.get('detail', 'An error occurred'),
        'status_code': response.status_code
    }
    
    # Add field errors if present
    if isinstance(response.data, dict):
        if 'detail' not in response.data:
            custom_response_data['errors'] = response.data
    
    response.data = custom_response_data
    
    return response
