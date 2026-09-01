"use client"
import React, { useState, useRef } from 'react'
import {
  X, FileText, FileCode, Palette, Globe, FileJson, FileType, Copy, Trash2, XCircle,
  ChevronsRight, ChevronsLeft, Minimize2, FolderTree, ExternalLink, Workflow
} from 'lucide-react'
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

interface FileTabProps {
  id: string
  name: string
  path: string
  extension?: string
  isActive?: boolean
  isDirty?: boolean
  isExecuting?: boolean
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
  isExecuting = false,
  onActivate,
  onClose,
  onDelete
}: FileTabProps) {
  const { closeTabsToRight, closeTabsToLeft, closeOtherTabs, closeAllTabs, tabOrder, moveTab } = useTabStore()
  const { revealInExplorer } = useFileExplorerStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragOver, setDragOver] = useState<'left' | 'right' | null>(null)
  const tabRef = useRef<HTMLDivElement>(null)

  const getFileIcon = () => {
    const iconProps = { size: 14, className: "mr-1.5 flex-shrink-0" }

    switch (extension?.toLowerCase()) {
      case 'js':
      case 'jsx':
        return <FileCode {...iconProps} className="mr-1.5 flex-shrink-0 text-yellow-600" />
      case 'ts':
      case 'tsx':
        return <FileCode {...iconProps} className="mr-1.5 flex-shrink-0 text-blue-600" />
      case 'css':
      case 'scss':
      case 'sass':
        return <Palette {...iconProps} className="mr-1.5 flex-shrink-0 text-pink-600" />
      case 'html':
        return <Globe {...iconProps} className="mr-1.5 flex-shrink-0 text-orange-600" />
      case 'json':
        return <FileJson {...iconProps} className="mr-1.5 flex-shrink-0 text-green-600" />
      case 'md':
        return <FileType {...iconProps} className="mr-1.5 flex-shrink-0 text-gray-500" />
      case 'flow':
        return <Workflow {...iconProps} className="mr-1.5 flex-shrink-0 text-indigo-600" />
      default:
        return <FileText {...iconProps} className="mr-1.5 flex-shrink-0 text-gray-500" />
    }
  }

  const handleActivate = (e: React.MouseEvent) => {
    // Allow middle-click to close without activating
    if (e.button === 1) {
      e.preventDefault()
      onClose?.(id)
      return
    }
    e.stopPropagation()
    onActivate?.(id)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onClose?.(id)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent text selection on rapid clicks
    if (e.detail > 1) {
      e.preventDefault()
    }
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(path)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      onDelete?.(path)
      onClose?.(id)
    }
  }

  // Drag and drop
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.setData('text/tab-id', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDragOver(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    const rect = tabRef.current?.getBoundingClientRect()
    if (!rect) return
    const midX = rect.left + rect.width / 2
    setDragOver(e.clientX < midX ? 'left' : 'right')
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/tab-id')
    if (!draggedId || draggedId === id) {
      setDragOver(null)
      return
    }
    setDragOver(null)

    const draggedIndex = tabOrder.indexOf(draggedId)
    const targetIndex = tabOrder.indexOf(id)
    if (draggedIndex === -1 || targetIndex === -1) return

    const rect = tabRef.current?.getBoundingClientRect()
    if (!rect) return
    const midX = rect.left + rect.width / 2
    const dropAfter = e.clientX >= midX

    let newIndex = targetIndex
    if (draggedIndex < targetIndex) {
      newIndex = dropAfter ? targetIndex : targetIndex - 1
    } else {
      newIndex = dropAfter ? targetIndex + 1 : targetIndex
    }
    moveTab(draggedId, newIndex)
  }

  // Context menu
  const handleCloseOthers = () => closeOtherTabs(id)
  const handleCloseToRight = () => closeTabsToRight(id)
  const handleCloseToLeft = () => closeTabsToLeft(id)
  const handleCloseAll = () => closeAllTabs()
  const handleRevealInExplorer = async () => {
    try {
      await revealInExplorer(path)
    } catch (error) {
      console.error('Failed to reveal file:', error)
    }
  }
  const handleMoveToNewWindow = () => {
    const url = `/editor-window?path=${encodeURIComponent(path)}`
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openWindow) {
      ;(window as any).electronAPI.openWindow(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const currentIndex = tabOrder.indexOf(id)
  const hasTabsToRight = currentIndex < tabOrder.length - 1
  const hasTabsToLeft = currentIndex > 0
  const hasOtherTabs = tabOrder.length > 1

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={tabRef}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-tab-id={id}
          title={`${path}${isDirty ? ' (modified)' : ''}`}
          className={cn(
            'flex items-center h-8 max-w-[200px] min-w-fit px-3 text-xs cursor-pointer group relative overflow-hidden flex-shrink-0 select-none',
            'transition-all duration-100 border-r border-border/60',
            isActive
              ? 'bg-background text-foreground border-t-2 border-t-primary'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border-t-2 border-t-transparent',
            isDragging && 'opacity-50',
            dragOver === 'left' && 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary',
            dragOver === 'right' && 'after:absolute after:right-0 after:top-0 after:bottom-0 after:w-0.5 after:bg-primary'
          )}
          onClick={handleActivate}
          onMouseDown={handleMouseDown}
          suppressHydrationWarning
        >
          {isExecuting && (
            <div className="absolute inset-0 pointer-events-none running-stripes opacity-60" />
          )}
          {getFileIcon()}
          <span className="whitespace-nowrap truncate leading-tight">{name}</span>
          {isDirty && (
            <span
              className="ml-1 text-orange-500 font-bold text-lg leading-none"
              title="Unsaved changes"
            >
              •
            </span>
          )}
          <button
            type="button"
            className={cn(
              'ml-2 rounded p-0.5 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-all duration-100',
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={handleClose}
            aria-label={`Close ${name} tab`}
          >
            <X size={13} />
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

        <ContextMenuItem onClick={handleMoveToNewWindow}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Move to New Window
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
