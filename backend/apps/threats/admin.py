from django.contrib import admin
from .models import ThreatIntelligence


@admin.register(ThreatIntelligence)
class ThreatIntelligenceAdmin(admin.ModelAdmin):
    list_display = ['ioc_type', 'ioc_value', 'threat_type', 'reputation_score', 'source', 'last_seen', 'is_active']
    list_filter = ['ioc_type', 'threat_type', 'source', 'is_active', 'last_seen']
    search_fields = ['ioc_value', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'last_seen'

