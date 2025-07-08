// # this is tree class

// Types definition
export interface FileNode {
  path: string;
  name: string;
  is_dir: boolean;
  size: number;
  modified: string;
  children?: FileNode[];
  parent?: string | null;
  expanded?: boolean;
  selected?: boolean;
  active?: boolean;
  // Type property to determine if it's a file or directory
  type?: 'file' | 'directory';
}

export interface FileChangeEvent {
  type: "file_changes";
  directory: string;
  changes: Array<{
    type: "added" | "modified" | "deleted";
    path: string;
    relative_path: string;
  }>;
}

export interface InitialTreeEvent {
  directory: string;
  tree: FileNode;
}

export type FileExplorerEvent = FileChangeEvent | InitialTreeEvent;

export interface FileExplorerState {
  rootPath: string;
  nodes: Map<string, FileNode>;
  selectedPaths: Set<string>;
  activePath: string | null;
  expandedPaths: Set<string>;
}

export class FileExplorer {
  private state: FileExplorerState;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(rootPath: string = '/') {
    this.state = {
      rootPath,
      nodes: new Map(),
      selectedPaths: new Set(),
      activePath: null,
      expandedPaths: new Set()
    };
  }
  
  // Set root path
  setRootPath(path: string): void {
    console.log(`FileExplorer: Setting root path from ${this.state.rootPath} to ${path}`);
    this.state.rootPath = path;
    // Clear existing nodes if changing root path
    if (this.state.nodes.size > 0) {
      this.state.nodes.clear();
      this.state.selectedPaths.clear();
      this.state.expandedPaths.clear();
      this.state.activePath = null;
    }
  }

  // Initialize the file tree from server data
  initializeTree(data: InitialTreeEvent): void {
    this.state.rootPath = data.directory;
    this.state.nodes.clear();
    this.state.selectedPaths.clear();
    this.state.activePath = null;
    this.state.expandedPaths.clear();

    this._buildTreeFromNode(data.tree, null);
    this.emit('tree-initialized', this.getTreeStructure());
  }

  // Build tree recursively and populate hash map
  private _buildTreeFromNode(node: FileNode, parentPath: string | null): void {
    // Skip Vim temporary files like '4913'
    if (node.name === '4913' || node.path.endsWith('/4913')) {
      console.log(`Skipping Vim temporary file in file explorer: ${node.path}`);
      return;
    }
    
    const processedNode: FileNode = {
      ...node,
      parent: parentPath,
      expanded: false,
      selected: false,
      active: false
    };

    this.state.nodes.set(node.path, processedNode);

    if (node.children) {
      for (const child of node.children) {
        this._buildTreeFromNode(child, node.path);
      }
    }
  }

  // Is this a Vim temporary file that should be ignored?
  private isVimTempFile(path: string): boolean {
    // Ignore Vim temporary files like '4913' and swap files
    return path.endsWith('/4913') || 
           path === '4913' || 
           path.includes('.swp') || 
           path.includes('.swx') || 
           path.endsWith('~');
  }

  // Handle real-time file changes
  handleFileChanges(event: FileChangeEvent): void {
    // Create a Set to track processed changes in this batch
    const processedChanges = new Set<string>();
    // Process each change
    for (const change of event.changes) {
      // Skip Vim temporary files
      if (this.isVimTempFile(change.path)) {
        console.log(`FileExplorer: Skipping Vim temporary file: ${change.path}`);
        continue;
      }
      // Create a unique key for this change
      const changeKey = `${change.type}-${change.path}`;
      
      // Skip if we've already processed this change in this batch
      if (processedChanges.has(changeKey)) {
        console.log('Skipping duplicate change:', changeKey);
        continue;
      }
      
      processedChanges.add(changeKey);
      console.log('Processing change:', change.type, change.path);
      
      switch (change.type) {
        case 'added':
          this._handleFileAdded(change.path, change.relative_path, event.directory);
          break;
        case 'modified':
          this._handleFileModified(change.path);
          break;
        case 'deleted':
          this._handleFileDeleted(change.path);
          break;
      }
    }
    
    // Emit event with updated tree structure
    this.emit('tree-updated', this.getTreeStructure());
  }

