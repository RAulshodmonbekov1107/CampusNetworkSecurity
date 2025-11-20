from django.db import models


class SystemSettings(models.Model):
    """System configuration settings."""
    
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.CharField(max_length=500, blank=True, null=True)
    category = models.CharField(max_length=50, default='general')
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        db_table = 'system_settings'
        ordering = ['category', 'key']
    
    def __str__(self):
        return f"{self.category}.{self.key}"

