from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomChartViewSet,
    ReportTemplateViewSet,
    GeneratedReportViewSet,
    ReportsMetricsView,
    ReportsChartDataView,
    ExportReportView
)

router = DefaultRouter()
router.register(r'projects/(?P<project_id>\d+)/charts', CustomChartViewSet, basename='chart')
router.register(r'projects/(?P<project_id>\d+)/report-templates', ReportTemplateViewSet, basename='report-template')
router.register(r'projects/(?P<project_id>\d+)/reports', GeneratedReportViewSet, basename='report')

urlpatterns = [
    path('', include(router.urls)),
    path('metrics/', ReportsMetricsView.as_view(), name='reports-metrics'),
    path('chart-data/', ReportsChartDataView.as_view(), name='reports-chart-data'),
    path('export/', ExportReportView.as_view(), name='reports-export'),
]