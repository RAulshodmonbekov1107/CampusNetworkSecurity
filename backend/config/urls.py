"""
URL configuration for Campus Network Security Monitoring System.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/network/', include('apps.network.urls')),
    path('api/alerts/', include('apps.alerts.urls')),
    path('api/threats/', include('apps.threats.urls')),
    path('api/system/', include('apps.system.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

