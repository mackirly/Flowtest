from django.contrib.auth import get_user_model, update_session_auth_hash
from django.db.models import Q
from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action, api_view, parser_classes, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample

from .models import Role, Permission, CustomUser
from .serializers import (
    UserSerializer, 
    UserProfileSerializer,
    RoleSerializer, 
    PermissionSerializer,
    CustomTokenObtainPairSerializer,
    RegistrationSerializer
)
from .permissions import (
    IsAdminUser, 
    HasUserManagementPermission,
    IsSelf
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token view with extended user data"""
    serializer_class = CustomTokenObtainPairSerializer
    
    @extend_schema(
        description="Obtain JWT token with user credentials",
        request=CustomTokenObtainPairSerializer,
        responses={200: {"type": "object", "properties": {
            "access": {"type": "string", "description": "JWT access token"},
            "refresh": {"type": "string", "description": "JWT refresh token"},
            "user": {"type": "object", "description": "Basic user information"}
        }}}
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


@extend_schema_view(
    list=extend_schema(
        description="List all users",
        parameters=[
            OpenApiParameter(name="search", type=str, description="Search users by username, email, first name, or last name"),
            OpenApiParameter(name="role", type=int, description="Filter users by role ID"),
            OpenApiParameter(name="is_active", type=bool, description="Filter users by active status")
        ]
    ),
    retrieve=extend_schema(description="Get a specific user by ID"),
    create=extend_schema(description="Create a new user"),
    update=extend_schema(description="Update a user"),
    partial_update=extend_schema(description="Partially update a user"),
    destroy=extend_schema(description="Delete a user"),
)
class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for handling user operations"""
    serializer_class = UserSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        """Filter queryset based on user role and permissions"""
        user = self.request.user
        queryset = User.objects.all().order_by('username')
        
        # Apply filters
        search = self.request.query_params.get('search', None)
        role_id = self.request.query_params.get('role', None)
        is_active = self.request.query_params.get('is_active', None)
        
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        if role_id:
            queryset = queryset.filter(role_id=role_id)
            
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        
        # Limit non-admins to themselves
        if not (user.is_superuser or (user.role and user.role.is_admin_role) or user.has_permission('manage_users')):
            queryset = queryset.filter(id=user.id)
        
        return queryset
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action == 'list':
            permission_classes = [permissions.IsAuthenticated, HasUserManagementPermission]
        elif self.action == 'retrieve':
            permission_classes = [permissions.IsAuthenticated, IsSelf | HasUserManagementPermission]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, HasUserManagementPermission]
        elif self.action in ['me', 'change_password', 'update_profile', 'upload_avatar']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
            
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        """Create a new user"""
        password = self.request.data.get('password')
        user = serializer.save()
        if password:
            user.set_password(password)
            user.save()
    
    def perform_update(self, serializer):
        """Update an existing user"""
        password = self.request.data.get('password')
        user = serializer.save()
        if password:
            user.set_password(password)
            user.save()
    
    @extend_schema(
        description="Get current user information",
        responses={200: UserProfileSerializer}
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    
    @extend_schema(
        description="Change user password",
        request={
            "type": "object",
            "properties": {
                "current_password": {"type": "string"},
                "new_password": {"type": "string"}
            },
            "required": ["current_password", "new_password"]
        },
        responses={
            200: {"type": "object", "properties": {"message": {"type": "string"}}},
            400: {"type": "object", "properties": {"error": {"type": "string"}}}
        }
    )
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change password for the current user"""
        user = request.user
        
        # Validate request data
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response(
                {'error': 'Both current and new password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check current password
        if not user.check_password(current_password):
            return Response(
                {'error': 'Current password is incorrect'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update password
        user.set_password(new_password)
        user.save()
        
        # Update session to prevent logout
        update_session_auth_hash(request, user)
        
        # Generate new tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Password changed successfully',
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    
    @extend_schema(
        description="Update user profile",
        request=UserProfileSerializer,
        responses={200: UserProfileSerializer}
    )
    @action(detail=False, methods=['patch'], parser_classes=[JSONParser])
    def update_profile(self, request):
        """Update the current user's profile"""
        user = request.user
        serializer = UserProfileSerializer(
            user, 
            data=request.data, 
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        description="Upload user avatar",
        request={"type": "object", "properties": {"avatar": {"type": "string", "format": "binary"}}},
        responses={200: UserProfileSerializer}
    )
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_avatar(self, request):
        """Upload or change user avatar"""
        user = request.user
        
        if 'avatar' not in request.FILES:
            return Response(
                {'error': 'No avatar file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store current avatar path to delete after update
        if user.avatar:
            user._current_avatar = user.avatar.path
            
        # Update avatar
        user.avatar = request.FILES['avatar']
        user.save()
        
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        description="List all roles",
        parameters=[
            OpenApiParameter(name="is_admin", type=bool, description="Filter roles by admin status")
        ]
    ),
    retrieve=extend_schema(description="Get a specific role by ID"),
    create=extend_schema(description="Create a new role"),
    update=extend_schema(description="Update a role"),
    partial_update=extend_schema(description="Partially update a role"),
    destroy=extend_schema(description="Delete a role"),
)
class RoleViewSet(viewsets.ModelViewSet):
    """ViewSet for handling role operations"""
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasUserManagementPermission]
    
    def get_queryset(self):
        """Get filtered queryset"""
        queryset = Role.objects.all().order_by('name')
        
        # Apply filters
        is_admin = self.request.query_params.get('is_admin', None)
        
        if is_admin is not None:
            is_admin_bool = is_admin.lower() == 'true'
            queryset = queryset.filter(is_admin_role=is_admin_bool)
            
        return queryset
    
    @extend_schema(
        description="Assign permissions to a role",
        request={"type": "object", "properties": {"permission_ids": {"type": "array", "items": {"type": "integer"}}}},
        responses={200: RoleSerializer}
    )
    @action(detail=True, methods=['post'])
    def assign_permissions(self, request, pk=None):
        """Assign permissions to a role"""
        role = self.get_object()
        permission_ids = request.data.get('permission_ids', [])
        
        # Clear existing and assign new permissions
        role.permissions.clear()
        
        # Add new permissions
        for permission_id in permission_ids:
            try:
                permission = Permission.objects.get(id=permission_id)
                role.permissions.add(permission)
            except Permission.DoesNotExist:
                pass
        
        serializer = self.get_serializer(role)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        description="List all permissions",
        parameters=[
            OpenApiParameter(name="category", type=str, description="Filter permissions by category")
        ]
    ),
    retrieve=extend_schema(description="Get a specific permission by ID"),
)
class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for handling permission operations (read-only)"""
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated, HasUserManagementPermission]
    
    def get_queryset(self):
        """Get filtered queryset"""
        queryset = Permission.objects.all().order_by('category', 'name')
        
        # Apply filters
        category = self.request.query_params.get('category', None)
        
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset
    
    @extend_schema(
        description="Group permissions by category",
        responses={200: {"type": "object", "additionalProperties": {"type": "array", "items": PermissionSerializer}}}
    )
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Group permissions by category"""
        categories = {}
        
        for permission in self.get_queryset():
            if permission.category not in categories:
                categories[permission.category] = []
            
            categories[permission.category].append(
                PermissionSerializer(permission).data
            )
        
        return Response(categories)


