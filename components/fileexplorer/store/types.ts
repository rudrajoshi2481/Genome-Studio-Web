export type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  is_directory: boolean;
  size: number;
  modified: string;
  children?: FileNode[];
};

export type FileEvent = {
  type: 'partial_update';
  operation: 'created' | 'modified' | 'deleted';
  path: string;
  node?: FileNode; // Optional because delete operations won't have a node
};

export type StorageState = {
  expandedNodes: string[];
};

export type State = {
  fileTree: FileNode | null;
  expandedNodes: Set<string>;
  isLoading: boolean;
  error: string | null;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  wsError: string | null;
};

export type Actions = {
  fetchFileTree: (path: string, depth: number) => Promise<void>;
  toggleNode: (nodePath: string) => void;
  isNodeExpanded: (nodePath: string) => boolean;
  reset: () => void;
  handleFileEvent: (event: FileEvent) => void;
  initializeWebSocket: (path: string) => (() => void) | undefined;
  disconnectWebSocket: () => void;
};
