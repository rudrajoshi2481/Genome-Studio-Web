import { FileNode } from './utils/FileExplorerClass'

export interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  node: FileNode | null;
  onRename: (newName: string) => void;
}

export interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  node: FileNode | null;
  onDelete: () => void;
}

export interface NewFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentPath: string;
  onCreate: (name: string) => void;
}

export interface NewFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentPath: string;
  onCreate: (name: string) => void;
}

export interface FileNodeProps {
  node: FileNode;
  depth?: number;
  onToggle: (path: string) => void;
  onSelect: (path: string, isMultiSelect: boolean) => void;
  onOpenFile: (node: FileNode) => void;
  isNodeExpanded: (path: string) => boolean;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onContextMenu?: (path: string, isDirectory: boolean) => void;
}
