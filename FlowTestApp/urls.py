from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from FlowTestApp.models import CustomUser
from FlowTestApp.serializers import CustomUserSerializer
from . import views

# Custom user creation view
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_custom_user(request):
    """
    Create a custom user
    """
    # Check if user has admin/staff privileges
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({"detail": "You do not have permission to create users."}, 
                     status=status.HTTP_403_FORBIDDEN)
    
    serializer = CustomUserSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

router = DefaultRouter()
router.register(r'test-cases', views.TestCaseViewSet)
router.register(r'folders', views.FolderViewSet)
router.register(r'projects', views.ProjectViewSet)
router.register(r'report-templates', views.ReportTemplateViewSet, basename='report-template')
router.register(r'testruns', views.TestRunViewSet)
router.register(r'users', views.CustomUserViewSet, basename='user')

urlpatterns = [
    # API маршруты
    path('', include(router.urls)),
    
    # Профиль пользователя
    path('profile/', views.get_user_profile, name='user-profile'),
    path('profile/avatar/', views.upload_avatar, name='upload-avatar'),
    
    # Получение текущего пользователя
    path('users/get_current_user/', views.get_user_profile, name='get_current_user'),
    
    # Обновление темы пользователя
    path('users/theme/', views.update_theme, name='update_theme'),
    
    # User management
    path('create-user/', create_custom_user, name='create_custom_user'),
    
    # Статистика
    path('statistics/test-flakiness/<int:project_id>/', views.test_flakiness, name='test_flakiness'),
    path('statistics/test-execution/<int:project_id>/', views.test_execution_stats, name='test_execution_stats'),
    path('statistics/test-cases-creation/<int:project_id>/', views.test_cases_creation_stats, name='test_cases_creation_stats'),
]
