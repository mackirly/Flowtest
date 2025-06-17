// WebSocket service for real-time updates
export class WebSocketService {
    constructor() {
        this.connections = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 1; // Уменьшаем количество попыток
        this.reconnectDelay = 3000;
        this.enableWebSocket = false; // Флаг для отключения WebSocket
    }

    connect(channel, projectId = null) {
        // Проверяем, включен ли WebSocket
        if (!this.enableWebSocket) {
            console.log('[WebSocket] WebSocket disabled, skipping connection');
            return null;
        }
        
        const token = localStorage.getItem('flowtest_access_token');
        if (!token) {
            console.error('No auth token found');
            return null;
        }

        let wsUrl;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;

        switch (channel) {
            case 'test_execution':
                if (!projectId) {
                    console.error('Project ID required for test execution channel');
                    return null;
                }
                wsUrl = `${protocol}//${host}/ws/automation/execution/${projectId}/?token=${token}`;
                break;
            case 'notifications':
                wsUrl = `${protocol}//${host}/ws/automation/notifications/?token=${token}`;
                break;
            default:
                console.error('Unknown WebSocket channel:', channel);
                return null;
        }

        // Close existing connection if any
        if (this.connections.has(channel)) {
            this.disconnect(channel);
        }

        const ws = new WebSocket(wsUrl);
        const connection = {
            socket: ws,
            channel: channel,
            projectId: projectId,
            handlers: new Map(),
            isConnected: false
        };

        this.connections.set(channel, connection);

        // Setup WebSocket event handlers
        ws.onopen = () => {
            console.log(`WebSocket connected to ${channel}`);
            connection.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Trigger onConnect handlers
            if (connection.handlers.has('connect')) {
                connection.handlers.get('connect').forEach(handler => handler());
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log(`WebSocket message on ${channel}:`, data);
                
                // Trigger message handlers based on type
                const messageType = data.type;
                if (connection.handlers.has(messageType)) {
                    connection.handlers.get(messageType).forEach(handler => handler(data));
                }
                
                // Trigger generic message handlers
                if (connection.handlers.has('message')) {
                    connection.handlers.get('message').forEach(handler => handler(data));
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error on ${channel}:`, error);
            
            // Trigger error handlers
            if (connection.handlers.has('error')) {
                connection.handlers.get('error').forEach(handler => handler(error));
            }
        };

        ws.onclose = (event) => {
            console.log(`WebSocket closed on ${channel}:`, event);
            connection.isConnected = false;
            
            // Trigger close handlers
            if (connection.handlers.has('close')) {
                connection.handlers.get('close').forEach(handler => handler(event));
            }
            
            // Attempt reconnection if not a normal closure
            if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Attempting to reconnect ${channel} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                
                setTimeout(() => {
                    this.connect(channel, projectId);
                }, this.reconnectDelay * this.reconnectAttempts);
            }
        };

        return connection;
    }

    disconnect(channel) {
        const connection = this.connections.get(channel);
        if (connection && connection.socket) {
            connection.socket.close();
            this.connections.delete(channel);
        }
    }

    disconnectAll() {
        this.connections.forEach((connection, channel) => {
            this.disconnect(channel);
        });
    }

    on(channel, event, handler) {
        const connection = this.connections.get(channel);
        if (!connection) {
            console.error(`No connection found for channel: ${channel}`);
            return;
        }

        if (!connection.handlers.has(event)) {
            connection.handlers.set(event, []);
        }
        
        connection.handlers.get(event).push(handler);
    }

    off(channel, event, handler) {
        const connection = this.connections.get(channel);
        if (!connection || !connection.handlers.has(event)) {
            return;
        }

        const handlers = connection.handlers.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    send(channel, data) {
        const connection = this.connections.get(channel);
        if (!connection || !connection.socket || connection.socket.readyState !== WebSocket.OPEN) {
            console.error(`Cannot send message - WebSocket not connected for channel: ${channel}`);
            return false;
        }

        try {
            connection.socket.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            return false;
        }
    }

    // Convenience method for sending ping
    ping(channel) {
        return this.send(channel, {
            type: 'ping',
            timestamp: Date.now()
        });
    }

    isConnected(channel) {
        const connection = this.connections.get(channel);
        return connection && connection.isConnected;
    }
}

// Create singleton instance
export const wsService = new WebSocketService();