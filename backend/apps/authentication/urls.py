from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('logout/', views.logout, name='logout'),
    path('user/', views.get_user, name='get_user'),
    path('refresh/', views.refresh_token, name='refresh_token'),
    path('users/', views.list_users, name='list_users'),
    path('users/<int:user_id>/', views.manage_user, name='manage_user'),
]

