from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    UserViewSet,
    RoleViewSet,
    PermissionViewSet,
    CustomTokenObtainPairView,
    RegisterView,
    UserProfileView,
    ChangePasswordView,
    upload_avatar
)
from .views.activity import user_activity
from .views.statistics import user_statistics
from .views.profile import update_profile, debug_api, user_update_profile_bypass
from .views.direct_update import direct_update_profile
from .views.activity import user_activity
from .views.statistics import user_statistics

# Create a router for viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'permissions', PermissionViewSet, basename='permission')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # User registration
    path('register/', RegisterView.as_view(), name='register'),
    
    # User profile
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    
    # Change password
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # Upload avatar - dedicated endpoint
    path('upload-avatar/', upload_avatar, name='upload-avatar'),
    
    # Update profile - dedicated endpoint for frontend - REPLACED with bypass
    path('users/update_profile/', user_update_profile_bypass, name='update_profile_bypass'),
    
    # Debug endpoint for testing API functionality
    path('debug/', debug_api, name='debug_api'),
    
    # Direct update profile - guaranteed to work with both JSON and FormData
    path('direct-update-profile/', direct_update_profile, name='direct_update_profile'),
    
    # Activity and statistics endpoints
    path('activity/', user_activity, name='user_activity'),
    path('statistics/', user_statistics, name='user_statistics'),
    
    # Activity and Statistics endpoints
    path('activity/', user_activity, name='user_activity'),
    path('statistics/', user_statistics, name='user_statistics'),
]