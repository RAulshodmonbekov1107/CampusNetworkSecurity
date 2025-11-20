from rest_framework import serializers
from .models import NetworkTraffic


class NetworkTrafficSerializer(serializers.ModelSerializer):
    """Serializer for network traffic data."""
    
    total_bytes = serializers.ReadOnlyField()
    total_packets = serializers.ReadOnlyField()
    
    class Meta:
        model = NetworkTraffic
        fields = '__all__'

