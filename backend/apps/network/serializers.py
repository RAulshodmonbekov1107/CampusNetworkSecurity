from rest_framework import serializers
from .models import NetworkTraffic
from apps.threats.services import check_ip_reputation


class NetworkTrafficSerializer(serializers.ModelSerializer):
    """Serializer for network traffic data with reputation enrichment."""

    total_bytes = serializers.ReadOnlyField()
    total_packets = serializers.ReadOnlyField()
    reputation = serializers.SerializerMethodField()

    class Meta:
        model = NetworkTraffic
        fields = '__all__'

    def get_reputation(self, obj):
        """Return abuse reputation + country for the destination IP."""
        if not obj.destination_ip:
            return None
        data = check_ip_reputation(obj.destination_ip)
        return {
            "score": data.get("abuse_confidence_score", 0),
            "country_code": data.get("country_code", ""),
            "isp": data.get("isp", ""),
            "total_reports": data.get("total_reports", 0),
        }
