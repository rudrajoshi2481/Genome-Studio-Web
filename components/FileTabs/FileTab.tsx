"use client"
import React, { useState, useEffect } from 'react'
import { X, FileText, FileCode, Palette, Globe, FileJson, FileType } from 'lucide-react'
import { cn } from '@/lib/utils'
import UnsavedChangesDialog from './UnsavedChangesDialog'
import { useEditorContext } from '../Editorwindow_new/context/EditorContext'

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
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  
  // Get editor context for save functionality
  let editorContext: any = null;
  try {
    editorContext = useEditorContext();
  } catch (error) {
    // Editor context not available
  }

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
    
    console.log('🔍 FileTab: Attempting to close tab:', id, 'isDirty:', isDirty);
    console.log('🔍 FileTab: Callback functions available:', {
      hasOnClose: !!onClose,
      handleCancelClose: !!handleCancelClose,
      handleSaveAndClose: !!handleSaveAndClose,
      handleCloseAnyway: !!handleCloseAnyway
    });
    
    // Check if file has unsaved changes
    if (isDirty) {
      console.log('✋ FileTab: Tab is dirty, showing unsaved changes dialog');
      setShowUnsavedDialog(true)
      console.log('🔍 FileTab: showUnsavedDialog set to true');
      return
    }
    
    console.log('✅ FileTab: Tab is clean, closing immediately');
    if (onClose) {
      onClose(id)
    }
  }
  
  // Handle unsaved changes dialog actions
  const handleSaveAndClose = async () => {
    // Try to save using the editor context
    if (editorContext) {
      try {
        const saveSuccess = await editorContext.saveTab(id);
        
        if (saveSuccess) {
          // Save successful, now close the tab
          if (onClose) {
            onClose(id);
          }
        } else {
          console.error('Failed to save tab:', id);
          return;
        }
      } catch (error) {
        console.error('Error saving tab:', error);
        return;
      }
    } else {
      // If editor context is not available, fall back to old behavior
      console.warn('Editor context not available, closing without save');
      if (onClose) {
        onClose(id);
      }
    }
    setShowUnsavedDialog(false);
  };

  const handleCloseAnyway = () => {
    console.log('🗑️ FileTab: Close Anyway clicked for tab:', id);
    if (onClose) {
      onClose(id, true); 
      console.log('✅ FileTab: onClose called for tab with forceClose:', id);
    } else {
      console.error('❌ FileTab: onClose is not available');
    }
    setShowUnsavedDialog(false);
  };

  const handleCancelClose = () => {
    setShowUnsavedDialog(false);
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
      
      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <UnsavedChangesDialog
          isOpen={showUnsavedDialog}
          fileName={name}
          onClose={handleCancelClose}
          onSave={handleSaveAndClose}
          onConfirm={handleCloseAnyway}
        />
      )}
    </div>
  )
}

export default FileTab
