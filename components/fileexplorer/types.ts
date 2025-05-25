export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  is_directory: boolean;
  size: number;
  modified: string;
  children?: FileNode[];
  isLoaded?: boolean; // Indicates if the node's children have been loaded
  isLoading?: boolean; // Indicates if the node's children are currently being loaded
}
