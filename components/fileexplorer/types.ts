export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  is_directory: boolean;
  size: number;
  modified: string;
  children?: FileNode[];
}
