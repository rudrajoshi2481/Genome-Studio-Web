import { config, DEFAULT_HOST, DEFAULT_PORT } from './config';

type WebSocketCallback = (event: MessageEvent) => void;
type WebSocketErrorCallback = (error: Error) => void;

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketCallbacks {
  onMessage?: WebSocketCallback;
  onError?: WebSocketErrorCallback;
  onStatusChange?: (status: WebSocketStatus) => void;
}

interface WebSocketSubscription {
  unsubscribe: () => void;
}

const isClient = typeof window !== 'undefined';

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private messageCallbacks: Set<WebSocketCallback> = new Set();
  private errorCallbacks: Set<WebSocketErrorCallback> = new Set();
  private statusCallbacks: Set<(status: WebSocketStatus) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;
  private status: WebSocketStatus = 'disconnected';
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentPath: string = '';

  constructor(url: string) {
    this.url = url.replace(/^(ws|wss|http|https):\/\//, '');
  }

  private getWebSocketUrl(path?: string): string {
    if (typeof window === 'undefined') return '';
    const host = config.host || DEFAULT_HOST;
    const port = config.port || DEFAULT_PORT;
    return `ws://${host}:${port}/api/files/watch?path=${encodeURIComponent(path || '/app')}`;
  }

  connect(path: string = '/app') {
    if (this.ws?.readyState === WebSocket.OPEN && this.currentPath === path) {
      console.log('[FileWatch] Already connected to', path);
      return;
    }
    
    this.currentPath = path;
    if (!isClient) return;

    try {
      this.updateStatus('connecting');
      const wsUrl = this.getWebSocketUrl(path);
      console.log('[FileWatch] Connecting to', wsUrl);
      
      if (this.ws) {
        this.ws.close();
      }
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onmessage = (event) => {
        console.log('[FileWatch] Message received from path:', this.currentPath);
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(event);
        } catch (err) {
          this.handleError(new Error('Failed to parse WebSocket message'));
        }
      };

      this.ws.onclose = (event) => {
        if (event.code !== 1000) {
          console.log('[FileWatch] Connection closed unexpectedly. Attempting to reconnect...');
          this.handleClose();
        } else {
          console.log('[FileWatch] Connection closed normally');
          this.updateStatus('disconnected');
        }
      };

      this.ws.onerror = (event) => {
        const wsUrl = this.getWebSocketUrl(this.currentPath);
        const error = new Error(`WebSocket connection error. URL: ${wsUrl}. Check if the server is running and the endpoint is available.`);
        console.error('[FileWatch] Connection error:', {
          error: error.message,
          path: this.currentPath,
          timestamp: new Date().toISOString()
        });
        this.handleError(error);
      };

      this.ws.onopen = () => {
        console.log('[FileWatch] Connected successfully to', this.currentPath);
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to create WebSocket connection:', errorMessage);
      this.handleError(new Error(`WebSocket connection failed: ${errorMessage}`));
    }
  }

  private updateStatus = (newStatus: WebSocketStatus) => {
    this.status = newStatus;
    this.statusCallbacks.forEach(callback => callback(newStatus));
  }

  private handleMessage(event: MessageEvent) {
    // Log raw message for debugging
    console.log('[FileWatch] Raw message received:', event.data);

    try {
      const data = JSON.parse(event.data);
      console.log('[FileWatch] Parsed message:', {
        type: data.type,
        path: data.path,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[FileWatch] Failed to parse message for logging:', err);
    }

    this.messageCallbacks.forEach(callback => callback(event));
  }

  private handleError = (error: Error) => {
    this.errorCallbacks.forEach(callback => callback(error));
  }

  private handleClose = () => {
    this.updateStatus('disconnected');
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const backoffDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[FileWatch] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${backoffDelay}ms...`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect(this.currentPath);
      }, backoffDelay);
    } else {
      this.updateStatus('error');
      console.error('[FileWatch] Max reconnection attempts reached');
    }
  }

  subscribe(callbacks: WebSocketCallbacks): WebSocketSubscription {
    if (callbacks.onMessage) this.messageCallbacks.add(callbacks.onMessage);
    if (callbacks.onError) this.errorCallbacks.add(callbacks.onError);
    if (callbacks.onStatusChange) this.statusCallbacks.add(callbacks.onStatusChange);

    return {
      unsubscribe: () => {
        if (callbacks.onMessage) this.messageCallbacks.delete(callbacks.onMessage);
        if (callbacks.onError) this.errorCallbacks.delete(callbacks.onError);
        if (callbacks.onStatusChange) this.statusCallbacks.delete(callbacks.onStatusChange);
      }
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      console.log('[FileWatch] Disconnecting from', this.currentPath);
      this.ws.close();
      this.ws = null;
    }

    this.messageCallbacks.clear();
    this.errorCallbacks.clear();
    this.statusCallbacks.clear();
    this.updateStatus('disconnected');
  }
}

export const createWebSocketService = (url: string) => new WebSocketService(url);

