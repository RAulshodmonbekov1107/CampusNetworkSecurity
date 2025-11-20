from django.db import models
from apps.authentication.models import User


class NetworkTraffic(models.Model):
    """Network traffic data model."""
    
    PROTOCOL_CHOICES = [
        ('TCP', 'TCP'),
        ('UDP', 'UDP'),
        ('ICMP', 'ICMP'),
        ('HTTP', 'HTTP'),
        ('HTTPS', 'HTTPS'),
        ('FTP', 'FTP'),
        ('SSH', 'SSH'),
        ('DNS', 'DNS'),
        ('DHCP', 'DHCP'),
    ]
    
    STATE_CHOICES = [
        ('ESTABLISHED', 'Established'),
        ('SYN_SENT', 'Syn Sent'),
        ('SYN_RECV', 'Syn Received'),
        ('FIN_WAIT', 'Fin Wait'),
        ('TIME_WAIT', 'Time Wait'),
        ('CLOSE', 'Close'),
        ('LISTEN', 'Listen'),
    ]
    
    timestamp = models.DateTimeField()
    source_ip = models.GenericIPAddressField()
    destination_ip = models.GenericIPAddressField()
    source_port = models.IntegerField()
    destination_port = models.IntegerField()
    protocol = models.CharField(max_length=10, choices=PROTOCOL_CHOICES)
    bytes_sent = models.BigIntegerField(default=0)
    bytes_received = models.BigIntegerField(default=0)
    packets_sent = models.IntegerField(default=0)
    packets_received = models.IntegerField(default=0)
    connection_state = models.CharField(max_length=20, choices=STATE_CHOICES, default='ESTABLISHED')
    duration = models.FloatField(default=0.0)  # in seconds
    application = models.CharField(max_length=100, blank=True, null=True)
    country_code = models.CharField(max_length=2, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'network_traffic'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['source_ip', 'timestamp']),
            models.Index(fields=['destination_ip', 'timestamp']),
            models.Index(fields=['protocol', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.source_ip}:{self.source_port} -> {self.destination_ip}:{self.destination_port} ({self.protocol})"
    
    @property
    def total_bytes(self):
        return self.bytes_sent + self.bytes_received
    
    @property
    def total_packets(self):
        return self.packets_sent + self.packets_received

