from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, FolderViewSet, ProjectStatsView, ProjectMembersView

# Create a router for viewsets
router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='project')
router.register(r'(?P<project_id>\d+)/folders', FolderViewSet, basename='folder')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Project stats
    path('<int:project_id>/stats/', ProjectStatsView.as_view(), name='project-stats'),
    
    # Project members
    path('<int:project_id>/members/', ProjectMembersView.as_view(), name='project-members'),
]