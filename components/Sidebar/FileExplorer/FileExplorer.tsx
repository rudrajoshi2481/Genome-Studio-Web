"use client";

import React, { useEffect, useCallback, useMemo } from 'react';
import { useFileExplorerStore } from './store/fileExplorer-store';
import { 
  FolderIcon, 
  FileIcon, 
  ChevronRightIcon, 
  ChevronDownIcon, 
  RefreshCwIcon, 
  HomeIcon,
  WifiIcon,
  WifiOffIcon,
  LoaderIcon
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// Constants
const DEFAULT_PATH = '/home';
const SKELETON_COUNT = 8;
const PADDING_PER_DEPTH = 16;
const BASE_PADDING = 8;

// Utility functions (moved outside components for better performance)
const formatSize = (size?: number): string => {
  if (size === undefined) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return '';
  }
};

// CSS classes constants
const TREE_ITEM_CLASSES = {
  container: "flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 transition-colors",
  selected: "bg-blue-100 border-l-2 border-blue-500",
  toggleButton: "mr-1 p-0.5 hover:bg-gray-200 rounded transition-colors",
  icon: "mr-2 flex-shrink-0",
  fileIcon: "mr-2 text-gray-600 flex-shrink-0",
  fileName: "text-sm truncate flex-1 min-w-0"
};

// Memoized File Tree Item Component
const FileTreeItem = React.memo<{ node: FileNode; depth: number }>(({ node, depth }) => {
  const { toggleNode, isNodeExpanded, selectNode, selectedNode } = useFileExplorerStore();
  
  const isExpanded = useMemo(() => isNodeExpanded(node.id), [isNodeExpanded, node.id]);
  const isSelected = useMemo(() => selectedNode === node.id, [selectedNode, node.id]);
  
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'directory') {
      toggleNode(node.id);
    }
  }, [node.id, node.type, toggleNode]);
  
  const handleSelect = useCallback(() => {
    selectNode(node.id);
  }, [node.id, selectNode]);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    handleSelect();
    handleToggle(e);
  }, [handleSelect, handleToggle]);
  
  const containerStyle = useMemo(() => ({
    paddingLeft: `${depth * PADDING_PER_DEPTH + BASE_PADDING}px`
  }), [depth]);
  
  const containerClassName = useMemo(() => 
    `${TREE_ITEM_CLASSES.container} ${isSelected ? TREE_ITEM_CLASSES.selected : ''}`,
    [isSelected]
  );
  
  const tooltipText = useMemo(() => 
    `${node.path} ${node.modified ? `(${formatDate(node.modified)})` : ''}`,
    [node.path, node.modified]
  );
  
  return (
    <div>
      <div 
        className={containerClassName}
        style={containerStyle}
        onClick={handleClick}
        title={tooltipText}
      >
        {node.type === 'directory' && (
          <button 
            className={TREE_ITEM_CLASSES.toggleButton}
            onClick={handleToggle}
          >
            {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
          </button>
        )}
        
        {node.type === 'directory' ? (
          <FolderIcon size={16} className={TREE_ITEM_CLASSES.icon} />
        ) : (
          <FileIcon size={16} className={TREE_ITEM_CLASSES.fileIcon} />
        )}
        
        <span className={TREE_ITEM_CLASSES.fileName}>{node.name}</span>
      </div>
      
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child:any) => (
            <FileTreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});

FileTreeItem.displayName = 'FileTreeItem';