class RegisterView(generics.CreateAPIView):
    """User registration view"""
    queryset = User.objects.all()
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        description="Register a new user account",
        request=RegistrationSerializer,
        responses={201: UserSerializer}
    )
    def post(self, request, *args, **kwargs):
        """Register a new user"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Return user data but not with RegistrationSerializer to exclude password fields
        user_data = UserSerializer(user).data
        
        return Response(user_data, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile view for current user"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_object(self):
        """Get the current user"""
        return self.request.user


class ChangePasswordView(generics.GenericAPIView):
    """View for changing user password"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        description="Change user password",
        request={
            "type": "object",
            "properties": {
                "current_password": {"type": "string"},
                "new_password": {"type": "string"}
            },
            "required": ["current_password", "new_password"]
        },
        responses={
            200: {"type": "object", "properties": {"message": {"type": "string"}}},
            400: {"type": "object", "properties": {"error": {"type": "string"}}}
        }
    )
    def post(self, request):
        """Change password for the current user"""
        user = request.user
        
        # Validate request data
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response(
                {'error': 'Both current and new password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check current password
        if not user.check_password(current_password):
            return Response(
                {'error': 'Current password is incorrect'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update password
        user.set_password(new_password)
        user.save()
        
        # Update session to prevent logout
        update_session_auth_hash(request, user)
        
        # Generate new tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Password changed successfully',
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([permissions.IsAuthenticated])
@extend_schema(
    description="Upload user avatar",
    request={"type": "object", "properties": {"avatar": {"type": "string", "format": "binary"}}},
    responses={200: UserProfileSerializer}
)
def upload_avatar(request):
    """
    Dedicated endpoint for uploading or changing user avatar.
    This function reuses the logic from UserViewSet.upload_avatar method.
    """
    user = request.user
    
    if 'avatar' not in request.FILES:
        return Response(
            {'error': 'No avatar file provided'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Store current avatar path to delete after update
    if user.avatar:
        user._current_avatar = user.avatar.path
    
    # Update avatar
    user.avatar = request.FILES['avatar']
    user.save()
    
    # Return updated user profile including the avatar URL
    serializer = UserProfileSerializer(user, context={'request': request})
    return Response(serializer.data)