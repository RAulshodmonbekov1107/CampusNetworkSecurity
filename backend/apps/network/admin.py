from django.contrib import admin
from .models import NetworkTraffic


@admin.register(NetworkTraffic)
class NetworkTrafficAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'source_ip', 'destination_ip', 'protocol', 'total_bytes', 'connection_state']
    list_filter = ['protocol', 'connection_state', 'timestamp']
    search_fields = ['source_ip', 'destination_ip', 'application']
    readonly_fields = ['created_at']
    date_hierarchy = 'timestamp'

