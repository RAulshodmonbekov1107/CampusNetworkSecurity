from rest_framework import serializers
from .models import SecurityAlert
from apps.authentication.serializers import UserSerializer


class SecurityAlertSerializer(serializers.ModelSerializer):
    """Serializer for security alerts."""
    
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.username', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.username', read_only=True)
    
    class Meta:
        model = SecurityAlert
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

