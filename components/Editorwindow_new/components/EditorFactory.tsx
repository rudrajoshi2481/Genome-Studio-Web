import React, { lazy, Suspense, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getFileType, FileType } from '../utils/fileTypeDetector'
import { editorAPI } from '../services/EditorAPI'

// Lazy load components for better performance
const CodeEditor = lazy(() => import('../editors/CodeEditor'))
const Canvas = lazy(() => import('../editors/Canvas'))
const ImageViewer = lazy(() => import('../viewers/ImageViewer'))
const DataTableViewer = lazy(() => import('../viewers/DataTableViewer'))
const PDFViewer = lazy(() => import('../viewers/PDFViewer'))
const UnsupportedFileViewer = lazy(() => import('../viewers/UnsupportedFileViewer'))

interface EditorFactoryProps {
  tabId: string
  filePath: string
  extension?: string
}

interface FileInfo {
  isLargeFile: boolean
  fileSize: number
  recommendChunking: boolean
}

/**
 * EditorFactory component that dynamically loads the appropriate editor/viewer
 * based on file type using the new file-explorer-new API
 */
const EditorFactory: React.FC<EditorFactoryProps> = ({ tabId, filePath, extension }) => {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check file size and determine loading strategy
  useEffect(() => {
    let mounted = true

    const checkFileSize = async () => {
      if (!filePath || isInitialized || !isMounted) return

      try {
        console.log('🔍 EditorFactory: Checking file size for:', filePath)
        
        // Get file metadata to determine size
        const metadata = await editorAPI.getFileMetadata(filePath)
        const fileSize = metadata.size || 0
        const isLargeFile = fileSize > 1024 * 1024 // 1MB threshold
        const recommendChunking = fileSize > 5 * 1024 * 1024 // 5MB threshold

        if (mounted) {
          setFileInfo({
            isLargeFile,
            fileSize,
            recommendChunking
          })
          setIsInitialized(true)
          console.log('✅ EditorFactory: File info loaded:', { fileSize, isLargeFile, recommendChunking })
        }
      } catch (error) {
        console.warn('⚠️ EditorFactory: Could not get file info, assuming small file:', error)
        if (mounted) {
          setFileInfo({
            isLargeFile: false,
            fileSize: 0,
            recommendChunking: false
          })
          setIsInitialized(true)
        }
      }
    }

    // Add small delay to ensure only active tab loads
    const timer = setTimeout(checkFileSize, 100)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [filePath, isInitialized, isMounted])

  // Determine file type
  const fileType = getFileType(filePath, extension)

  // Render appropriate editor/viewer
  const renderEditor = () => {
    // Show consistent loading state during SSR and initial client render
    if (!isMounted || !isInitialized) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading file info...</span>
        </div>
      )
    }

    // Handle large files with special viewer
    if (fileInfo?.recommendChunking && fileType === FileType.CODE) {
      return (
        <div className="flex items-center justify-center h-full flex-col">
          <div className="text-yellow-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Large File Detected</h3>
          <p className="text-gray-600 mb-4 text-center">
            This file is {(fileInfo.fileSize / 1024 / 1024).toFixed(2)}MB. 
            Loading large files may impact performance.
          </p>
          <button
            onClick={() => setError('Large file loading not implemented yet')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Load Anyway
          </button>
        </div>
      )
    }

    // Route to appropriate component based on file type
    switch (fileType) {
      case FileType.WORKFLOW:
        return <Canvas tabId={tabId} filePath={filePath} />
      
      case FileType.IMAGE:
        return <ImageViewer tabId={tabId} filePath={filePath} />
      
      case FileType.DATA:
        return <DataTableViewer tabId={tabId} filePath={filePath} />
      
      case FileType.PDF:
        return <PDFViewer tabId={tabId} filePath={filePath} />
      
      case FileType.CODE:
      case FileType.UNSUPPORTED:
      default:
        return <CodeEditor tabId={tabId} filePath={filePath} extension={extension} />
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p className="mb-2">Error loading file</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading editor...</span>
          </div>
        }
      >
        {renderEditor()}
      </Suspense>
    </div>
  )
}

export default EditorFactory
