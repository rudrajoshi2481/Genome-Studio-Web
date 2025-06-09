import React, { useState, useEffect, useRef } from 'react'
import { useFileExplorerStore } from '../Sidebar/FileExplorer/utils/store'
import useActiveFilesStore from './active-files-store'
import { Loader2, AlertCircle } from 'lucide-react'
import * as authService from '@/lib/services/auth-service'

interface FileContentProps {
  path: string
}

function FileContent({ path }: FileContentProps) {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchAttempted, setFetchAttempted] = useState<boolean>(false)
  const { rootPath } = useFileExplorerStore()
  const { 
    activeFiles, 
    activeFileIndex, 
    updateFileContent, 
    updateFileMetadata 
  } = useActiveFilesStore()
  
  // Use a ref to prevent multiple fetch attempts for the same file
  const fetchedPathsRef = useRef<Set<string>>(new Set())

  // Get current active file
  const activeFile = activeFileIndex !== null ? activeFiles[activeFileIndex] : null

  useEffect(() => {
    // If no path or we've already fetched this file, don't fetch again
    if (!path || fetchedPathsRef.current.has(path) || fetchAttempted) {
      return
    }

    // Check if we already have content for this file
    const existingFile = activeFiles.find(file => file.path === path)
    if (existingFile?.content) {
      // We already have the content, no need to fetch
      return
    }

    const fetchFileContent = async (path: string, rootPath: string) => {
      try {
        setLoading(true)
        setError(null)
        setFetchAttempted(true) // Mark that we've attempted to fetch
        
        // Add to fetched paths set to prevent duplicate requests
        fetchedPathsRef.current.add(path)
        
        // Get auth token
        const token = authService.getToken() || 'mock-token-for-development'
        
        // Construct the backend API URL directly
        const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/file-explorer/file-content`
        
        // Create URL with parameters
        const url = new URL(backendUrl)
        url.searchParams.append('path', path)
        url.searchParams.append('root_path', rootPath)
        
        console.log('Fetching file content directly from backend:', url.toString())
        
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include' // Include cookies in the request
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch file content: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('File content received:', {
          path: data.path,
          metadata: data.metadata,
          contentPreview: data.content ? `${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}` : null,
          contentLength: data.content ? data.content.length : 0,
          binary: data.binary,
          truncated: data.truncated
        })
        
        // Log the full content for debugging
        console.log('Full file content:', data.content)
        
        // Update file in store with content and metadata
        updateFileContent(path, data.content || '')
        updateFileMetadata(path, {
          type: data.metadata.type,
          size: data.metadata.size,
          modified: false,
          language: data.metadata.extension
        })

        // Handle truncated files
        if (data.truncated) {
          setError(`File is too large (${(data.metadata.size / (1024 * 1024)).toFixed(2)} MB). Only metadata is displayed.`)
        }
      } catch (err) {
        console.error('Error fetching file content:', err)
        setError(err instanceof Error ? err.message : 'Failed to load file content')
      } finally {
        setLoading(false)
      }
    }

    // Fetch the actual file content
    fetchFileContent(path, rootPath || '/home')
  }, [path, rootPath, activeFiles, updateFileContent, updateFileMetadata, fetchAttempted])

  // Determine if file is binary or text based on extension
  const isBinaryFile = (filePath: string) => {
    const binaryExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'tar', 'gz']
    const extension = filePath.split('.').pop()?.toLowerCase() || ''
    return binaryExtensions.includes(extension)
  }

  // Render image if it's an image file
  const renderImage = (filePath: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg']
    const extension = filePath.split('.').pop()?.toLowerCase() || ''
    
    if (imageExtensions.includes(extension)) {
      // Construct image URL using the existing API endpoint
      const imageUrl = `/api/files/content?path=${path}&rootPath=${rootPath}`
      // Get token for authorization
      const token = authService.getToken() || 'mock-token-for-development'
      // For images, we need to construct a URL that includes the token in the query params
      // since <img> tags can't set headers
      const imageUrlWithToken = `${imageUrl}&token=${encodeURIComponent(token)}`
      
      return (
        <div className="flex items-center justify-center h-full">
          <img 
            src={imageUrlWithToken} 
            alt={`Image: ${filePath.split('/').pop()}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    }
    
    // For non-image binary files
    const fileType = activeFile?.type || 'binary'
    const fileSize = activeFile?.size ? `(${(activeFile.size / 1024).toFixed(2)} KB)` : ''
    
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <AlertCircle className="h-16 w-16 mb-4" />
        <p className="text-lg font-medium">Binary file not displayed</p>
        <p className="text-sm">{fileType.toUpperCase()} file {fileSize}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error}
      </div>
    )
  }

  if (!path) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No file selected
      </div>
    )
  }

  if (isBinaryFile(path)) {
    return renderImage(path)
  }

  // Get content from active file in store
  const fileContent = activeFile?.content || ''

  return (
    <div className="h-full overflow-auto">
      <pre className="p-4 font-mono text-sm whitespace-pre-wrap">{fileContent}</pre>
    </div>
  )
}

export default FileContent
