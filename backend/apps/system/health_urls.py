"""
Health Check URLs
"""
from django.urls import path
from apps.system import health

urlpatterns = [
    path('', health.health_check, name='health-check'),
    path('ready/', health.readiness_check, name='readiness-check'),
    path('live/', health.liveness_check, name='liveness-check'),
]
