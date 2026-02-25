from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User, AuditLog
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User login endpoint."""
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    remember_me = serializer.validated_data.get('remember_me', False)
    
    user = authenticate(username=username, password=password)
    if user is None:
        return Response(
            {'error': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        return Response(
            {'error': 'User account is disabled'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Update last login
    user.last_login = timezone.now()
    user.last_login_ip = get_client_ip(request)
    user.save()
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    
    # Log audit
    AuditLog.objects.create(
        user=user,
        action='login',
        resource_type='auth',
        description=f'User {user.username} logged in',
        ip_address=user.last_login_ip,
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """User registration endpoint."""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Log audit
        AuditLog.objects.create(
            user=user,
            action='create',
            resource_type='user',
            resource_id=str(user.id),
            description=f'New user {user.username} registered',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response(
            {'message': 'User registered successfully', 'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """User logout endpoint."""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        # Log audit
        AuditLog.objects.create(
            user=request.user,
            action='logout',
            resource_type='auth',
            description=f'User {request.user.username} logged out',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user(request):
    """Get current user information."""
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_token(request):
    """Refresh access token."""
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        refresh = RefreshToken(refresh_token)
        return Response({
            'access': str(refresh.access_token),
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List all users (admin only)."""
    from .permissions import IsAdminRole
    perm = IsAdminRole()
    if not perm.has_permission(request, None):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.all().order_by('-created_at')
    return Response(UserSerializer(users, many=True).data)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_user(request, user_id):
    """Update or delete a user (admin only)."""
    from .permissions import IsAdminRole
    perm = IsAdminRole()
    if not perm.has_permission(request, None):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        if target_user.id == request.user.id:
            return Response({'error': 'Cannot delete yourself'}, status=status.HTTP_400_BAD_REQUEST)
        target_user.delete()
        return Response({'message': 'User deleted'})

    # PUT - update
    for field in ('role', 'is_active', 'first_name', 'last_name', 'email', 'department'):
        if field in request.data:
            setattr(target_user, field, request.data[field])
    target_user.save()
    return Response(UserSerializer(target_user).data)


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