  private _handleFileAdded(fullPath: string, relativePath: string, baseDir: string): void {
    const pathParts = relativePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.length > 1 
      ? `${baseDir}/${pathParts.slice(0, -1).join('/')}`
      : baseDir;

    // Check if node already exists
    if (this.state.nodes.has(fullPath)) {
      console.log('Node already exists, updating:', fullPath);
      // Update the modified timestamp of the existing node
      const existingNode = this.state.nodes.get(fullPath)!;
      existingNode.modified = new Date().toISOString();
      return;
    }

    // Create the new node
    const newNode: FileNode = {
      path: fullPath,
      name: fileName,
      is_dir: this._isDirectory(fileName),
      size: 0,
      modified: new Date().toISOString(),
      parent: parentPath,
      expanded: false,
      selected: false,
      active: false
    };

    this.state.nodes.set(fullPath, newNode);

    // Update parent's children array
    const parentNode = this.state.nodes.get(parentPath);
    if (parentNode) {
      if (!parentNode.children) {
        parentNode.children = [];
      }
      
      // Check if child already exists in parent's children array
      const existingChildIndex = parentNode.children.findIndex(child => child.path === fullPath);
      if (existingChildIndex !== -1) {
        // Replace the existing child with the new node
        parentNode.children[existingChildIndex] = newNode;
      } else {
        // Add to parent's children
        parentNode.children.push(newNode);
      }
      
      // Always sort children consistently after any change
      this._sortNodeChildren(parentNode);
    }
  }

  private _handleFileModified(path: string): void {
    const node = this.state.nodes.get(path);
    if (node) {
      node.modified = new Date().toISOString();
    }
  }

