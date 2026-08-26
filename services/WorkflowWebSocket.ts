/**
 * WorkflowWebSocket Service
 * Manages WebSocket connection for real-time workflow execution updates.
 * Handles log_stream, output_stream, status_update, and progress_update messages.
 */

import { getHost, getPort } from '@/config/server';
import { useAuthStore } from '@/lib/stores/auth-store';

export interface LogStreamMessage {
  type: 'log_stream';
  execution_id: string;
  node_id: string;
  log: {
    timestamp: string;
    level: string;
    message: string;
    source: string;
  };
  timestamp: string;
}

export interface OutputStreamMessage {
  type: 'output_stream';
  execution_id: string;
  node_id: string;
  output: {
    type: string;
    mime_type?: string;
    html?: string;
    text?: string;
    order?: number;
    output_type?: string;
    viewconf?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface StatusUpdateMessage {
  type: 'status_update';
  execution_id: string;
  status: string;
  node_id?: string;
  error_message?: string;
  error_traceback?: string;
  timestamp: string;
}

export interface ProgressUpdateMessage {
  type: 'progress_update';
  execution_id: string;
  progress_percentage: number;
  nodes_completed: number;
  total_nodes: number;
  timestamp: string;
}

export type WorkflowWebSocketMessage = LogStreamMessage | OutputStreamMessage | StatusUpdateMessage | ProgressUpdateMessage;

export interface WorkflowWebSocketHandlers {
  onLog?: (msg: LogStreamMessage) => void;
  onOutput?: (msg: OutputStreamMessage) => void;
  onStatus?: (msg: StatusUpdateMessage) => void;
  onProgress?: (msg: ProgressUpdateMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export class WorkflowWebSocketService {
  private ws: WebSocket | null = null;
  private clientId: string;
  private subscriptions: Map<string, WorkflowWebSocketHandlers> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private shouldReconnect = false;
  private pendingSubscriptions: string[] = [];

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Connect to the workflow WebSocket endpoint (shared connection)
   */
  connect(handlers?: WorkflowWebSocketHandlers): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        handlers?.onConnect?.();
      }
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    const token = useAuthStore.getState().token;
    const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${getHost()}:${getPort()}/api/v1/workflow-manager-new/ws/${this.clientId}${token ? `?token=${token}` : ''}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('WorkflowWebSocket: Connecting to', wsUrl);
    }
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('WorkflowWebSocket: Connected');
      }
      this.isConnecting = false;
      this.startPing();
      this.subscriptions.forEach((_, execId) => {
        this.subscriptions.get(execId)?.onConnect?.();
      });
      
      // Send all pending subscriptions
      for (const execId of this.pendingSubscriptions) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('WorkflowWebSocket: Sending pending subscription:', execId);
        }
        this.ws?.send(JSON.stringify({
          type: 'subscribe_workflow',
          workflow_id: execId
        }));
      }
      this.pendingSubscriptions = [];
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WorkflowWebSocketMessage = JSON.parse(event.data);
        const execId = (msg as { execution_id?: string }).execution_id;
        // Route to specific handler if we have a subscription for this execution
        const handlers = execId ? this.subscriptions.get(execId) : null;
        switch (msg.type) {
          case 'log_stream':
            handlers?.onLog?.(msg as LogStreamMessage);
            break;
          case 'output_stream':
            handlers?.onOutput?.(msg as OutputStreamMessage);
            break;
          case 'status_update':
            handlers?.onStatus?.(msg as StatusUpdateMessage);
            break;
          case 'progress_update':
            handlers?.onProgress?.(msg as ProgressUpdateMessage);
            break;
          default:
            if (process.env.NODE_ENV === 'development') {
              console.debug('WorkflowWebSocket: Unknown message type:', (msg as { type: string }).type);
            }
        }
      } catch (e) {
        console.error('WorkflowWebSocket: Failed to parse message:', e);
      }
    };

    this.ws.onerror = (error: Event) => {
      console.error('❌ WorkflowWebSocket: Error:', error);
      this.isConnecting = false;
      this.subscriptions.forEach((h) => h.onError?.(error));
    };

    this.ws.onclose = () => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('WorkflowWebSocket: Disconnected');
      }
      this.isConnecting = false;
      this.stopPing();
      this.subscriptions.forEach((h) => h.onDisconnect?.());

      if (this.shouldReconnect) {
        // Re-queue all current subscriptions for reconnect
        this.pendingSubscriptions = Array.from(this.subscriptions.keys());
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };
  }

  /**
   * Subscribe to updates for a specific execution ID
   */
  subscribeToExecution(executionId: string, handlers: WorkflowWebSocketHandlers): void {
    this.subscriptions.set(executionId, handlers);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe_workflow',
        workflow_id: executionId
      }));
      if (process.env.NODE_ENV === 'development') {
        console.debug('WorkflowWebSocket: Subscribed to execution:', executionId);
      }
    } else {
      // Queue subscription - will be sent when WebSocket opens
      if (!this.pendingSubscriptions.includes(executionId)) {
        this.pendingSubscriptions.push(executionId);
      }
      // Ensure connection is being established
      this.connect(handlers);
      if (process.env.NODE_ENV === 'development') {
        console.debug('WorkflowWebSocket: Queued subscription for execution:', executionId, '(WebSocket not open yet)');
      }
    }
  }

  /**
   * Unsubscribe from a specific execution ID
   */
  unsubscribeFromExecution(executionId: string): void {
    this.subscriptions.delete(executionId);
    this.pendingSubscriptions = this.pendingSubscriptions.filter(id => id !== executionId);

    // If no more subscriptions, disconnect
    if (this.subscriptions.size === 0) {
      this.disconnect();
    }
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPing();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
    this.pendingSubscriptions = [];
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

export const workflowWebSocket = new WorkflowWebSocketService();
