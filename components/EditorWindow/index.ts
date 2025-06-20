// Main EditorWindow component
export { default as EditorWindow } from './EditorWindow'

// Types
export type { FileWatchMessage, WebSocketConfig } from './types'

// Hooks
export { useWebSocket } from './hooks/useWebSocket'
export { useFileContent } from './hooks/useFileContent'

// Components
export { default as LoadingComponent } from './components/LoadingComponent'
export { default as ErrorComponent } from './components/ErrorComponent'
export { default as EmptyState } from './components/EmptyState'

// Canvas exports
export * from './canvas'
