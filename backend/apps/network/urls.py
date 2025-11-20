from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NetworkTrafficViewSet

router = DefaultRouter()
router.register(r'traffic', NetworkTrafficViewSet, basename='network-traffic')

urlpatterns = [
    path('', include(router.urls)),
]

