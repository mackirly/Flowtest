"""
WebSocket consumers for real-time updates
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class TestExecutionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for test execution updates
    """
    
    async def connect(self):
        # Get user from JWT token in query string
        self.user = await self.get_user_from_token()
        
        if isinstance(self.user, AnonymousUser):
            await self.close()
            return
        
        # Get project ID from URL
        self.project_id = self.scope['url_route']['kwargs'].get('project_id')
        self.room_group_name = f'test_execution_{self.project_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial connection message
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to test execution updates'
        }))
    
    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        # Handle incoming messages from WebSocket
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
    
    # Receive message from room group
    async def test_execution_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event['data']))
    
    async def test_execution_status(self, event):
        # Send status update to WebSocket
        await self.send(text_data=json.dumps(event['data']))
    
    async def test_execution_log(self, event):
        # Send log update to WebSocket
        await self.send(text_data=json.dumps(event['data']))
    
    async def repository_sync_update(self, event):
        # Send repository sync update to WebSocket
        await self.send(text_data=json.dumps(event['data']))
    
    @database_sync_to_async
    def get_user_from_token(self):
        """
        Get user from JWT token in query string
        """
        try:
            # Get token from query string
            token = None
            for key, value in self.scope['query_string'].decode().split('&'):
                if '=' in key:
                    k, v = key.split('=')
                    if k == 'token':
                        token = v
                        break
            
            if not token:
                return AnonymousUser()
            
            # Verify token
            access_token = AccessToken(token)
            user = User.objects.get(id=access_token['user_id'])
            return user
            
        except Exception:
            return AnonymousUser()


class AutomationNotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for general automation notifications
    """
    
    async def connect(self):
        # Get user from JWT token
        self.user = await self.get_user_from_token()
        
        if isinstance(self.user, AnonymousUser):
            await self.close()
            return
        
        # User-specific room
        self.room_group_name = f'automation_user_{self.user.id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        # Handle incoming messages
        pass
    
    async def automation_notification(self, event):
        # Send notification to WebSocket
        await self.send(text_data=json.dumps(event['data']))
    
    @database_sync_to_async
    def get_user_from_token(self):
        """
        Get user from JWT token
        """
        try:
            # Similar to TestExecutionConsumer
            token = None
            for key, value in self.scope['query_string'].decode().split('&'):
                if '=' in key:
                    k, v = key.split('=')
                    if k == 'token':
                        token = v
                        break
            
            if not token:
                return AnonymousUser()
            
            access_token = AccessToken(token)
            user = User.objects.get(id=access_token['user_id'])
            return user
            
        except Exception:
            return AnonymousUser()