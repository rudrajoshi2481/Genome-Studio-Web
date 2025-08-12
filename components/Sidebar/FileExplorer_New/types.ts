/**
 * Type definitions for the new efficient File Explorer
 * Integrates with the new backend at /app/routes/file_explorer_new
 */

// Core file system types matching backend API
export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  modified?: string;
  created?: string;
  permissions?: string;
  children?: FileNode[];
  version?: number;
  checksum?: string;
}

// File tree response from backend
export interface FileTreeResponse {
  tree: FileNode;
  root_path: string;
  total_files: number;
  total_directories: number;
  timestamp: string;
}

// File content response
export interface FileContentResponse {
  content: string;
  path: string;
  size: number;
  modified: string;
  encoding: string;
  version: number;
  checksum: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'welcome' | 'error' | 'file_created' | 'file_deleted' | 'file_renamed' | 'file_updated' | 'file_system_change' | 'ping' | 'pong' | 'subscription_ack' | 'file_init' | 'subscribed' | 'external_change' | 'operation_ack' | 'root_path_set';
  message?: string;
  error?: string;
  file_path?: string;
  path?: string;
  content?: string;
  node?: FileNode;
  old_path?: string;
  new_path?: string;
  connection_id?: string;
  timestamp?: string | number;
  change_type?: 'created' | 'deleted' | 'modified';
  is_dir?: boolean;
  root_path?: string;
}

// File operation types
export interface FileOperation {
  type: 'insert' | 'delete' | 'replace';
  path: string;
  position?: number;
  content?: string;
  length?: number;
  version?: number;
}

// Search filters
export interface SearchFilters {
  file_types?: string[];
  include_content?: boolean;
  case_sensitive?: boolean;
  regex?: boolean;
  max_results?: number;
  extensions?: string[];
  size_min?: number;
  size_max?: number;
  modified_after?: string;
  modified_before?: string;
  content_type?: string;
}

// Search results
export interface SearchResult {
  path: string;
  name: string;
  is_dir: boolean;
  size: number;
  modified: string;
  match_type: 'name' | 'content' | 'path';
  match_snippet?: string;
  score: number;
}

// File explorer state
export interface FileExplorerState {
  // Core state
  rootPath: string;
  currentPath: string;
  fileTree: FileNode | null;
  selectedPaths: Set<string>;
  expandedPaths: Set<string>;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  
  // Real-time sync state
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  wsInstance: any | null; // FileExplorerWebSocketService instance
  subscriptions: Set<string>;
  
  // Performance state
  lastRefresh: number;
  lastTreeUpdate: number;
  cacheExpiry: number;
  pendingOperations: Map<string, FileOperation>;
}

// Component props
export interface FileNodeProps {
  node: FileNode;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string, multiSelect: boolean) => void;
  onOpen: (node: FileNode) => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onContextMenu: (path: string, isDirectory: boolean) => void;
}

// Dialog props
export interface FileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentPath: string;
  onSubmit: (name: string) => void;
}

export interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  node: FileNode | null;
  onSubmit: (newName: string) => void;
}

export interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: FileNode[];
  onConfirm: () => void;
}

// Upload types
export interface UploadProgress {
  fileName: string;
  progress: number;
  bytesUploaded: number;
  totalBytes: number;
  status: 'uploading' | 'completed' | 'error' | 'cancelled';
}

export interface BulkUploadProgress {
  files: UploadProgress[];
  totalFiles: number;
  completedFiles: number;
  overallProgress: number;
  isActive: boolean;
}

// API configuration
export interface ApiConfig {
  baseUrl: string;
  apiPrefix: string;
  timeout: number;
}
