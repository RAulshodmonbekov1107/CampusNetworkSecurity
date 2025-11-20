from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import SystemSettings


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_health(request):
    """Get system health status."""
    # Mock system health data
    return Response({
        'status': 'healthy',
        'services': {
            'database': {'status': 'online', 'response_time': 12},
            'redis': {'status': 'online', 'response_time': 5},
            'websocket': {'status': 'online', 'response_time': 8},
        },
        'resources': {
            'cpu_usage': 45.2,
            'memory_usage': 62.8,
            'disk_usage': 38.5,
        },
        'uptime': 99.9,
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def system_settings(request):
    """Get or update system settings."""
    if request.method == 'GET':
        settings = SystemSettings.objects.all()
        settings_dict = {s.key: s.value for s in settings}
        return Response(settings_dict)
    
    elif request.method == 'PUT':
        # Update settings
        for key, value in request.data.items():
            SystemSettings.objects.update_or_create(
                key=key,
                defaults={
                    'value': str(value),
                    'updated_by': request.user.username
                }
            )
        return Response({'message': 'Settings updated successfully'})

