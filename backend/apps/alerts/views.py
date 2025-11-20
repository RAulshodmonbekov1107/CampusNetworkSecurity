from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import SecurityAlert
from .serializers import SecurityAlertSerializer


class SecurityAlertFilter(filters.FilterSet):
    """Filter for security alerts."""
    
    severity = filters.CharFilter(field_name='severity')
    status = filters.CharFilter(field_name='status')
    alert_type = filters.CharFilter(field_name='alert_type')
    start_date = filters.DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    end_date = filters.DateTimeFilter(field_name='timestamp', lookup_expr='lte')
    
    class Meta:
        model = SecurityAlert
        fields = ['severity', 'status', 'alert_type', 'source_ip', 'destination_ip']


class SecurityAlertViewSet(viewsets.ModelViewSet):
    """ViewSet for security alerts."""
    
    queryset = SecurityAlert.objects.all()
    serializer_class = SecurityAlertSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = SecurityAlertFilter
    search_fields = ['title', 'description', 'source_ip', 'destination_ip', 'signature']
    ordering_fields = ['timestamp', 'severity', 'status']
    ordering = ['-timestamp']
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge an alert."""
        alert = self.get_object()
        alert.status = 'acknowledged'
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()
        
        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'alert_updates',
            {
                'type': 'alert_notification',
                'data': {
                    'type': 'alert_acknowledged',
                    'alert_id': alert.id,
                }
            }
        )
        
        return Response(SecurityAlertSerializer(alert).data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve an alert."""
        alert = self.get_object()
        alert.status = 'resolved'
        alert.resolved_by = request.user
        alert.resolved_at = timezone.now()
        if 'notes' in request.data:
            alert.notes = request.data['notes']
        alert.save()
        
        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'alert_updates',
            {
                'type': 'alert_notification',
                'data': {
                    'type': 'alert_resolved',
                    'alert_id': alert.id,
                }
            }
        )
        
        return Response(SecurityAlertSerializer(alert).data)
    
    @action(detail=False, methods=['get'])
    def timeline(self, request):
        """Get alert timeline data."""
        from datetime import timedelta
        now = timezone.now()
        last_7d = now - timedelta(days=7)
        
        alerts = SecurityAlert.objects.filter(timestamp__gte=last_7d).values('timestamp', 'severity').order_by('timestamp')
        
        timeline = []
        for alert in alerts:
            timeline.append({
                'time': alert['timestamp'].isoformat(),
                'severity': alert['severity'],
            })
        
        return Response(timeline)

