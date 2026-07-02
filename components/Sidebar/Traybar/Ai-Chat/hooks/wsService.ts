import { host, port } from '@/config/server';
import { useChatStore } from '../components/chatStore';

interface WebSocketMessage {
  type: string;
  content?: string;
  role?: string;
  conversation_id?: string;
  agent_type?: string;
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  [key: string]: any;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private connectionId: string | null = null;
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Generate unique connection ID
    this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const wsUrl = `ws://${host}:${port}/api/v1/ai-chat/chat/${this.connectionId}`;
    console.log('🔌 [AI-CHAT-WS] Connecting to:', wsUrl);
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected to:', wsUrl);
          this.reconnectAttempts = 0;
          // Re-send Lytic mode if it was active before reconnection
          const { permissionMode } = useChatStore.getState();
          if (permissionMode === 'bypass') {
            this.sendMessage({ type: 'set_permission_mode', mode: 'bypass' });
          }
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            if (message.type === 'canvas_update') {
              console.log('🔍 [WS SERVICE] canvas_update message:', { action: message.action, filePath: message.filePath, hasNode: !!message.node, hasEdge: !!message.edge });
            } else if (message.type === 'complete') {
              console.log('🔍 [WS SERVICE] complete message received');
            } else if (message.type === 'tool_start') {
              console.log('🔍 [WS SERVICE] tool_start:', message.tool_name);
            } else if (message.type === 'tool_execution_complete') {
              console.log('🔍 [WS SERVICE] tool_execution_complete:', message.tool_name);
            }
            if (process.env.NODE_ENV === 'development') {
              console.log('Received WebSocket message:', event.data);
            }
            this.messageHandlers.forEach(handler => handler(message));
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error, event.data);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.ws = null;
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          // Silently handle WebSocket errors - they're usually connection issues
          // that will be handled by the reconnection logic
          if (process.env.NODE_ENV === 'development') {
            console.debug('WebSocket connection issue (will retry):', error);
          }
          // Don't reject here - let onclose handle reconnection
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('WebSocket: Max reconnection attempts reached');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`WebSocket: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      }
      this.connect().catch((error) => {
        // Silently handle reconnection failures
        if (process.env.NODE_ENV === 'development') {
          console.debug('WebSocket reconnection failed:', error);
        }
      });
    }, delay);
  }

  sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Silently handle - WebSocket will reconnect automatically
      if (process.env.NODE_ENV === 'development') {
        console.debug('WebSocket: Cannot send message, not connected (will reconnect)');
      }
    }
  }

  addMessageHandler(handler: (message: WebSocketMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: (message: WebSocketMessage) => void): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
