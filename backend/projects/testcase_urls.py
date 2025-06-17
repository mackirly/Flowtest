from django.urls import path, include
from rest_framework.routers import DefaultRouter
from testcases.views import TestCaseViewSet

# Router for test cases under specific project
router = DefaultRouter()
router.register(r'test-cases', TestCaseViewSet, basename='project-testcase')

urlpatterns = router.urls