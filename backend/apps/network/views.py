from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as dj_filters
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from .models import NetworkTraffic
from .serializers import NetworkTrafficSerializer


class NetworkTrafficFilter(dj_filters.FilterSet):
    """
    Filters for network traffic list endpoints.
    Matches the frontend query params: protocol, source_ip, date_from, date_to.
    """

    date_from = dj_filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = dj_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        model = NetworkTraffic
        fields = ["protocol", "source_ip", "destination_ip", "connection_state", "date_from", "date_to"]


class NetworkTrafficViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for network traffic data."""

    queryset = NetworkTraffic.objects.all()
    serializer_class = NetworkTrafficSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = NetworkTrafficFilter
    search_fields = ["source_ip", "destination_ip", "application"]
    ordering_fields = ["timestamp", "bytes_sent", "bytes_received"]
    ordering = ["-timestamp"]
    
    @action(detail=False, methods=['get'])
    def protocols(self, request):
        """Get protocol distribution."""
        last_24h = timezone.now() - timedelta(hours=24)
        from django.db.models import F
        protocols = NetworkTraffic.objects.filter(
            timestamp__gte=last_24h
        ).values('protocol').annotate(
            count=Count('id'),
            total_bytes=Sum(F('bytes_sent') + F('bytes_received'))
        ).order_by('-total_bytes')
        return Response(list(protocols))
    
    @action(detail=False, methods=['get'])
    def connections(self, request):
        """Get connection statistics."""
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        
        connections = NetworkTraffic.objects.filter(
            timestamp__gte=last_24h
        ).values('connection_state').annotate(
            count=Count('id')
        )
        
        return Response({
            'by_state': list(connections),
            'active': NetworkTraffic.objects.filter(
                timestamp__gte=now - timedelta(minutes=5),
                connection_state='ESTABLISHED'
            ).count(),
        })

