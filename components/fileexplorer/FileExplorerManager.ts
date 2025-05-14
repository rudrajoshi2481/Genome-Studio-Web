interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

class FileExplorerManager {
  private fileTree: FileNode;
  private expandedNodes: Set<string>;

  constructor(initialData: FileNode = dummyFileTree) {
    this.fileTree = initialData;
    this.expandedNodes = new Set<string>();
  }

  getFileTree(): FileNode {
    return this.fileTree;
  }

  toggleNode(nodeId: string): void {
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }
  }

  isNodeExpanded(nodeId: string): boolean {
    return this.expandedNodes.has(nodeId);
  }

  findNode(nodeId: string, tree: FileNode = this.fileTree): FileNode | null {
    if (tree.id === nodeId) {
      return tree;
    }

    if (tree.children) {
      for (const child of tree.children) {
        const found = this.findNode(nodeId, child);
        if (found) return found;
      }
    }

    return null;
  }

  // Example dummy data that can be replaced with server data later
  static readonly dummyFileTree: FileNode = {
    id: 'root',
    name: 'root',
    type: 'folder',
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        children: [
          {
            id: 'components',
            name: 'components',
            type: 'folder',
            children: [
              { id: 'app.tsx', name: 'app.tsx', type: 'file' },
              { id: 'index.tsx', name: 'index.tsx', type: 'file' }
            ]
          }
        ]
      },
      { id: 'readme.md', name: 'readme.md', type: 'file' }
    ]
  };
}

export const dummyFileTree = FileExplorerManager.dummyFileTree;
export type { FileNode };
export default FileExplorerManager;
