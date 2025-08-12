/**
 * WebSocket service for real-time file synchronization with global file watcher
 */

import { host, port } from '@/config/server';
import { WebSocketMessage } from '../types';

export type WebSocketEventType = 
  | 'connected' 
  | 'disconnected' 
  | 'error' 
  | 'fileChange'
  | 'file_system_change'
  | 'root_path_set';

export type WebSocketEventHandler = (event: { type: WebSocketEventType; data: any }) => void;

/**
 * Real-time WebSocket service for file synchronization
 */
export class FileExplorerWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private isConnecting: boolean = false;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private connectionId: string | null = null;
  private eventHandlers: { [key in WebSocketEventType]?: WebSocketEventHandler[] } = {};

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.isConnecting = true;
      this.ws = new WebSocket(`${this.url}?token=${encodeURIComponent(this.token)}`);
      
      this.ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        this.isConnecting = false;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          this.emit('error', { error });
        }
      };

      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.isConnecting = false;
      this.emit('error', { error });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.connectionId = null;
    this.isConnected = false;
  }

  /**
   * Send a message through the WebSocket
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }
  
  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    console.log('📨 WebSocket message received:', message);
    
    switch (message.type) {
      case 'welcome':
        console.log('✅ WebSocket connection established');
        this.connectionId = message.connection_id || null;
        this.emit('connected', message);
        break;
        
      case 'file_system_change':
        console.log(`📁 Global file system change: ${message.change_type} - ${message.path}`);
        this.emit('file_system_change', {
          change_type: message.change_type, // 'created', 'deleted', 'modified'
          path: message.path,
          is_dir: message.is_dir,
          timestamp: message.timestamp
        });
        break;
        
      case 'file_created':
      case 'file_deleted':
      case 'file_renamed':
        console.log(`📁 File ${message.type}:`, message.file_path || message.path);
        this.emit('fileChange', {
          type: message.type,
          path: message.file_path || message.path,
          oldPath: message.old_path,
          newPath: message.new_path,
          node: message.node
        });
        break;
        
      case 'root_path_set':
        console.log('🏠 Root path confirmed by backend:', message.root_path);
        this.emit('root_path_set', {
          root_path: message.root_path,
          timestamp: message.timestamp
        });
        break;
        
      case 'error':
        console.error('❌ WebSocket error:', message.error || message.message);
        this.emit('error', message.error || message.message);
        break;
        
      case 'ping':
        // Respond to ping with pong
        this.send({ type: 'pong' });
        break;
        
      default:
        console.log('🔄 Unhandled message type:', message.type);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(event: Event): void {
    console.error('❌ WebSocket error:', event);
    this.isConnecting = false;
    this.emit('error', event);
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(event: CloseEvent): void {
    console.log('🔌 WebSocket connection closed:', event.code, event.reason);
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionId = null;
    this.emit('disconnected', { code: event.code, reason: event.reason });
    
    // Attempt to reconnect if it wasn't a clean close
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('error', 'Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Event emitter methods
   */
  on(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }
    this.eventHandlers[eventType]!.push(handler);
  }

  off(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers[eventType]) {
      return;
    }
    const index = this.eventHandlers[eventType]!.indexOf(handler);
    if (index > -1) {
      this.eventHandlers[eventType]!.splice(index, 1);
    }
  }

  private emit(eventType: WebSocketEventType, data?: any): void {
    const handlers = this.eventHandlers[eventType];
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler({ type: eventType, data });
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; connectionId: string | null } {
    return {
      connected: this.isConnected,
      connectionId: this.connectionId
    };
  }

  /**
   * Get connection ID
   */
  getConnectionId(): string | null {
    return this.connectionId;
  }
}

// Export the class for instantiation
export default FileExplorerWebSocketService;
