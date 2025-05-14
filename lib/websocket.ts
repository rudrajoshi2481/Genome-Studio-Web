type WebSocketCallback = (event: MessageEvent) => void;
type WebSocketErrorCallback = (error: Error) => void;

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketCallbacks {
  onMessage?: WebSocketCallback;
  onError?: WebSocketErrorCallback;
  onStatusChange?: (status: WebSocketStatus) => void;
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
    this.url = url;
  }

  private getWebSocketUrl(path?: string): string {
    if (typeof window === 'undefined') return '';

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const pathParam = path ? `?path=${encodeURIComponent(path)}` : '';
    return `${protocol}//${host}:8000/api/files/watch${pathParam}`;
  }

  connect(path: string = '/app') {
    // If we're already connected or connecting to the same path, don't reconnect
    if (this.ws?.readyState === WebSocket.OPEN && this.currentPath === path) {
      return;
    }
    
    this.currentPath = path;
    if (!isClient) return;

    try {
      this.updateStatus('connecting');
      const wsUrl = this.getWebSocketUrl(path);
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      
      if (this.ws) {
        console.log('Closing existing connection before reconnecting');
        this.ws.close();
      }
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          this.handleMessage(event);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason || 'No reason provided');
        if (event.code !== 1000) { // 1000 is normal closure
          this.handleClose();
        } else {
          this.updateStatus('disconnected');
        }
      };

      this.ws.onerror = (event) => {
        // Try to get more information about the error
        const wsUrl = this.getWebSocketUrl(this.currentPath);
        // const error = new Error(`WebSocket connection error. URL: ${wsUrl}. Check if the server is running and the endpoint is available.`);
        // console.error('WebSocket error:', error);
        // this.handleError(error);
      };

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully to:', wsUrl);
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        this.updateStatus('connected');
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to create WebSocket connection:', errorMessage);
      this.handleError(new Error(`WebSocket connection failed: ${errorMessage}`));
    }
  }

  private updateStatus(newStatus: WebSocketStatus) {
    this.status = newStatus;
    this.statusCallbacks.forEach(callback => callback(newStatus));
  }

  private handleMessage(event: MessageEvent) {
    this.messageCallbacks.forEach(callback => callback(event));
  }

  private handleClose() {
    if (this.status === 'disconnected') return; // Don't reconnect if we intentionally disconnected
    
    this.updateStatus('disconnected');
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
      this.reconnectAttempts++;
      console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = setTimeout(() => {
        if (this.currentPath) {
          this.connect(this.currentPath);
        }
      }, delay);
    } else {
      console.log('Max reconnection attempts reached');
      this.updateStatus('error');
      this.handleError(new Error('Failed to establish WebSocket connection after multiple attempts'));
    }
  }

  private handleError(error: Error | Event) {
    const normalizedError = error instanceof Error ? error : new Error('WebSocket error occurred');
    this.updateStatus('error');
    this.errorCallbacks.forEach(callback => callback(normalizedError));
  }

  subscribe(callbacks: WebSocketCallbacks) {
    const unsubscribers: (() => void)[] = [];

    if (callbacks.onMessage) {
      this.messageCallbacks.add(callbacks.onMessage);
      unsubscribers.push(() => this.messageCallbacks.delete(callbacks.onMessage!));
    }

    if (callbacks.onError) {
      this.errorCallbacks.add(callbacks.onError);
      unsubscribers.push(() => this.errorCallbacks.delete(callbacks.onError!));
    }

    if (callbacks.onStatusChange) {
      this.statusCallbacks.add(callbacks.onStatusChange);
      unsubscribers.push(() => this.statusCallbacks.delete(callbacks.onStatusChange!));
    }

    // Immediately notify of current status
    callbacks.onStatusChange?.(this.status);

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.messageCallbacks.clear();
    this.errorCallbacks.clear();
    this.statusCallbacks.clear();
    this.reconnectAttempts = 0;
    this.currentPath = '';
    this.updateStatus('disconnected');
  }
}

export const createWebSocketService = (url: string) => new WebSocketService(url);
