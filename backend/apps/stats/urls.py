from django.urls import path
from . import views

urlpatterns = [
    path("protocols/", views.protocol_stats, name="stats_protocols"),
    path("traffic/", views.traffic_stats, name="stats_traffic"),
    path("alerts/", views.alerts_from_es, name="stats_alerts"),
    path("siem/overview/", views.siem_overview, name="siem_overview"),
    path("siem/alerts/", views.siem_alerts, name="siem_alerts"),
    path("siem/mitre/", views.siem_mitre, name="siem_mitre"),
    path("siem/fim/", views.siem_fim, name="siem_fim"),
]
