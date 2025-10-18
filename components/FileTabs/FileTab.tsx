"use client"
import React from 'react'
import { X, FileText, FileCode, Palette, Globe, FileJson, FileType, Copy, Trash2, XCircle, ChevronsRight, ChevronsLeft, Minimize2, FolderTree } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useTabStore } from './useTabStore'
import { useFileExplorerStore } from '@/components/Sidebar/FileExplorer_New/store/fileExplorerStore'
import { toast } from 'sonner'

interface FileTabProps {
  id: string
  name: string
  path: string
  extension?: string
  isActive?: boolean
  isDirty?: boolean
  onActivate?: (id: string) => void
  onClose?: (id: string) => void
  onDelete?: (path: string) => void
}

function FileTab({
  id,
  name,
  path,
  extension,
  isActive = false,
  isDirty = false,
  onActivate,
  onClose,
  onDelete
}: FileTabProps) {
  const { closeTabsToRight, closeTabsToLeft, closeOtherTabs, closeAllTabs, tabOrder } = useTabStore();
  const { revealInExplorer } = useFileExplorerStore();

  const getFileIcon = () => {
    const iconProps = { size: 14, className: "mr-1 flex-shrink-0" }
    
    switch(extension?.toLowerCase()) {
      case 'js':
      case 'jsx':
        return <FileCode {...iconProps} className="mr-1 flex-shrink-0 text-yellow-600" />
      case 'ts':
      case 'tsx':
        return <FileCode {...iconProps} className="mr-1 flex-shrink-0 text-blue-600" />
      case 'css':
      case 'scss':
      case 'sass':
        return <Palette {...iconProps} className="mr-1 flex-shrink-0 text-pink-600" />
      case 'html':
        return <Globe {...iconProps} className="mr-1 flex-shrink-0 text-orange-600" />
      case 'json':
        return <FileJson {...iconProps} className="mr-1 flex-shrink-0 text-green-600" />
      case 'md':
        return <FileType {...iconProps} className="mr-1 flex-shrink-0 text-gray-600" />
      default:
        return <FileText {...iconProps} className="mr-1 flex-shrink-0 text-gray-500" />
    }
  }

  const handleActivate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onActivate?.(id)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose?.(id)
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(path)
    toast.success('Path copied to clipboard')
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      onDelete?.(path)
      onClose?.(id)
    }
  }

  const handleCloseOthers = () => {
    closeOtherTabs(id)
  }

  const handleCloseToRight = () => {
    closeTabsToRight(id)
  }

  const handleCloseToLeft = () => {
    closeTabsToLeft(id)
  }

  const handleCloseAll = () => {
    closeAllTabs()
  }

  const handleRevealInExplorer = async () => {
    try {
      await revealInExplorer(path)
      toast.success('File revealed in explorer')
    } catch (error) {
      console.error('Failed to reveal file:', error)
      toast.error('Failed to reveal file in explorer')
    }
  }

  // Check if there are tabs to the right or left
  const currentIndex = tabOrder.indexOf(id)
  const hasTabsToRight = currentIndex < tabOrder.length - 1
  const hasTabsToLeft = currentIndex > 0
  const hasOtherTabs = tabOrder.length > 1

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className={cn(
            'flex items-center h-9 px-3 py-1 text-sm cursor-pointer group',
            'transition-colors duration-200',
            isActive ? 'bg-gray-100' : 'hover:bg-gray-50',
          )}
          onClick={handleActivate}
          data-tab-id={id}
          title={path}
          suppressHydrationWarning
        >
      {getFileIcon()}
      <span className="whitespace-nowrap">{name}</span>
      {isDirty && (
        <span 
          className="ml-1 text-orange-500 font-bold text-lg leading-none" 
          title="Unsaved changes"
        >
          •
        </span>
      )}
          <button 
            className="ml-2 opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-gray-200 transition-all duration-150"
            onClick={handleClose}
            aria-label={`Close ${name} tab`}
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleClose}>
          <XCircle className="mr-2 h-4 w-4" />
          Close
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleCloseOthers} disabled={!hasOtherTabs}>
          <Minimize2 className="mr-2 h-4 w-4" />
          Close Others
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleCloseToRight} disabled={!hasTabsToRight}>
          <ChevronsRight className="mr-2 h-4 w-4" />
          Close to the Right
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleCloseToLeft} disabled={!hasTabsToLeft}>
          <ChevronsLeft className="mr-2 h-4 w-4" />
          Close to the Left
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleCloseAll}>
          <XCircle className="mr-2 h-4 w-4" />
          Close All
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={handleRevealInExplorer}>
          <FolderTree className="mr-2 h-4 w-4" />
          Reveal in Explorer
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Path
        </ContextMenuItem>
        
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete File
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default FileTab
