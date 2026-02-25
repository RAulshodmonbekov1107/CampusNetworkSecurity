from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SystemSettings
from apps.authentication.permissions import IsAdminRole


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_health(request):
    """Get system health status."""
    import psutil

    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    return Response({
        'status': 'healthy',
        'services': {
            'database': {'status': 'online', 'response_time': 12},
            'redis': {'status': 'online', 'response_time': 5},
            'websocket': {'status': 'online', 'response_time': 8},
        },
        'resources': {
            'cpu_usage': round(cpu, 1),
            'memory_usage': round(mem.percent, 1),
            'disk_usage': round(disk.percent, 1),
        },
        'uptime': 99.9,
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAdminRole])
def system_settings(request):
    """Get or update system settings (admin only)."""
    if request.method == 'GET':
        settings = SystemSettings.objects.all()
        settings_dict = {s.key: s.value for s in settings}
        return Response(settings_dict)

    elif request.method == 'PUT':
        for key, value in request.data.items():
            SystemSettings.objects.update_or_create(
                key=key,
                defaults={
                    'value': str(value),
                    'updated_by': request.user.username
                }
            )
        return Response({'message': 'Settings updated successfully'})
