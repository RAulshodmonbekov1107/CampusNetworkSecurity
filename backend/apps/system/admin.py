from django.contrib import admin
from .models import SystemSettings


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ['key', 'value', 'category', 'updated_at', 'updated_by']
    list_filter = ['category', 'updated_at']
    search_fields = ['key', 'value', 'description']
    readonly_fields = ['updated_at']

