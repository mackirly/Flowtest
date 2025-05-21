from .main_views import (
    UserViewSet,
    RoleViewSet,
    PermissionViewSet,
    CustomTokenObtainPairView,
    RegisterView,
    UserProfileView,
    ChangePasswordView,
    upload_avatar  # The standalone function
)
from .profile import update_profile

__all__ = [
    'UserViewSet',
    'RoleViewSet',
    'PermissionViewSet',
    'CustomTokenObtainPairView',
    'RegisterView',
    'UserProfileView',
    'ChangePasswordView',
    'upload_avatar',
    'update_profile',
]