/**
 * Editor API Service for EditorWindow
 * Based on the working pattern from api-simple.ts with comprehensive logging
 */

import { getApiBaseUrl } from '@/config/server'
import * as authService from '@/lib/services/auth-service'

// Types for API responses
export interface FileContent {
  content: string
  version?: number
  metadata?: {
    size?: number
    modified?: string
    permissions?: string
  }
  isPartial?: boolean
  totalLines?: number
  loadedLines?: number
}

export interface FileChunk {
  content: string
  startLine: number
  endLine: number
  totalLines: number
  hasMore: boolean
}

export interface LargeFileInfo {
  isLargeFile: boolean
  fileSize: number
  totalLines?: number
  recommendChunking: boolean
}

export interface FilePreview {
  preview_url?: string
  thumbnail_url?: string
  metadata?: Record<string, any>
}

// Helper to build endpoint URLs for the new API
const buildUrl = (endpoint: string) => {
  const baseUrl = getApiBaseUrl()
  return `${baseUrl}/file-explorer-new${endpoint}`
}

// Get authorization headers with better error handling
const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  try {
    const token = authService.getToken()
    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token}`
    } else {
      console.warn('⚠️ EditorAPI: No authentication token available')
    }
  } catch (error) {
    console.error('❌ EditorAPI: Failed to get auth token:', error)
  }
  
  return headers
}

// Make authenticated request with comprehensive logging
const makeRequest = async (url: string, options: RequestInit = {}) => {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substr(2, 9)
  
  console.log('🔄 [' + requestId + '] EditorAPI Request:', {
    url: url.length > 100 ? url.substring(0, 100) + '...' : url,
    method: options.method || 'GET',
    timestamp: new Date().toISOString(),
    headers: options.headers ? Object.keys(options.headers) : []
  })
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    })

    const duration = Date.now() - startTime
    
    console.log(`📡 [${requestId}] EditorAPI Response:`, {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    if (!response.ok) {
      let errorText = ''
      let errorData: any = null
      
      try {
        const contentType = response.headers.get('content-type') || ''
        
        if (contentType.includes('application/json')) {
          try {
            errorData = await response.json()
            errorText = errorData?.message || errorData?.detail || errorData?.error || 'Unknown JSON error'
          } catch (jsonError) {
            errorText = `Failed to parse JSON error response: ${jsonError}`
            errorData = { parseError: String(jsonError) }
          }
        } else {
          try {
            errorText = await response.text()
            if (!errorText) {
              errorText = `HTTP ${response.status} ${response.statusText}`
            }
            
            // Try to parse as JSON if it looks like JSON
            if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
              try {
                errorData = JSON.parse(errorText)
              } catch {
                // Not valid JSON, keep as text
                errorData = { message: errorText }
              }
            } else {
              errorData = { message: errorText }
            }
          } catch (textError) {
            errorText = `Failed to read text error response: ${textError}`
            errorData = { readError: String(textError) }
          }
        }
      } catch (readError) {
        errorText = `Failed to read error response: ${readError}`
        errorData = { message: errorText, readError: String(readError) }
      }
      
      // Ensure we have some error information
      if (!errorText) {
        errorText = `HTTP ${response.status} ${response.statusText || 'Unknown Error'}`
      }
      if (!errorData) {
        errorData = { status: response.status, statusText: response.statusText }
      }
      
      console.error(`❌ [${requestId}] EditorAPI Error:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorText || 'No error text',
        errorData: errorData || {},
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      })
      
      // Also log individual components for debugging
      console.error(`❌ [${requestId}] Status: ${response.status} ${response.statusText}`)
      if (errorText) {
        console.error(`❌ [${requestId}] Error Text:`, errorText)
      }
      if (errorData && Object.keys(errorData).length > 0) {
        console.error(`❌ [${requestId}] Error Data:`, JSON.stringify(errorData, null, 2))
      }
      
      // Handle authentication errors specifically
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed: ${errorData?.detail || errorData?.message || response.statusText}`)
      }
      
      const errorMessage = errorText || `HTTP ${response.status} ${response.statusText}`
      throw new Error(`API request failed (${response.status}): ${errorMessage}`)
    }

    let data: any = {}
    try {
      const responseText = await response.text()
      if (responseText.trim()) {
        data = JSON.parse(responseText)
      } else {
        console.warn(`⚠️ [${requestId}] Empty response body for:`, url)
        data = {}
      }
    } catch (parseError) {
      console.error(`❌ [${requestId}] JSON Parse Error:`, {
        url,
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        duration: `${duration}ms`
      })
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
    }
    
    console.log(`✅ [${requestId}] EditorAPI Success:`, {
      url,
      dataSize: JSON.stringify(data).length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      dataKeys: Object.keys(data || {})
    })
    
    return data
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Log the raw error for debugging
    console.error(`🔍 [${requestId}] Raw error:`, error)
    
    // Enhanced error information extraction
    let errorInfo: any = {}
    
    if (error instanceof Error) {
      errorInfo = {
        message: error.message || 'No error message',
        name: error.name || 'Error',
        stack: error.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace'
      }
      
      // Add additional error properties if they exist
      if ('code' in error) errorInfo.code = (error as any).code
      if ('status' in error) errorInfo.status = (error as any).status
      if ('statusText' in error) errorInfo.statusText = (error as any).statusText
      
    } else if (typeof error === 'string') {
      errorInfo = { message: error, type: 'string' }
    } else if (error && typeof error === 'object') {
      // Try to extract useful information from object errors
      errorInfo = {
        message: (error as any).message || (error as any).error || 'Object error',
        type: 'object',
        keys: Object.keys(error),
        stringified: JSON.stringify(error, null, 2).substring(0, 500) // Limit size
      }
    } else {
      errorInfo = { 
        message: 'Unknown error type', 
        type: typeof error,
        value: String(error)
      }
    }
    
    console.error(`💥 [${requestId}] EditorAPI Exception:`, {
      url,
      method: options.method || 'GET',
      errorInfo: errorInfo || {},
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
    
    // Also log individual components for debugging
    console.error(`💥 [${requestId}] Exception Details:`, {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      url,
      method: options.method || 'GET'
    })
    
    if (error instanceof Error && error.stack) {
      console.error(`💥 [${requestId}] Stack Trace:`, error.stack.split('\n').slice(0, 5).join('\n'))
    }
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`EditorAPI request failed: ${error.message}`)
    }
    throw error
  }
}

/**
 * Editor API Service
 */
export class EditorAPIService {
  // File size limits (in bytes)
  private readonly LARGE_FILE_THRESHOLD = 1024 * 1024 // 1MB
  private readonly MAX_INITIAL_LOAD = 5 * 1024 * 1024 // 5MB
  private readonly CHUNK_SIZE = 1000 // lines per chunk
  
  // Helper to get current root path dynamically
  private getCurrentRootPath(): string {
    try {
      const stored = localStorage.getItem('fileExplorer_rootPath')
      const rootPath = stored || '/app'
      console.log('📁 EditorAPI Root Path:', { stored, rootPath })
      return rootPath
    } catch (error) {
      console.warn('⚠️ EditorAPI Root Path fallback:', { error })
      return '/app'
    }
  }

  // Check if file is large using the new API
  async getFileInfo(filePath: string): Promise<LargeFileInfo> {
    console.log('📊 EditorAPI checking file size:', { filePath })
    
    try {
      // Use the new large-file-info endpoint
      const params = new URLSearchParams({ file_path: filePath })
      const data = await makeRequest(`${buildUrl('/large-file-info')}?${params}`)
      
      console.log('📊 File size analysis:', { 
        filePath, 
        fileSize: `${(data.file_size / 1024 / 1024).toFixed(2)}MB`,
        isLargeFile: data.is_large_file,
        canReadDirectly: data.can_read_directly
      })
      
      return {
        isLargeFile: data.is_large_file || false,
        fileSize: data.file_size || 0,
        recommendChunking: !data.can_read_directly
      }
    } catch (error) {
      console.warn('⚠️ Could not get file info, assuming small file:', error)
      return {
        isLargeFile: false,
        fileSize: 0,
        recommendChunking: false
      }
    }
  }

  // Load file chunk using the new API
  async getFileChunk(filePath: string, offset: number = 0, size?: number): Promise<FileChunk> {
    const chunkSize = size || 8192 // Default chunk size in bytes
    console.log('📄 EditorAPI loading file chunk:', { filePath, offset, size: chunkSize })
    
    try {
      const params = new URLSearchParams({
        file_path: filePath,
        offset: offset.toString(),
        size: chunkSize.toString()
      })
      
      const data = await makeRequest(`${buildUrl('/file-chunk')}?${params}`)
      
      return {
        content: data.chunk || '',
        startLine: 0, // Convert byte offset to line numbers if needed
        endLine: 0,
        totalLines: 0,
        hasMore: data.has_more || false
      }
    } catch (error) {
      console.error('❌ Failed to load file chunk:', error)
      throw error
    }
  }

  // Get file content using the new API
  async getFileContent(filePath: string, rootPath?: string): Promise<FileContent> {
    const actualRootPath = rootPath || this.getCurrentRootPath()
    console.log('📖 EditorAPI getFileContent:', { filePath, actualRootPath })
    
    try {
      // First check if file is large using the new API
      const fileInfo = await this.getFileInfo(filePath)
      
      if (fileInfo.isLargeFile && fileInfo.recommendChunking) {
        console.log('📄 EditorAPI: Large file detected, loading first chunk:', filePath)
        const chunk = await this.getFileChunk(filePath, 0, this.CHUNK_SIZE)
        return {
          content: chunk.content,
          version: 1,
          isPartial: chunk.hasMore,
          totalLines: chunk.totalLines,
          loadedLines: chunk.endLine - chunk.startLine + 1
        }
      }
      
      // Load full file using the new API endpoint
      const params = new URLSearchParams({
        path: filePath,
        root_path: actualRootPath
      })
      
      const data = await makeRequest(`${buildUrl('/file-content')}?${params}`)
      
      return {
        content: data.content || '',
        version: data.version || 1,
        metadata: {
          size: data.size || 0,
          modified: data.modified || new Date().toISOString(),
          permissions: data.permissions || 'rw-r--r--'
        }
      }
    } catch (error) {
      // Handle authentication errors gracefully
      if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('Not authenticated'))) {
        console.warn('🔐 EditorAPI: Authentication failed, falling back to local file reading for:', filePath)
        return this.getFileContentLocal(filePath)
      }
      
      throw error
    }
  }



  // Update file content using the new API
  async updateFileContent(filePath: string, content: string, version?: number): Promise<void> {
    console.log('💾 EditorAPI updateFileContent:', { filePath, contentLength: content.length, version })
    
    const rootPath = this.getCurrentRootPath()
    const params = new URLSearchParams({ root_path: rootPath })
    
    await makeRequest(`${buildUrl('/update-file-content')}?${params}`, {
      method: 'POST',
      body: JSON.stringify({
        file_path: filePath,
        operation: {
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'full_replace', // Use full_replace instead of replace with end: -1
          text: content,
          timestamp: new Date().toISOString()
        },
        version: version || 1
      })
    })
  }

  // Get file preview using the new API
  async getFilePreview(filePath: string): Promise<FilePreview> {
    console.log('🖼️ EditorAPI getFilePreview:', { filePath })
    
    const params = new URLSearchParams({ path: filePath })
    return await makeRequest(`${buildUrl('/preview')}?${params}`)
  }

  // Download file using the new API
  async downloadFile(filePath: string): Promise<Blob> {
    const rootPath = this.getCurrentRootPath()
    console.log('⬇️ EditorAPI downloadFile:', { filePath, rootPath })
    
    const params = new URLSearchParams({
      path: filePath,
      root_path: rootPath
    })
    
    const response = await fetch(`${buildUrl('/download')}?${params}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    const blob = await response.blob()
    console.log('✅ EditorAPI downloadFile success:', { filePath, blobSize: blob.size })
    return blob
  }



  // Get file metadata using the new API
  async getFileMetadata(filePath: string): Promise<Record<string, any>> {
    console.log('📊 EditorAPI getFileMetadata:', { filePath })
    
    const params = new URLSearchParams({ path: filePath })
    return await makeRequest(`${buildUrl('/file-info')}?${params}`)
  }

  // Local fallback for file content when API is not available
  private async getFileContentLocal(filePath: string): Promise<FileContent> {
    console.log('📁 EditorAPI: Using local fallback for:', filePath)
    
    // For demo purposes, return a basic file structure
    // In a real implementation, this could read from localStorage or IndexedDB
    return {
      content: `// File: ${filePath}\n// This is a fallback when the backend API is not available\n// Please ensure the backend server is running and authentication is configured\n\nconsole.log('Hello from ${filePath}');\n`,
      version: 1,
      metadata: {
        size: 200,
        modified: new Date().toISOString(),
        permissions: 'rw-r--r--'
      }
    }
  }

  // Search files using the new API
  async searchFiles(query: string, rootPath?: string, maxResults: number = 100): Promise<any[]> {
    const actualRootPath = rootPath || this.getCurrentRootPath()
    console.log('🔍 EditorAPI searchFiles:', { query, actualRootPath, maxResults })
    
    try {
      const params = new URLSearchParams({
        directory: actualRootPath,
        query,
        max_results: maxResults.toString()
      })
      
      const data = await makeRequest(`${buildUrl('/search')}?${params}`)
      return data.results || []
    } catch (error) {
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        console.warn('🔐 EditorAPI: Search failed due to authentication, returning empty results')
        return []
      }
      throw error
    }
  }

  // Get file tree using the new API
  async getFileTree(directory: string, maxDepth: number = 3): Promise<any> {
    console.log('🌳 EditorAPI getFileTree:', { directory, maxDepth })
    
    const params = new URLSearchParams({
      directory,
      max_depth: maxDepth.toString()
    })
    
    return await makeRequest(`${buildUrl('/tree')}?${params}`)
  }

  // Bulk operations using the new API
  async bulkOperation(operation: string, items: string[], rootPath?: string): Promise<any> {
    const actualRootPath = rootPath || this.getCurrentRootPath()
    console.log('📦 EditorAPI bulkOperation:', { operation, itemCount: items.length, actualRootPath })
    
    return await makeRequest(`${buildUrl('/bulk-operations')}`, {
      method: 'POST',
      body: JSON.stringify({
        operation,
        items,
        root_path: actualRootPath
      })
    })
  }
}

// Export singleton instance
export const editorAPI = new EditorAPIService()
