from django.urls import re_path

# Import consumers from apps
# These will be imported as the apps are developed
# from testcases.consumers import TestCaseConsumer
# from automation.consumers import AutomationConsumer

websocket_urlpatterns = [
    # These patterns will be added as the WebSocket consumers are implemented
    # re_path(r'ws/testcases/(?P<project_id>\w+)/$', TestCaseConsumer.as_asgi()),
    # re_path(r'ws/automation/(?P<project_id>\w+)/$', AutomationConsumer.as_asgi()),
]