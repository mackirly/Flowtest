from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AutomationProjectViewSet,
    AutomationTestViewSet,
    TestScheduleViewSet,
    TestExecutionViewSet
)

router = DefaultRouter()

# Project-specific automation endpoints
router.register(r'projects/(?P<project_id>\d+)/automation', AutomationProjectViewSet, basename='automation-project')
router.register(
    r'projects/(?P<project_id>\d+)/automations/(?P<automation_project_id>\d+)/tests', 
    AutomationTestViewSet, 
    basename='automation-test'
)
router.register(r'projects/(?P<project_id>\d+)/schedules', TestScheduleViewSet, basename='test-schedule')
router.register(r'projects/(?P<project_id>\d+)/executions', TestExecutionViewSet, basename='test-execution')

# Global automation endpoints for settings
router.register(r'projects', AutomationProjectViewSet, basename='global-automation-project')

urlpatterns = [
    path('', include(router.urls)),
]