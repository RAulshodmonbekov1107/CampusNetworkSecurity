from rest_framework import serializers
from .models import ThreatIntelligence


class ThreatIntelligenceSerializer(serializers.ModelSerializer):
    """Serializer for threat intelligence data."""
    
    class Meta:
        model = ThreatIntelligence
        fields = '__all__'