  // Helper method to consistently sort node children (directories first, then alphabetical)
  private _sortNodeChildren(node: FileNode): void {
    if (node.children) {
      node.children.sort((a, b) => {
        // If one is a directory and the other isn't, directories come first
        if (a.is_dir !== b.is_dir) {
          return a.is_dir ? -1 : 1;
        }
        // Otherwise sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
    }
  }

  private _handleFileDeleted(path: string): void {
    const node = this.state.nodes.get(path);
    if (!node) return;

    // Remove from parent's children
    if (node.parent) {
      const parentNode = this.state.nodes.get(node.parent);
      if (parentNode && parentNode.children) {
        parentNode.children = parentNode.children.filter(child => child.path !== path);
      }
    }

    // Remove all descendants if it's a directory
    if (node.is_dir) {
      const toDelete = Array.from(this.state.nodes.keys()).filter(p => p.startsWith(path + '/'));
      toDelete.forEach(p => this.state.nodes.delete(p));
    }

    // Clean up state
    this.state.nodes.delete(path);
    this.state.selectedPaths.delete(path);
    this.state.expandedPaths.delete(path);
    if (this.state.activePath === path) {
      this.state.activePath = null;
    }
  }

  // Toggle node expansion
  toggleExpanded(path: string): void {
    console.log(`Toggling node expansion for: ${path}`);
    const isExpanded = this.state.expandedPaths.has(path);
    
    if (isExpanded) {
      console.log(`Collapsing node: ${path}`);
      this.state.expandedPaths.delete(path);
    } else {
      console.log(`Expanding node: ${path}`);
      this.state.expandedPaths.add(path);
    }
    
    this.emit('tree-updated', this.getTreeStructure());
  }

  // Collapse all expanded nodes
  collapseAll(): void {
    console.log('Collapsing all nodes');
    this.state.expandedPaths.clear();
    this.emit('tree-updated', this.getTreeStructure());
  }

  // Selection management
  selectFile(path: string, multiSelect: boolean = false): void {
    if (!multiSelect) {
      // Clear previous selections
      this.state.selectedPaths.forEach(p => {
        const node = this.state.nodes.get(p);
        if (node) node.selected = false;
      });
      this.state.selectedPaths.clear();
    }

    const node = this.state.nodes.get(path);
    if (node) {
      if (this.state.selectedPaths.has(path)) {
        this.state.selectedPaths.delete(path);
        node.selected = false;
      } else {
        this.state.selectedPaths.add(path);
        node.selected = true;
      }
    }

    this.emit('selection-changed', Array.from(this.state.selectedPaths));
  }

  // Set active file/folder
  setActive(path: string): void {
    // Clear previous active
    if (this.state.activePath) {
      const prevActive = this.state.nodes.get(this.state.activePath);
      if (prevActive) prevActive.active = false;
    }

    const node = this.state.nodes.get(path);
    if (node) {
      this.state.activePath = path;
      node.active = true;
      this.emit('active-changed', path);
    }
  }

  // Get tree structure for rendering
  getTreeStructure(): FileNode | null {
    const rootNode = this.state.nodes.get(this.state.rootPath);
    if (!rootNode) return null;

    return this._buildDisplayTree(rootNode);
  }
  
  // Get node by path (public accessor)
  getNodeByPath(path: string): FileNode | undefined {
    return this.state.nodes.get(path);
  }
  
  // Get selected paths (public accessor)
  getSelectedPaths(): string[] {
    return Array.from(this.state.selectedPaths);
  }
  
  // Get active path (public accessor)
  getActivePath(): string | null {
    return this.state.activePath;
  }

  private _buildDisplayTree(node: FileNode): FileNode {
    const displayNode: FileNode = { ...node };
    
    // Check if the node is expanded using expandedPaths
    const isExpanded = this.state.expandedPaths.has(node.path);
    displayNode.expanded = isExpanded; // Update the expanded property
    
    if (node.children && isExpanded) {
      // First map children to their display nodes
      const childNodes = node.children
        .map(child => {
          const childNode = this.state.nodes.get(child.path);
          return childNode ? this._buildDisplayTree(childNode) : null;
        })
        .filter(Boolean) as FileNode[];
      
      // Create a temporary node with the child nodes for sorting
      const tempNode: FileNode = { ...node, children: childNodes };
      
      // Use our consistent sorting helper
      this._sortNodeChildren(tempNode);
      
      // Assign the sorted children
      displayNode.children = tempNode.children;
    }

    return displayNode;
  }

  // Get visible nodes (for virtualization)
  getVisibleNodes(): FileNode[] {
    const visible: FileNode[] = [];
    const rootNode = this.state.nodes.get(this.state.rootPath);
    
    if (rootNode) {
      this._collectVisibleNodes(rootNode, visible, 0);
    }
    
    return visible;
  }

  private _collectVisibleNodes(node: FileNode, visible: FileNode[], depth: number): void {
    const nodeWithDepth = { ...node, depth };
    visible.push(nodeWithDepth);

    if (node.is_dir && node.expanded && node.children) {
      for (const child of node.children) {
        const childNode = this.state.nodes.get(child.path);
        if (childNode) {
          this._collectVisibleNodes(childNode, visible, depth + 1);
        }
      }
    }
  }

  // Search functionality
  search(query: string): FileNode[] {
    const results: FileNode[] = [];
    const lowerQuery = query.toLowerCase();

    for (const node of this.state.nodes.values()) {
      if (node.name.toLowerCase().includes(lowerQuery)) {
        results.push(node);
      }
    }

    return results.sort((a, b) => {
      // Prioritize exact matches and directories
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      if (aExact !== bExact) return aExact ? -1 : 1;
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  // Utility methods
  getNode(path: string): FileNode | undefined {
    return this.state.nodes.get(path);
  }

  getSelectedNodes(): FileNode[] {
    return Array.from(this.state.selectedPaths)
      .map(path => this.state.nodes.get(path))
      .filter(Boolean) as FileNode[];
  }

  getActiveNode(): FileNode | null {
    return this.state.activePath ? this.state.nodes.get(this.state.activePath) || null : null;
  }

  isExpanded(path: string): boolean {
    return this.state.expandedPaths.has(path);
  }
  
  // Get all expanded paths
  getAllExpandedPaths(): string[] {
    return Array.from(this.state.expandedPaths);
  }

  isSelected(path: string): boolean {
    return this.state.selectedPaths.has(path);
  }

  isActive(path: string): boolean {
    return this.state.activePath === path;
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Helper methods
  private _isDirectory(fileName: string): boolean {
    return !fileName.includes('.');
  }

  // Get path breadcrumbs
  getBreadcrumbs(path: string): Array<{name: string, path: string}> {
    const breadcrumbs: Array<{name: string, path: string}> = [];
    const parts = path.split('/').filter(Boolean);
    
    let currentPath = '';
    for (const part of parts) {
      currentPath += '/' + part;
      breadcrumbs.push({
        name: part,
        path: currentPath
      });
    }

    return breadcrumbs;
  }

  // Expand path to make it visible
  expandToPath(path: string): void {
    const node = this.state.nodes.get(path);
    if (!node) return;

    let currentPath = node.parent;
    while (currentPath) {
      this.state.expandedPaths.add(currentPath);
      const parentNode = this.state.nodes.get(currentPath);
      if (parentNode) {
        parentNode.expanded = true;
        currentPath = parentNode.parent;
      } else {
        break;
      }
    }
  }
}