from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from FlowTestApp.models import CustomUser
from FlowTestApp.serializers import CustomUserSerializer
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from FlowTestApp.views import (
    ProjectViewSet, FolderViewSet, TestCaseViewSet,
    RoleViewSet, CustomUserViewSet, AutomationProjectViewSet,
    TestRunViewSet, SchedulerEventViewSet, ReportTemplateViewSet,
    PermissionViewSet, update_theme,
    TestExecutionView, TestStatusView, CheckTestExistenceView,
    ReportExportView, ReportDetailView, top_contributors
)
from FlowTestApp.analytics_views import (
    analytics, test_cases_creation_stats, tests_over_time,
    results_distribution, priority_distribution, test_flakiness,
    top_contributors
)
from Backend.api.report_views import ReportTemplateViewSet as BackendReportTemplateViewSet
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns # Добавлено
from django.views.static import serve

router = routers.DefaultRouter(trailing_slash=True)
router.register(r'projects', ProjectViewSet)
router.register(r'folders', FolderViewSet)
router.register(r'test-cases', TestCaseViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'permissions', PermissionViewSet)
router.register(r'users', CustomUserViewSet, basename='users')
router.register(r'automation-projects', AutomationProjectViewSet)
router.register(r'test-runs', TestRunViewSet)
router.register(r'scheduler-events', SchedulerEventViewSet)
router.register(r'report-templates', ReportTemplateViewSet)

# Backend report router
backend_router = routers.DefaultRouter(trailing_slash=True)
backend_router.register(r'report-templates', BackendReportTemplateViewSet, basename='backend-report-templates')

# API URL patterns
api_patterns = [
    path('', include(router.urls)),
    path('backend/', include(backend_router.urls)),  # Include backend router with prefix
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('test-execution/', TestExecutionView.as_view(), name='test-execution'),
    path('test-status/', TestStatusView.as_view(), name='test-status'),
    path('check-test-existence/', CheckTestExistenceView.as_view(), name='check-test-existence'),
    
    # Analytics endpoints
    path('analytics/', analytics, name='analytics'),
    path('analytics/test-cases-creation/', test_cases_creation_stats, name='test-cases-creation-stats'),
    path('analytics/tests-over-time/', tests_over_time, name='tests-over-time'),
    path('analytics/results-distribution/', results_distribution, name='results-distribution'),
    path('analytics/priority-distribution/', priority_distribution, name='priority-distribution'),
    path('analytics/test-flakiness/', test_flakiness, name='test-flakiness'),
    path('analytics/top-contributors/', top_contributors, name='top-contributors'),
    
    # Reports
    path('report-export/', ReportExportView.as_view(), name='report-export'),
    path('report-detail/', ReportDetailView.as_view(), name='report-detail'),
    
    # User profile endpoint
    path('users/get_current_user/', CustomUserViewSet.as_view({'get': 'get_current_user'}), name='get_current_user'),
    path('users/theme/', update_theme, name='update_theme'),
]

# Add API prefix
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_patterns)),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]

# Обслуживание медиа-файлов
urlpatterns += [
    path('media/<path:path>', serve, {
        'document_root': settings.MEDIA_ROOT,
        'show_indexes': False
    }),
]

# В режиме разработки добавляем стандартные обработчики для статики и медиа
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += staticfiles_urlpatterns() # Добавлено для обслуживания статики из STATICFILES_DIRS
