import type { FileNode } from '../types';

export type FileEvent = {
  event_type: 'created' | 'modified' | 'deleted';
  path: string;
  is_directory: boolean;
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
