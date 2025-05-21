from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AutomationProjectViewSet,
    AutomationTestViewSet,
    TestScheduleViewSet,
    TestExecutionViewSet
)

router = DefaultRouter()
router.register(r'projects/(?P<project_id>\d+)/automations', AutomationProjectViewSet, basename='automation-project')
router.register(
    r'projects/(?P<project_id>\d+)/automations/(?P<automation_project_id>\d+)/tests', 
    AutomationTestViewSet, 
    basename='automation-test'
)
router.register(r'projects/(?P<project_id>\d+)/schedules', TestScheduleViewSet, basename='test-schedule')
router.register(r'projects/(?P<project_id>\d+)/executions', TestExecutionViewSet, basename='test-execution')

urlpatterns = [
    path('', include(router.urls)),
]