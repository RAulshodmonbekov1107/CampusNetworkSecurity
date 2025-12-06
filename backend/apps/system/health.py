"""
Health Check System
Monitors the health of all system components.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.db import connection
from django.utils import timezone
import redis
import psutil
import os


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Comprehensive health check endpoint.
    Returns the status of all system components.
    """
    checks = {
        'database': check_database(),
        'cache': check_cache(),
        'disk': check_disk_space(),
        'memory': check_memory(),
    }
    
    # Add optional checks
    try:
        checks['elasticsearch'] = check_elasticsearch()
    except:
        checks['elasticsearch'] = {'status': 'unavailable', 'message': 'Not configured'}
    
    # Determine overall status
    all_healthy = all(check.get('status') == 'healthy' for check in checks.values())
    overall_status = 'healthy' if all_healthy else 'degraded'
    
    response_data = {
        'status': overall_status,
        'timestamp': timezone.now().isoformat(),
        'checks': checks
    }
    
    http_status = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response(response_data, status=http_status)


def check_database():
    """Check database connectivity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return {
            'status': 'healthy',
            'message': 'Database connection successful'
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'message': f'Database error: {str(e)}'
        }


def check_cache():
    """Check Redis cache connectivity."""
    try:
        cache.set('health_check', 'ok', 10)
        value = cache.get('health_check')
        if value == 'ok':
            return {
                'status': 'healthy',
                'message': 'Cache connection successful'
            }
        else:
            return {
                'status': 'unhealthy',
                'message': 'Cache read/write failed'
            }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'message': f'Cache error: {str(e)}'
        }


def check_elasticsearch():
    """Check Elasticsearch connectivity."""
    try:
        from apps.system.elasticsearch_client import get_es_client
        es = get_es_client()
        info = es.info()
        return {
            'status': 'healthy',
            'message': 'Elasticsearch connection successful',
            'version': info.get('version', {}).get('number', 'unknown')
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'message': f'Elasticsearch error: {str(e)}'
        }


def check_disk_space():
    """Check available disk space."""
    try:
        disk = psutil.disk_usage('/')
        percent_used = disk.percent
        
        if percent_used > 90:
            status_str = 'critical'
        elif percent_used > 80:
            status_str = 'warning'
        else:
            status_str = 'healthy'
        
        return {
            'status': status_str,
            'message': f'Disk usage: {percent_used}%',
            'percent_used': percent_used,
            'free_gb': round(disk.free / (1024**3), 2)
        }
    except Exception as e:
        return {
            'status': 'unknown',
            'message': f'Disk check error: {str(e)}'
        }


def check_memory():
    """Check memory usage."""
    try:
        memory = psutil.virtual_memory()
        percent_used = memory.percent
        
        if percent_used > 90:
            status_str = 'critical'
        elif percent_used > 80:
            status_str = 'warning'
        else:
            status_str = 'healthy'
        
        return {
            'status': status_str,
            'message': f'Memory usage: {percent_used}%',
            'percent_used': percent_used,
            'available_gb': round(memory.available / (1024**3), 2)
        }
    except Exception as e:
        return {
            'status': 'unknown',
            'message': f'Memory check error: {str(e)}'
        }


@api_view(['GET'])
@permission_classes([AllowAny])
def readiness_check(request):
    """
    Readiness check for Kubernetes/container orchestration.
    Returns 200 if the service is ready to accept traffic.
    """
    # Check critical components only
    db_check = check_database()
    cache_check = check_cache()
    
    if db_check['status'] == 'healthy' and cache_check['status'] == 'healthy':
        return Response({'status': 'ready'}, status=status.HTTP_200_OK)
    else:
        return Response({'status': 'not ready'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
@permission_classes([AllowAny])
def liveness_check(request):
    """
    Liveness check for Kubernetes/container orchestration.
    Returns 200 if the service is alive (even if degraded).
    """
    return Response({'status': 'alive'}, status=status.HTTP_200_OK)
