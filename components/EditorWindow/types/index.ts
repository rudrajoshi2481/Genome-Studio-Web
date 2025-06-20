// Types for EditorWindow components
export interface FileWatchMessage {
  type: string
  changes?: Array<{
    path: string
    type: 'modified' | 'created' | 'deleted'
  }>
}

export interface WebSocketConfig {
  reconnectIntervals: number[]
  maxReconnectAttempts: number
  websocketTimeout: number
}
