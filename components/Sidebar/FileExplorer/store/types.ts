// Define types for the file explorer
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
  size?: number;
  modified?: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'system' | 'initial_tree' | 'file_changes' | 'error' | 'file_info';
  message?: string;
  directory?: string;
  tree?: any;
  // For file_changes messages
  changes?: Array<{
    type: 'added' | 'deleted' | 'modified';
    path: string;
    relative_path: string;
  }>;
  // For file_info messages
  path?: string;
  info?: {
    path: string;
    name: string;
    is_dir: boolean;
    size: number;
    modified: string;
  };
}

export interface FileExplorerState {
  fileTree: FileNode | null;
  expandedNodes: Set<string>;
  selectedNode: string | null;
  isLoading: boolean;
  error: string | null;
  currentPath: string;
  recentPaths: string[];
  wsConnection: WebSocket | null;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  wsError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Actions
  connectWebSocket: (path: string) => void;
  disconnectWebSocket: () => void;
  toggleNode: (nodeId: string) => void;
  selectNode: (nodeId: string) => void;
  isNodeExpanded: (nodeId: string) => boolean;
  navigateToPath: (path: string) => void;
  refreshFileTree: () => void;
  handleWebSocketMessage: (event: MessageEvent) => void;
  createFile: (directoryPath: string, fileName: string) => void;
  createFolder: (directoryPath: string, folderName: string) => void;
  deleteItem: (itemPath: string) => void;
}
