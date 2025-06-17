from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TestCaseViewSet,
    TestRunViewSet,
    TestReportViewSet,
    TestEventViewSet,
    RegressionRunViewSet,
    ManualTestRunViewSet
)

# Create a router for viewsets
router = DefaultRouter()
router.register(r'', TestCaseViewSet, basename='testcase')
router.register(r'runs', TestRunViewSet, basename='testrun')
router.register(r'reports', TestReportViewSet, basename='testreport')
router.register(r'events', TestEventViewSet, basename='testevent')
router.register(r'regression-runs', RegressionRunViewSet, basename='regressionrun')
router.register(r'manual-runs', ManualTestRunViewSet, basename='manualrun')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
]