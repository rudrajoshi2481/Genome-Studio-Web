import React from 'react'
import { FileNodeProps } from './types'
import { ChevronRightIcon, FilePlusIcon, FolderPlusIcon } from 'lucide-react'
import { FileIconComponent } from './utils/fileIcons'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"

// Render a single file node
const FileNode: React.FC<FileNodeProps> = ({
  node,
  depth = 0,
  onToggle,
  onSelect,
  onOpenFile,
  isNodeExpanded,
  onRename,
  onDelete,
  onContextMenu
}) => {
  const isExpanded = isNodeExpanded(node.path)
  const isSelected = node.selected || false
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.is_dir) {
      onToggle(node.path)
    }
  }
  
  const handleSelect = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // For directories, toggle expansion when clicked
    if (node.is_dir) {
      onToggle(node.path)
    } else {
      // If it's a file, open it in a tab
      onOpenFile(node)
    }
    
    // Always select the node
    onSelect(node.path, e.ctrlKey || e.metaKey)
  }
  
  // Generate a stable key for SSR compatibility
  const nodeKey = `${node.path}-${node.modified || 'unknown'}`
  
  return (
    <div key={nodeKey}>
      <ContextMenu onOpenChange={(open) => {
        // When context menu opens, notify parent component about the node path
        if (open && onContextMenu) {
          onContextMenu(node.path, node.is_dir);
        }
      }}>
        <ContextMenuTrigger>
          <div 
            className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${isSelected ? (node.is_dir ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-100 dark:bg-blue-800/50') : ''}`}
            style={{ paddingLeft: `${(depth * 12) + 4}px` }}
            onClick={handleSelect}
          >
            {node.is_dir && (
              <span 
                className="mr-1 transform transition-transform inline-block"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                <ChevronRightIcon 
                  size={16} 
                  className="text-gray-600"
                />
              </span>
            )}
            
            <span className="mr-2">
              <FileIconComponent fileName={node.name} isDirectory={node.is_dir} size={16} />
            </span>
            
            <span className="text-xs truncate">{node.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.is_dir && (
            <>
              <ContextMenuItem onClick={() => {
                if (onContextMenu) {
                  // Set the context to this folder
                  onContextMenu(node.path, true);
                  // Trigger the new file action via the parent component (SSR safe)
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('fileexplorer:newfile'));
                  }
                }
              }}>
                <FilePlusIcon className="h-4 w-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => {
                if (onContextMenu) {
                  // Set the context to this folder
                  onContextMenu(node.path, true);
                  // Trigger the new folder action via the parent component (SSR safe)
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('fileexplorer:newfolder'));
                  }
                }
              }}>
                <FolderPlusIcon className="h-4 w-4 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => onRename(node)}>Rename</ContextMenuItem>
          <ContextMenuItem onClick={() => onDelete(node)}>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Render children if expanded */}
      {node.is_dir && isExpanded && node.children && 
        // Remove duplicates by path before rendering
        Array.from(new Map(node.children.map(child => [child.path, child])).values())
          .map(child => (
            <FileNode
              key={`${child.path}-${child.modified || Date.now()}`}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              onSelect={onSelect}
              onOpenFile={onOpenFile}
              isNodeExpanded={isNodeExpanded}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
      }
    </div>
  )
}

export default FileNode
