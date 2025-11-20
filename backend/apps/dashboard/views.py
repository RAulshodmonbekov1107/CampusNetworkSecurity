from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Sum, Q
from apps.network.models import NetworkTraffic
from apps.alerts.models import SecurityAlert
from apps.threats.models import ThreatIntelligence


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics and metrics."""
    
    now = timezone.now()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    
    # Network Traffic Stats
    from django.db.models import F
    total_traffic_24h = NetworkTraffic.objects.filter(timestamp__gte=last_24h).aggregate(
        total_bytes=Sum(F('bytes_sent') + F('bytes_received')),
        total_connections=Count('id')
    )
    
    active_connections = NetworkTraffic.objects.filter(
        timestamp__gte=now - timedelta(minutes=5),
        connection_state='ESTABLISHED'
    ).count()
    
    # Traffic timeline (last 24 hours, hourly)
    traffic_timeline = []
    for i in range(24):
        hour_start = last_24h + timedelta(hours=i)
        hour_end = hour_start + timedelta(hours=1)
        hour_traffic = NetworkTraffic.objects.filter(
            timestamp__gte=hour_start,
            timestamp__lt=hour_end
        ).aggregate(
            bytes=Sum(F('bytes_sent') + F('bytes_received'))
        )['bytes'] or 0
        traffic_timeline.append({
            'time': hour_start.isoformat(),
            'bytes': hour_traffic
        })
    
    # Top Source IPs
    top_ips = NetworkTraffic.objects.filter(timestamp__gte=last_24h).values('source_ip').annotate(
        count=Count('id'),
        total_bytes=Sum(F('bytes_sent') + F('bytes_received'))
    ).order_by('-count')[:5]
    
    # Alerts Stats
    alerts_count = SecurityAlert.objects.filter(timestamp__gte=last_24h).count()
    alerts_by_severity = SecurityAlert.objects.filter(timestamp__gte=last_24h).values('severity').annotate(
        count=Count('id')
    )
    
    recent_alerts = SecurityAlert.objects.filter(timestamp__gte=last_24h).order_by('-timestamp')[:10]
    
    # System Health (mock for now)
    system_health = {
        'status': 'healthy',
        'cpu_usage': 45.2,
        'memory_usage': 62.8,
        'disk_usage': 38.5,
        'network_uptime': 99.9
    }
    
    return Response({
        'metrics': {
            'total_traffic_24h': total_traffic_24h['total_bytes'] or 0,
            'active_connections': active_connections,
            'alerts_count': alerts_count,
            'system_health': system_health,
        },
        'traffic_timeline': traffic_timeline,
        'top_source_ips': list(top_ips),
        'alerts_by_severity': list(alerts_by_severity),
        'recent_alerts': [
            {
                'id': alert.id,
                'title': alert.title,
                'severity': alert.severity,
                'timestamp': alert.timestamp.isoformat(),
                'source_ip': alert.source_ip,
            }
            for alert in recent_alerts
        ],
    })

