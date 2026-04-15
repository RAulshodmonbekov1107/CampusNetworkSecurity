from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SystemSettings
from .health import check_database, check_cache, check_elasticsearch
from apps.authentication.permissions import IsAdminRole


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_health(request):
    """Get system health status."""
    import psutil
    import time

    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    t0 = time.monotonic()
    db_result = check_database()
    db_ms = round((time.monotonic() - t0) * 1000)

    t0 = time.monotonic()
    cache_result = check_cache()
    cache_ms = round((time.monotonic() - t0) * 1000)

    t0 = time.monotonic()
    es_result = check_elasticsearch()
    es_ms = round((time.monotonic() - t0) * 1000)

    def _to_online(health_status):
        return 'online' if health_status == 'healthy' else 'offline'

    all_healthy = all(
        r.get('status') == 'healthy'
        for r in (db_result, cache_result, es_result)
    )
    overall_status = 'healthy' if all_healthy else 'degraded'

    return Response({
        'status': overall_status,
        'services': {
            'database': {'status': _to_online(db_result['status']), 'response_time': db_ms},
            'redis': {'status': _to_online(cache_result['status']), 'response_time': cache_ms},
            'elasticsearch': {'status': _to_online(es_result['status']), 'response_time': es_ms},
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
