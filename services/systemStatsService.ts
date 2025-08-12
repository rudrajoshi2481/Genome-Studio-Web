import { host, port } from '@/config/server';

export interface SystemStats {
  server_ip: string;
  cpu_usage: number;
  ram_usage: number;
  ram_total: number;
  ram_used: number;
  ram_available: number;
  disk_usage: number;
  disk_total: number;
  disk_used: number;
  disk_free: number;
  uptime: number;
}

export type SystemStatsCallback = (stats: SystemStats) => void;
export type SystemStatsErrorCallback = (error: string) => void;

export class SystemStatsService {
  private static instance: SystemStatsService;
  private baseUrl: string;
  private wsUrl: string;
  private websocket: WebSocket | null = null;
  private callbacks: Set<SystemStatsCallback> = new Set();
  private errorCallbacks: Set<SystemStatsErrorCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private lastStats: SystemStats | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.baseUrl = `http://${host}:${port}`;
    // WebSocket URL will be constructed when needed (client-side only)
    this.wsUrl = '';
  }

  public static getInstance(): SystemStatsService {
    if (!SystemStatsService.instance) {
      SystemStatsService.instance = new SystemStatsService();
    }
    return SystemStatsService.instance;
  }

  /**
   * Get the latest system statistics (from WebSocket cache)
   */
  getSystemStats(): SystemStats | null {
    return this.lastStats;
  }

  /**
   * Subscribe to real-time system stats updates
   */
  subscribe(callback: SystemStatsCallback): () => void {
    this.callbacks.add(callback);
    
    // Send current stats immediately if available
    if (this.lastStats) {
      callback(this.lastStats);
    }
    
    // Connect WebSocket if not already connected
    if (!this.websocket && !this.isConnecting) {
      this.connect();
    }
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
      
      // Disconnect if no more subscribers
      if (this.callbacks.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Subscribe to error notifications
   */
  onError(callback: SystemStatsErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Get WebSocket URL (client-side only)
   */
  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    
    if (!this.wsUrl) {
      // Use wss:// for HTTPS or ws:// for HTTP
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.wsUrl = `${protocol}//${host}:${port}/api/v1/system/ws`;
    }
    
    return this.wsUrl;
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private connect(): void {
    // Only connect on client-side
    if (typeof window === 'undefined') {
      console.warn('SystemStatsService: Cannot connect WebSocket on server-side');
      return;
    }
    
    if (this.isConnecting || this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }
    
    const wsUrl = this.getWebSocketUrl();
    if (!wsUrl) {
      console.error('SystemStatsService: WebSocket URL not available');
      return;
    }
    
    this.isConnecting = true;
    
    try {
      console.log('🔌 Connecting to system stats WebSocket:', wsUrl);
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('✅ System stats WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Start ping/pong to keep connection alive
        this.startPingPong();
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'system_stats' && data.data) {
            this.lastStats = data.data;
            
            // Notify all subscribers
            this.callbacks.forEach(callback => {
              try {
                callback(data.data);
              } catch (error) {
                console.error('Error in system stats callback:', error);
              }
            });
          } else if (data.type === 'error') {
            const errorMessage = data.message || 'Unknown system stats error';
            console.error('System stats error:', errorMessage);
            
            this.errorCallbacks.forEach(callback => {
              try {
                callback(errorMessage);
              } catch (error) {
                console.error('Error in system stats error callback:', error);
              }
            });
          } else if (data.type === 'pong') {
            // Handle pong response (connection is alive) - reduce logging
            // console.log('📡 System stats pong received');
          }
        } catch (error) {
          console.error('Error parsing system stats WebSocket message:', error);
        }
      };
      
      this.websocket.onclose = (event) => {
        console.log('🔌 System stats WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          url: this.wsUrl
        });
        this.isConnecting = false;
        this.stopPingPong();
        
        // Don't reconnect on clean close (code 1000) or auth errors (1008, 1011)
        const shouldReconnect = event.code !== 1000 && 
                               event.code !== 1008 && 
                               event.code !== 1011 &&
                               this.callbacks.size > 0 && 
                               this.reconnectAttempts < this.maxReconnectAttempts;
        
        if (shouldReconnect) {
          this.scheduleReconnect();
        } else if (event.code === 1006) {
          // Connection failed - likely server not running or network issue
          const errorMessage = `System stats server unavailable (${this.getWebSocketUrl()})`;
          this.errorCallbacks.forEach(callback => {
            try {
              callback(errorMessage);
            } catch (err) {
              console.error('Error in system stats error callback:', err);
            }
          });
        }
      };
      
      this.websocket.onerror = (error) => {
        const wsUrl = this.getWebSocketUrl();
        // console.error('❌ System stats WebSocket error:', {
        //   url: wsUrl,
        //   readyState: this.websocket?.readyState,
        //   timestamp: new Date().toISOString()
        // });
        this.isConnecting = false;
        
        const errorMessage = `WebSocket connection failed to ${wsUrl}`;
        this.errorCallbacks.forEach(callback => {
          try {
            callback(errorMessage);
          } catch (err) {
            console.error('Error in system stats error callback:', err);
          }
        });
      };
      
    } catch (error) {
      console.error('Error creating system stats WebSocket:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect WebSocket
   */
  private disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopPingPong();
    
    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnecting');
      this.websocket = null;
    }
    
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30s
    
    console.log(`🔄 Scheduling system stats reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start ping/pong to keep connection alive
   */
  private startPingPong(): void {
    this.stopPingPong();
    
    this.pingInterval = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        try {
          this.websocket.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping/pong interval
   */
  private stopPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Check if system stats service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/system/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('System stats health check failed:', error);
      return false;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    if (!this.websocket) return 'disconnected';
    
    switch (this.websocket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  /**
   * Force reconnect (useful for debugging)
   */
  forceReconnect(): void {
    this.disconnect();
    if (this.callbacks.size > 0) {
      setTimeout(() => this.connect(), 1000);
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format uptime to human readable format
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get color based on usage percentage
   */
  getUsageColor(percentage: number): string {
    if (percentage >= 100) return '#ef4444'; // red-500
    if (percentage >= 80) return '#f59e0b';  // amber-500
    return '#10b981'; // emerald-500
  }

  /**
   * Get usage status text
   */
  getUsageStatus(percentage: number): string {
    if (percentage >= 100) return 'Critical';
    if (percentage >= 80) return 'Warning';
    return 'Normal';
  }
}
