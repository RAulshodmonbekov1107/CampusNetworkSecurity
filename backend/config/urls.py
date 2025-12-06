"""
URL configuration for Campus Network Security Monitoring System.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Swagger/OpenAPI Documentation
schema_view = get_schema_view(
    openapi.Info(
        title="Campus Network Security API",
        default_version='v1',
        description="Professional API for Campus Network Security Monitoring System",
        terms_of_service="https://www.example.com/terms/",
        contact=openapi.Contact(email="admin@campussecurity.local"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/schema/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    
    # Health Checks
    path('api/health/', include('apps.system.health_urls')),
    
    # Monitoring
    path('', include('django_prometheus.urls')),
    
    # API Endpoints
    path('api/auth/', include('apps.authentication.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/network/', include('apps.network.urls')),
    path('api/alerts/', include('apps.alerts.urls')),
    path('api/threats/', include('apps.threats.urls')),
    path('api/system/', include('apps.system.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
