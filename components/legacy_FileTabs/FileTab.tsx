"use client"
import React from 'react'
import { X, FileText, FileCode, Palette, Globe, FileJson, FileType } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileTabProps {
  id: string
  name: string
  path: string
  extension?: string
  isActive?: boolean
  isDirty?: boolean
  onActivate?: (id: string) => void
  onClose?: (id: string, forceClose?: boolean) => void
}

function FileTab({
  id,
  name,
  path,
  extension,
  isActive = false,
  isDirty = false,
  onActivate,
  onClose
}: FileTabProps) {

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
    if (onActivate) {
      onActivate(id)
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose?.(id)
  }

  return (
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
  )
}

export default FileTab
