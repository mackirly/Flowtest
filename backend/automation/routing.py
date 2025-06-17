"""
WebSocket routing for automation
"""
from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/automation/execution/<int:project_id>/', consumers.TestExecutionConsumer.as_asgi()),
    path('ws/automation/notifications/', consumers.AutomationNotificationConsumer.as_asgi()),
]