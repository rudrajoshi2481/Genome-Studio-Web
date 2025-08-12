import { host, port } from '@/config/server'

export interface FileSyncMessage {
  type: 'connected' | 'file_content' | 'file_updated' | 'file_changed' | 'file_saved' | 'error' | 'pong'
  file_path?: string
  content?: string
  timestamp?: number
  change_type?: string
  old_path?: string
  message?: string
  connection_id?: string
}

export interface FileSubscription {
  file_path: string
  callback: (message: FileSyncMessage) => void
}

export class RealtimeFileSyncService {
  private static instance: RealtimeFileSyncService
  private websocket: WebSocket | null = null
  private subscriptions: Map<string, Set<(message: FileSyncMessage) => void>> = new Map()
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private token: string | null = null
  private pingInterval: NodeJS.Timeout | null = null

  private constructor() {}

  public static getInstance(): RealtimeFileSyncService {
    if (!RealtimeFileSyncService.instance) {
      RealtimeFileSyncService.instance = new RealtimeFileSyncService()
    }
    return RealtimeFileSyncService.instance
  }

  /**
   * Connect to the real-time file sync WebSocket
   */
  async connect(token: string): Promise<boolean> {
    if (this.isConnected && this.websocket) {
      return true
    }

    this.token = token

    try {
      const wsUrl = `ws://${host}:${port}/api/v1/file-explorer-new/ws/file-sync?token=${encodeURIComponent(token)}`
      this.websocket = new WebSocket(wsUrl)

      return new Promise((resolve) => {
        if (!this.websocket) {
          resolve(false)
          return
        }

        this.websocket.onopen = () => {
          console.log('Real-time file sync connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.startPingInterval()
          resolve(true)
        }

        this.websocket.onmessage = (event) => {
          try {
            const message: FileSyncMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.websocket.onclose = (event) => {
          console.log('Real-time file sync disconnected:', event.code)
          this.isConnected = false
          this.stopPingInterval()
          
          // Attempt to reconnect if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++
              if (this.token) {
                this.connect(this.token)
              }
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }

        this.websocket.onerror = (error) => {
          console.error('Real-time file sync error:', error)
          resolve(false)
        }

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            resolve(false)
          }
        }, 5000)
      })
    } catch (error) {
      console.error('Error connecting to real-time file sync:', error)
      return false
    }
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.stopPingInterval()
    
    if (this.websocket) {
      this.websocket.close(1000)
      this.websocket = null
    }
    
    this.isConnected = false
    this.subscriptions.clear()
  }

  /**
   * Subscribe to real-time updates for a specific file
   */
  subscribeToFile(filePath: string, callback: (message: FileSyncMessage) => void): void {
    // Add callback to subscriptions
    if (!this.subscriptions.has(filePath)) {
      this.subscriptions.set(filePath, new Set())
    }
    this.subscriptions.get(filePath)!.add(callback)

    // Send subscription message to backend
    this.sendMessage({
      type: 'subscribe',
      file_path: filePath
    })

    console.log(`Subscribed to file: ${filePath}`)
  }

  /**
   * Unsubscribe from file updates
   */
  unsubscribeFromFile(filePath: string, callback?: (message: FileSyncMessage) => void): void {
    if (this.subscriptions.has(filePath)) {
      if (callback) {
        this.subscriptions.get(filePath)!.delete(callback)
        
        // If no more callbacks, remove the file subscription
        if (this.subscriptions.get(filePath)!.size === 0) {
          this.subscriptions.delete(filePath)
          this.sendMessage({
            type: 'unsubscribe',
            file_path: filePath
          })
        }
      } else {
        // Remove all callbacks for this file
        this.subscriptions.delete(filePath)
        this.sendMessage({
          type: 'unsubscribe',
          file_path: filePath
        })
      }
    }

    console.log(`Unsubscribed from file: ${filePath}`)
  }

  /**
   * Update file content and broadcast to other clients
   */
  updateFile(filePath: string, content: string): void {
    this.sendMessage({
      type: 'update_file',
      file_path: filePath,
      content: content
    })
  }

  /**
   * Send a message to the WebSocket
   */
  private sendMessage(message: any): void {
    if (this.websocket && this.isConnected) {
      try {
        this.websocket.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
      }
    } else {
      console.warn('Cannot send message: WebSocket not connected')
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: FileSyncMessage): void {
    const { type, file_path } = message

    if (type === 'connected') {
      console.log('File sync connection established:', message.connection_id)
      return
    }

    if (type === 'pong') {
      // Health check response
      return
    }

    if (type === 'error') {
      console.error('File sync error:', message.message)
      return
    }

    // Handle file-specific messages
    if (file_path && this.subscriptions.has(file_path)) {
      const callbacks = this.subscriptions.get(file_path)!
      callbacks.forEach(callback => {
        try {
          callback(message)
        } catch (error) {
          console.error('Error in file sync callback:', error)
        }
      })
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.sendMessage({ type: 'ping' })
    }, 30000) // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Get connection status
   */
  isConnectedToSync(): boolean {
    return this.isConnected
  }

  /**
   * Get list of currently subscribed files
   */
  getSubscribedFiles(): string[] {
    return Array.from(this.subscriptions.keys())
  }
}

export default RealtimeFileSyncService
