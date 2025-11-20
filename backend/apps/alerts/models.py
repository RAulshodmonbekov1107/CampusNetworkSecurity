from django.db import models
from apps.authentication.models import User


class SecurityAlert(models.Model):
    """Security alert model."""
    
    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive'),
    ]
    
    ALERT_TYPE_CHOICES = [
        ('intrusion', 'Intrusion Attempt'),
        ('malware', 'Malware Detection'),
        ('ddos', 'DDoS Attack'),
        ('port_scan', 'Port Scan'),
        ('brute_force', 'Brute Force'),
        ('suspicious_traffic', 'Suspicious Traffic'),
        ('data_exfiltration', 'Data Exfiltration'),
        ('unauthorized_access', 'Unauthorized Access'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    source_ip = models.GenericIPAddressField()
    destination_ip = models.GenericIPAddressField(blank=True, null=True)
    source_port = models.IntegerField(blank=True, null=True)
    destination_port = models.IntegerField(blank=True, null=True)
    protocol = models.CharField(max_length=10, blank=True, null=True)
    signature = models.CharField(max_length=200, blank=True, null=True)
    rule_id = models.CharField(max_length=100, blank=True, null=True)
    country_code = models.CharField(max_length=2, blank=True, null=True)
    timestamp = models.DateTimeField()
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                       blank=True, related_name='acknowledged_alerts')
    acknowledged_at = models.DateTimeField(blank=True, null=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                   blank=True, related_name='resolved_alerts')
    resolved_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'security_alerts'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['severity', 'timestamp']),
            models.Index(fields=['status', 'timestamp']),
            models.Index(fields=['alert_type', 'timestamp']),
            models.Index(fields=['source_ip', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.severity.upper()}: {self.title} ({self.timestamp})"

