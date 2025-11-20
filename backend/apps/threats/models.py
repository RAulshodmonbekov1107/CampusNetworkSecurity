from django.db import models


class ThreatIntelligence(models.Model):
    """Threat intelligence data model."""
    
    IOC_TYPE_CHOICES = [
        ('ip', 'IP Address'),
        ('domain', 'Domain'),
        ('url', 'URL'),
        ('hash', 'File Hash'),
        ('email', 'Email Address'),
    ]
    
    THREAT_TYPE_CHOICES = [
        ('malware', 'Malware'),
        ('phishing', 'Phishing'),
        ('botnet', 'Botnet'),
        ('c2', 'Command & Control'),
        ('exploit', 'Exploit'),
        ('ransomware', 'Ransomware'),
        ('trojan', 'Trojan'),
        ('spyware', 'Spyware'),
    ]
    
    ioc_type = models.CharField(max_length=20, choices=IOC_TYPE_CHOICES)
    ioc_value = models.CharField(max_length=500)
    threat_type = models.CharField(max_length=50, choices=THREAT_TYPE_CHOICES)
    description = models.TextField()
    reputation_score = models.IntegerField(default=0)  # 0-100, higher = more malicious
    source = models.CharField(max_length=100)  # e.g., 'VirusTotal', 'MISP', 'Custom'
    first_seen = models.DateTimeField()
    last_seen = models.DateTimeField()
    country_code = models.CharField(max_length=2, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'threat_intelligence'
        ordering = ['-reputation_score', '-last_seen']
        indexes = [
            models.Index(fields=['ioc_type', 'ioc_value']),
            models.Index(fields=['threat_type', 'reputation_score']),
            models.Index(fields=['is_active', 'last_seen']),
        ]
        unique_together = [['ioc_type', 'ioc_value']]
    
    def __str__(self):
        return f"{self.ioc_type.upper()}: {self.ioc_value} ({self.threat_type})"

