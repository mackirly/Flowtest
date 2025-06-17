from django.urls import re_path, path
from automation.consumers import TestExecutionConsumer, AutomationNotificationConsumer

websocket_urlpatterns = [
    # Automation WebSocket endpoints
    path('ws/automation/execution/<int:project_id>/', TestExecutionConsumer.as_asgi()),
    path('ws/automation/notifications/', AutomationNotificationConsumer.as_asgi()),
]