// Memoized Toolbar Component
const FileExplorerToolbar = React.memo(() => {
  const { 
    refreshFileTree, 
    navigateToPath, 
    currentPath, 
    connectWebSocket,
    wsStatus 
  } = useFileExplorerStore();
  
  const handleRefresh = useCallback(() => {
    refreshFileTree();
  }, [refreshFileTree]);
  
  const handleHomeClick = useCallback(() => {
    navigateToPath(DEFAULT_PATH);
  }, [navigateToPath]);
  
  const handleReconnect = useCallback(() => {
    connectWebSocket(currentPath);
  }, [connectWebSocket, currentPath]);
  
  const isRefreshDisabled = useMemo(() => wsStatus !== 'connected', [wsStatus]);
  const showReconnectButton = useMemo(() => wsStatus !== 'connected', [wsStatus]);
  
  return (
    <div className="flex items-center justify-between px-2 border-b bg-gray-50">
      <div className="flex items-center gap-2">   
        <h3 className="text-sm font-semibold">File Explorer</h3>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHomeClick}
          className="h-8 w-8 p-0"
          title="Home Directory"
        >
          <HomeIcon size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-8 w-8 p-0"
          title="Refresh"
          disabled={isRefreshDisabled}
        >
          <RefreshCwIcon size={14} />
        </Button>
        {showReconnectButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReconnect}
            className="h-8 w-8 p-0"
            title="Reconnect"
          >
            <WifiIcon size={14} />
          </Button>
        )}
      </div>
    </div>
  );
});

FileExplorerToolbar.displayName = 'FileExplorerToolbar';

// Memoized Loading Skeleton Component
const LoadingSkeleton = React.memo(() => {
  const skeletonItems = useMemo(() => 
    Array.from({ length: SKELETON_COUNT }, (_, i) => (
      <div key={i} className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-16 rounded ml-auto" />
      </div>
    )),
    []
  );
  
  return (
    <div className="overflow-auto p-3 space-y-3">
      {skeletonItems}
    </div>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Memoized Error Component
const ErrorDisplay = React.memo<{ error: string; onRetry: () => void }>(({ error, onRetry }) => (
  <div className="flex-1 flex items-center justify-center p-4">
    <div className="text-center">
      <div className="text-red-500 text-sm mb-2">{error}</div>
      <Button 
        onClick={onRetry}
        size="sm"
        variant="outline"
      >
        Try Again
      </Button>
    </div>
  </div>
));

ErrorDisplay.displayName = 'ErrorDisplay';

// Memoized Empty State Component
const EmptyState = React.memo<{ wsStatus: string }>(({ wsStatus }) => (
  <div className="flex items-center justify-center h-32">
    <div className="text-sm text-gray-500">
      {wsStatus === 'connected' ? 'No files found' : 'Connecting...'}
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Main File Explorer Component
const FileExplorer = React.memo(() => {
  const { 
    fileTree, 
    connectWebSocket, 
    disconnectWebSocket,
    isLoading, 
    error, 
    currentPath,
    wsStatus 
  } = useFileExplorerStore();
  
  useEffect(() => {
    connectWebSocket(DEFAULT_PATH);
    
    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);
  
  const handleRetry = useCallback(() => {
    connectWebSocket(currentPath);
  }, [connectWebSocket, currentPath]);
  
  const fixedHeader = useMemo(() => (
    <>
      <FileExplorerToolbar />
      <div className="text-xs text-gray-600 px-3 py-2 border-b bg-gray-25 font-mono">
        {currentPath}
      </div>
    </>
  ), [currentPath]);

  const hasFiles = useMemo(() => 
    fileTree?.children && fileTree.children.length > 0,
    [fileTree?.children]
  );

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {fixedHeader}
        <ErrorDisplay error={error} onRetry={handleRetry} />
      </div>
    );
  }
  
  if (isLoading || !fileTree) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {fixedHeader}
        <LoadingSkeleton />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-white">
      {fixedHeader}
      <div className="flex-1 overflow-auto">
        {hasFiles ? (
          <div className="p-1">
            {fileTree.children!.map(child => (
              <FileTreeItem key={child.id} node={child} depth={0} />
            ))}
          </div>
        ) : (
          <EmptyState wsStatus={wsStatus} />
        )}
      </div>
    </div>
  );
});

FileExplorer.displayName = 'FileExplorer';

export default FileExplorer;
