"""
Utility functions for automation
"""
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def send_test_execution_update(project_id, execution_id, status, message=None, progress=None):
    """
    Send test execution update via WebSocket
    """
    channel_layer = get_channel_layer()
    
    data = {
        'type': 'test_execution_status',
        'execution_id': execution_id,
        'status': status,
        'timestamp': datetime.now().isoformat()
    }
    
    if message:
        data['message'] = message
    
    if progress is not None:
        data['progress'] = progress
    
    # Send to project room
    async_to_sync(channel_layer.group_send)(
        f'test_execution_{project_id}',
        {
            'type': 'test_execution_status',
            'data': data
        }
    )


def send_test_execution_log(project_id, execution_id, log_type, log_message):
    """
    Send test execution log update via WebSocket
    """
    channel_layer = get_channel_layer()
    
    data = {
        'type': 'test_execution_log',
        'execution_id': execution_id,
        'log_type': log_type,  # 'stdout', 'stderr', 'info', 'error'
        'message': log_message,
        'timestamp': datetime.now().isoformat()
    }
    
    # Send to project room
    async_to_sync(channel_layer.group_send)(
        f'test_execution_{project_id}',
        {
            'type': 'test_execution_log',
            'data': data
        }
    )


def send_repository_sync_update(project_id, status, message, progress=None):
    """
    Send repository sync update via WebSocket
    """
    channel_layer = get_channel_layer()
    
    data = {
        'type': 'repository_sync_update',
        'project_id': project_id,
        'status': status,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
    
    if progress is not None:
        data['progress'] = progress
    
    # Send to project room
    async_to_sync(channel_layer.group_send)(
        f'test_execution_{project_id}',
        {
            'type': 'repository_sync_update',
            'data': data
        }
    )


def send_user_notification(user_id, notification_type, title, message, data=None):
    """
    Send notification to specific user
    """
    channel_layer = get_channel_layer()
    
    notification_data = {
        'type': 'automation_notification',
        'notification_type': notification_type,
        'title': title,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
    
    if data:
        notification_data['data'] = data
    
    # Send to user room
    async_to_sync(channel_layer.group_send)(
        f'automation_user_{user_id}',
        {
            'type': 'automation_notification',
            'data': notification_data
        }
    )


from datetime import datetime