from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import ThreatIntelligence
from .serializers import ThreatIntelligenceSerializer


class ThreatIntelligenceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for threat intelligence data."""
    
    queryset = ThreatIntelligence.objects.filter(is_active=True)
    serializer_class = ThreatIntelligenceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['ioc_type', 'threat_type', 'country_code']
    search_fields = ['ioc_value', 'description']
    ordering_fields = ['reputation_score', 'last_seen', 'first_seen']
    ordering = ['-reputation_score', '-last_seen']
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search threats by IP, domain, or hash."""
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter required'}, status=400)
        
        threats = ThreatIntelligence.objects.filter(
            ioc_value__icontains=query
        ).order_by('-reputation_score')
        
        serializer = self.get_serializer(threats, many=True)
        return Response(serializer.data)

