import React, { useEffect } from 'react'
import { useFileExplorerStore } from '../Sidebar/FileExplorer/utils/store'
import { useActiveFilesStore, ActiveFile } from '@/components/canvas/active-files-store'
import { X, FileText, FileCode, FileJson, FileImage, File } from 'lucide-react'
import { cn } from '@/lib/utils'

function ActiveFileTabs() {
  const { activePath, setActivePath } = useFileExplorerStore()
  const { 
    activeFiles, 
    activeFileIndex, 
    addFile, 
    removeFile, 
    setActiveFile 
  } = useActiveFilesStore()

  // Helper to get file name from path
  const getFileName = (path: string): string => {
    return path.split('/').pop() || path
  }

  // Helper to determine file type icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    switch(extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode className="h-4 w-4" />
      case 'json':
        return <FileJson className="h-4 w-4" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <FileImage className="h-4 w-4" />
      case 'txt':
      case 'md':
        return <FileText className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  // Check if path is a file (not a directory)
  const isFile = (path: string): boolean => {
    // Simple check - if it has an extension, it's likely a file
    const fileName = getFileName(path)
    return fileName.includes('.')
  }

  // When activePath changes, add it to activeFiles if not already there and if it's a file
  useEffect(() => {
    if (activePath && isFile(activePath)) {
      const fileName = getFileName(activePath)
      
      // Add file to store (the store will handle checking if it already exists)
      addFile({
        path: activePath,
        name: fileName,
        type: fileName.split('.').pop()?.toLowerCase(),
      })
    }
  }, [activePath, addFile])

  // Handle tab click
  const handleTabClick = (path: string) => {
    setActivePath(path)
    setActiveFile(path)
  }

  // Handle tab close
  const handleTabClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation() // Prevent tab selection when closing
    
    // Get the file being closed
    const fileIndex = activeFiles.findIndex(file => file.path === path)
    const isActive = activeFileIndex === fileIndex
    
    // Remove file from tabs
    removeFile(path)
    
    // If we closed the active file and there are other files, set active path to the new active file
    if (isActive && activeFiles.length > 1) {
      // The store will have updated the activeFileIndex after removal
      // We just need to update the FileExplorer's activePath
      const newActiveFile = activeFiles.filter(f => f.path !== path)[0]
      if (newActiveFile) {
        setActivePath(newActiveFile.path)
      } else {
        setActivePath('')
      }
    } else if (activeFiles.length <= 1) {
      // No tabs left or only one that we're closing
      setActivePath('')
    }
  }

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex overflow-x-auto">
        {activeFiles.map((file, index) => (
          <div
            key={file.path}
            className={cn(
              "flex items-center px-4 py-2 border-r border-gray-200 cursor-pointer group",
              activeFileIndex === index ? "bg-white" : "bg-gray-50 hover:bg-gray-100"
            )}
            onClick={() => handleTabClick(file.path)}
          >
            <div className="flex items-center gap-2">
              {getFileIcon(file.name)}
              <span className={cn(
                "text-sm",
                activeFileIndex === index ? "font-medium" : "text-gray-600"
              )}>
                {file.name}
                {file.modified && <span className="ml-1 text-gray-400">•</span>}
              </span>
            </div>
            <button
              className="ml-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200"
              onClick={(e) => handleTabClose(e, file.path)}
            >
              <X className="h-3 w-3 text-gray-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ActiveFileTabs