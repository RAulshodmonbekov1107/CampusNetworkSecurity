from django.urls import path
from . import views

urlpatterns = [
    path("protocols/", views.protocol_stats, name="stats_protocols"),
    path("traffic/", views.traffic_stats, name="stats_traffic"),
    path("alerts/", views.alerts_from_es, name="stats_alerts"),
]
