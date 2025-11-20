from django.contrib import admin
from .models import SecurityAlert


@admin.register(SecurityAlert)
class SecurityAlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'severity', 'status', 'source_ip', 'timestamp', 'alert_type']
    list_filter = ['severity', 'status', 'alert_type', 'timestamp']
    search_fields = ['title', 'description', 'source_ip', 'destination_ip', 'signature']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'timestamp'

