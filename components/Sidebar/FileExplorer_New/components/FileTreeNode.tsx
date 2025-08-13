/**
 * File Tree Node Component
 * Renders individual nodes in the file tree with expand/collapse, selection, and context menu
 */

import React, { memo, useCallback } from 'react';
import { 
  ChevronRightIcon, 
  ChevronDownIcon
} from 'lucide-react';
import { FileNode } from '../types';
import { useFileExplorerStore } from '../store/fileExplorerStore';
import { FileContextMenu } from './ContextMenu';
import { FileIconComponent } from '../utils/fileIcons';

interface FileTreeNodeProps {
  node: FileNode;
  level?: number;
  onSelect: (path: string, multiSelect?: boolean) => void;
  onOpen: (path: string) => void;
  onContextAction: (action: string, node: FileNode) => void;
  selectedPaths: Set<string>;
}



// File type color mapping for different file types
const getFileColor = (fileName: string, isDir: boolean) => {
  if (isDir) {
    return 'text-blue-500';
  }
  
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  // Code files
  if (['js', 'jsx'].includes(ext)) return 'text-yellow-500';
  if (['ts', 'tsx'].includes(ext)) return 'text-blue-600';
  if (['py'].includes(ext)) return 'text-green-600';
  if (['java'].includes(ext)) return 'text-red-600';
  if (['cpp', 'c', 'h'].includes(ext)) return 'text-blue-700';
  if (['cs'].includes(ext)) return 'text-purple-600';
  if (['php'].includes(ext)) return 'text-indigo-600';
  if (['rb'].includes(ext)) return 'text-red-500';
  if (['go'].includes(ext)) return 'text-cyan-600';
  if (['rs'].includes(ext)) return 'text-orange-600';
  if (['html', 'htm'].includes(ext)) return 'text-orange-500';
  if (['css', 'scss', 'sass'].includes(ext)) return 'text-pink-500';
  if (['json'].includes(ext)) return 'text-yellow-600';
  if (['xml'].includes(ext)) return 'text-green-700';
  if (['sql'].includes(ext)) return 'text-blue-800';
  if (['md', 'markdown'].includes(ext)) return 'text-gray-700';
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return 'text-green-500';
  }
  
  // Videos
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
    return 'text-purple-500';
  }
  
  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) {
    return 'text-pink-500';
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return 'text-orange-500';
  }
  
  // Scientific/Bioinformatics
  if (['fasta', 'fa', 'fastq', 'fq', 'sam', 'bam', 'vcf'].includes(ext)) {
    return 'text-teal-600';
  }
  
  return 'text-gray-500';
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = memo(({
  node,
  level = 0,
  onSelect,
  onOpen,
  onContextAction,
  selectedPaths
}) => {
  const { 
    isNodeExpanded, 
    toggleNode
  } = useFileExplorerStore();

  const isExpanded = isNodeExpanded(node.path);
  const isSelected = selectedPaths.has(node.path);
  
  const iconColor = getFileColor(node.name, node.is_dir);

  // Handle node click
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    
    const multiSelect = event.ctrlKey || event.metaKey;
    onSelect(node.path, multiSelect);
  }, [node.path, onSelect]);

  // Handle double click
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (node.is_dir) {
      toggleNode(node.path);
    } else {
      onOpen(node.path);
    }
  }, [node.path, node.is_dir, toggleNode, onOpen]);

  // Handle expand/collapse toggle
  const handleToggle = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    toggleNode(node.path);
  }, [node.path, toggleNode]);

  // Handle context action
  const handleContextAction = useCallback((action: string, contextNode: FileNode) => {
    onContextAction(action, contextNode);
  }, [onContextAction]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (node.is_dir) {
          toggleNode(node.path);
        } else {
          onOpen(node.path);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (node.is_dir && !isExpanded) {
          toggleNode(node.path);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (node.is_dir && isExpanded) {
          toggleNode(node.path);
        }
        break;
    }
  }, [node.path, node.is_dir, isExpanded, toggleNode, onOpen]);

  return (
    <div className="select-none">
      {/* Current node */}
      <FileContextMenu node={node} onAction={handleContextAction}>
        <div
          className={`
            flex items-center py-1 px-2 rounded cursor-pointer group
            hover:bg-gray-100 dark:hover:bg-gray-700
            ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : ''}
          `}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="treeitem"
          aria-expanded={node.is_dir ? isExpanded : undefined}
          aria-selected={isSelected}
        >
          {/* Expand/collapse button for directories */}
          {node.is_dir ? (
            <button
              onClick={handleToggle}
              className="flex-shrink-0 p-0.5 mr-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5 mr-1" /> // Spacer for alignment
          )}

          {/* File/folder icon */}
          <FileIconComponent 
            fileName={node.name} 
            isDirectory={node.is_dir} 
            size={16} 
            className={`mr-2 flex-shrink-0 ${iconColor}`} 
          />

          {/* File/folder name */}
          <span className="flex-1 truncate text-sm">
            {node.name}
          </span>

          {/* File size for files */}
          {!node.is_dir && node.size !== undefined && (
            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
              {formatFileSize(node.size)}
            </span>
          )}

          {/* Child count for directories */}
          {node.is_dir && node.children && node.children.length > 0 && (
            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
              {node.children.length}
            </span>
          )}
        </div>
      </FileContextMenu>

      {/* Child nodes */}
      {node.is_dir && isExpanded && node.children && (
        <div role="group">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onOpen={onOpen}
              onContextAction={onContextAction}
              selectedPaths={selectedPaths}
            />
          ))}
        </div>
      )}
    </div>
  );
});

FileTreeNode.displayName = 'FileTreeNode';
