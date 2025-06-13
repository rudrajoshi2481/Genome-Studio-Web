import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileTabProps {
  id: string
  name: string
  path: string
  extension?: string
  isActive?: boolean
  isDirty?: boolean
  onActivate?: (id: string) => void
  onClose?: (id: string) => void
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
  // Get icon based on file extension
  const getFileIcon = () => {
    switch(extension?.toLowerCase()) {
      case 'js':
      case 'jsx':
        return '📄 ';
      case 'ts':
      case 'tsx':
        return '📘 ';
      case 'css':
      case 'scss':
      case 'sass':
        return '🎨 ';
      case 'html':
        return '🌐 ';
      case 'json':
        return '📋 ';
      case 'md':
        return '📝 ';
      default:
        return '📄 ';
    }
  };

  const handleActivate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onActivate) {
      onActivate(id);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose(id);
    }
  };

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
    >
      <span className="mr-1">{getFileIcon()}</span>
      <span className="truncate max-w-[100px]">{name}</span>
      {isDirty && <span className="ml-1 text-blue-400">•</span>}
      <button 
        className="ml-2 opacity-0 group-hover:opacity-100 rounded p-0.5"
        onClick={handleClose}
        aria-label="Close tab"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default FileTab