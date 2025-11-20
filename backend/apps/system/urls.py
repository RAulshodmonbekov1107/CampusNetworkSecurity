from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.system_health, name='system_health'),
    path('settings/', views.system_settings, name='system_settings'),
]

