"""
URL configuration for Campus Network Security Monitoring System.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions

# Swagger/OpenAPI Documentation (optional)
try:
    from drf_yasg.views import get_schema_view
    from drf_yasg import openapi
except ImportError:  # drf_yasg not installed
    get_schema_view = None
    openapi = None

if get_schema_view and openapi:
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
else:
    schema_view = None

# Optional Prometheus monitoring
try:
    import django_prometheus.urls  # noqa: F401
    PROMETHEUS_ENABLED = True
except ImportError:
    PROMETHEUS_ENABLED = False

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Health Checks
    path('api/health/', include('apps.system.health_urls')),

    # API Endpoints
    path('api/auth/', include('apps.authentication.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/network/', include('apps.network.urls')),
    path('api/alerts/', include('apps.alerts.urls')),
    path('api/threats/', include('apps.threats.urls')),
    path('api/system/', include('apps.system.urls')),
    path('api/stats/', include('apps.stats.urls')),
]

if schema_view:
    urlpatterns += [
        path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
        path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
        path('api/schema/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    ]

if PROMETHEUS_ENABLED:
    urlpatterns += [
        path('', include('django_prometheus.urls')),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
