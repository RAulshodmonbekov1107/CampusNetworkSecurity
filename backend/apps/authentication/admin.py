from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, AuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'is_active', 'created_at', 'last_login']
    list_filter = ['role', 'is_active', 'is_staff', 'created_at']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone', 'department', 'avatar', 'last_login_ip')}),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'resource_type', 'ip_address', 'created_at']
    list_filter = ['action', 'resource_type', 'created_at']
    search_fields = ['user__username', 'description', 'ip_address']
    readonly_fields = ['user', 'action', 'resource_type', 'resource_id', 'description', 
                      'ip_address', 'user_agent', 'created_at']
    date_hierarchy = 'created_at'

