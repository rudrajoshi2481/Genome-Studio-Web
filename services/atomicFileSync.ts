import { host, port } from '@/config/server'

export interface AtomicSyncMessage {
  type: 'connected' | 'file_content' | 'file_updated' | 'node_updated' | 'backend_change' | 'file_saved' | 'error' | 'pong'
  file_path?: string
  content?: string
  node_data?: any
  node_id?: string
  change_type?: string
  checksum?: string
  timestamp?: number
  message?: string
  connection_id?: string
}

export interface AtomicFileSubscription {
  file_path: string
  onFileUpdated?: (content: string, checksum: string, timestamp: number) => void
  onNodeUpdated?: (nodeData: any, timestamp: number) => void
  onBackendChange?: (changeType: string, content?: string, checksum?: string) => void
  onError?: (error: string) => void
}

export class AtomicFileSyncService {
  private static instance: AtomicFileSyncService
  private websocket: WebSocket | null = null
  private subscriptions: Map<string, AtomicFileSubscription> = new Map()
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private token: string | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private fileChecksums: Map<string, string> = new Map()

  private constructor() {}

  public static getInstance(): AtomicFileSyncService {
    if (!AtomicFileSyncService.instance) {
      AtomicFileSyncService.instance = new AtomicFileSyncService()
    }
    return AtomicFileSyncService.instance
  }

  /**
   * Connect to the atomic file sync WebSocket
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
          console.log('Atomic file sync connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.startPingInterval()
          resolve(true)
        }

        this.websocket.onmessage = (event) => {
          try {
            const message: AtomicSyncMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Error parsing atomic sync WebSocket message:', error)
          }
        }

        this.websocket.onclose = (event) => {
          console.log('Atomic file sync disconnected:', event.code)
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
          console.error('Atomic file sync error:', error)
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
      console.error('Error connecting to atomic file sync:', error)
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
    this.fileChecksums.clear()
  }

  /**
   * Subscribe to atomic updates for a specific file
   */
  subscribeToFile(subscription: AtomicFileSubscription): void {
    const { file_path } = subscription
    
    // Store subscription
    this.subscriptions.set(file_path, subscription)

    // Send subscription message to backend
    this.sendMessage({
      type: 'subscribe',
      file_path: file_path
    })

    console.log(`Subscribed to atomic sync for file: ${file_path}`)
  }

  /**
   * Unsubscribe from file updates
   */
  unsubscribeFromFile(filePath: string): void {
    if (this.subscriptions.has(filePath)) {
      this.subscriptions.delete(filePath)
      this.fileChecksums.delete(filePath)
    }

    console.log(`Unsubscribed from atomic sync for file: ${filePath}`)
  }

  /**
   * Atomically update a single node in a .flow file
   */
  updateFlowNode(filePath: string, nodeData: any): void {
    if (!this.isConnected) {
      console.warn('Cannot update node: not connected to atomic sync service')
      return
    }

    this.sendMessage({
      type: 'update_node',
      file_path: filePath,
      node_data: nodeData
    })

    console.log(`Updating node ${nodeData.id} in file: ${filePath}`)
  }

  /**
   * Update entire file content
   */
  updateFileContent(filePath: string, content: string): void {
    if (!this.isConnected) {
      console.warn('Cannot update file: not connected to atomic sync service')
      return
    }

    this.sendMessage({
      type: 'update_file',
      file_path: filePath,
      content: content
    })

    console.log(`Updating file content: ${filePath}`)
  }

  /**
   * Check if a file has been modified externally based on checksum
   */
  hasFileChanged(filePath: string, newChecksum: string): boolean {
    const lastChecksum = this.fileChecksums.get(filePath)
    return lastChecksum !== undefined && lastChecksum !== newChecksum
  }

  /**
   * Update stored checksum for a file
   */
  updateFileChecksum(filePath: string, checksum: string): void {
    this.fileChecksums.set(filePath, checksum)
  }

  /**
   * Send a message to the WebSocket
   */
  private sendMessage(message: any): void {
    if (this.websocket && this.isConnected) {
      try {
        this.websocket.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending atomic sync WebSocket message:', error)
      }
    } else {
      console.warn('Cannot send message: WebSocket not connected')
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: AtomicSyncMessage): void {
    const { type, file_path } = message

    if (type === 'connected') {
      console.log('Atomic file sync connection established:', message.connection_id)
      return
    }

    if (type === 'pong') {
      // Health check response
      return
    }

    if (type === 'error') {
      console.error('Atomic file sync error:', message.message)
      if (file_path && this.subscriptions.has(file_path)) {
        const subscription = this.subscriptions.get(file_path)!
        if (subscription.onError) {
          subscription.onError(message.message || 'Unknown error')
        }
      }
      return
    }

    // Handle file-specific messages
    if (file_path && this.subscriptions.has(file_path)) {
      const subscription = this.subscriptions.get(file_path)!

      switch (type) {
        case 'file_content':
          // Initial file content received
          if (message.content !== undefined && message.checksum) {
            this.updateFileChecksum(file_path, message.checksum)
            if (subscription.onFileUpdated) {
              subscription.onFileUpdated(message.content, message.checksum, message.timestamp || Date.now())
            }
          }
          break

        case 'file_updated':
          // File updated by another client
          if (message.content !== undefined && message.checksum) {
            this.updateFileChecksum(file_path, message.checksum)
            if (subscription.onFileUpdated) {
              subscription.onFileUpdated(message.content, message.checksum, message.timestamp || Date.now())
            }
          }
          break

        case 'node_updated':
          // Single node updated atomically
          if (message.node_data && subscription.onNodeUpdated) {
            subscription.onNodeUpdated(message.node_data, message.timestamp || Date.now())
          }
          break

        case 'backend_change':
          // File changed by backend process
          if (message.checksum) {
            this.updateFileChecksum(file_path, message.checksum)
          }
          if (subscription.onBackendChange) {
            subscription.onBackendChange(
              message.change_type || 'modified',
              message.content,
              message.checksum
            )
          }
          break

        case 'file_saved':
          // File save confirmation
          console.log(`File saved: ${file_path} at ${message.timestamp}`)
          break
      }
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

  /**
   * Get file checksum
   */
  getFileChecksum(filePath: string): string | undefined {
    return this.fileChecksums.get(filePath)
  }
}

export default AtomicFileSyncService
