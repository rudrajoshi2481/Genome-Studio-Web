export type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  is_directory: boolean;
  size: number;
  modified: string;
  children?: FileNode[];
  isLoaded?: boolean; // Flag to track if children have been loaded
  isLoading?: boolean; // Flag to track if children are currently being loaded
};

export type FileEvent = {
  type: 'partial_update';
  operation: 'created' | 'modified' | 'deleted';
  path: string;
  node?: FileNode; // Optional because delete operations won't have a node
};

export type NavigationHistory = {
  paths: string[];
  currentIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
};

export type StorageState = {
  expandedNodes: string[];
  recentPaths: string[];
};

export type State = {
  fileTree: FileNode | null;
  expandedNodes: Set<string>;
  isLoading: boolean;
  error: string | null;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  wsError: string | null;
  currentPath: string;
  navigationHistory: NavigationHistory;
  recentPaths: string[];
};

export type Actions = {
  fetchFileTree: (path: string, depth: number) => Promise<void>;
  fetchDirectoryContents: (path: string) => Promise<void>;
  toggleNode: (nodePath: string) => void;
  collapseAll: () => Promise<void>;
  isNodeExpanded: (nodePath: string) => boolean;
  isNodeLoaded: (nodePath: string) => boolean;
  createFile: (directoryPath: string, fileName: string) => Promise<any>;
  deleteItem: (itemPath: string) => Promise<any>;
  createFolder: (directoryPath: string, folderName: string) => Promise<any>;
  reset: () => void;
  handleFileEvent: (event: FileEvent) => void;
  initializeWebSocket: (path: string) => (() => void) | undefined;
  disconnectWebSocket: () => void;
  navigateToPath: (path: string) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  addToRecentPaths: (path: string) => void;
  updateNodeInTree: (path: string, updates: { isLoaded?: boolean; isLoading?: boolean }) => void;
};
