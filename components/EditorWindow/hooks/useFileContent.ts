import { useState, useCallback } from 'react'
import FileService from '@/components/services/file-service'

interface UseFileContentProps {
  authToken?: string | null
  onContentUpdate: (content: string) => void
}

export const useFileContent = ({ authToken, onContentUpdate }: UseFileContentProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Optimized content fetching with caching
  const fetchFileContent = useCallback(async (filePath: string, bypassCache = false) => {
    // Avoid fetching if already loading
    if (isLoading && !bypassCache) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`Fetching content for: ${filePath}`)
      const response = await FileService.getFileContent(filePath, authToken)
      console.log('Response received:', response)
      
      let content = ''
      
      // Handle .flow files specially
      if (filePath.endsWith('.flow') && response.binary) {
        try {
          const flowResponse = await fetch(`http://localhost:8000/api/terminal/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              command: `cat "${filePath}"`,
              cwd: '/'
            }),
          })
          
          if (flowResponse.ok) {
            const result = await flowResponse.json()
            if (result.output) {
              content = result.output
            }
          }
        } catch (flowErr) {
          console.error('Error loading flow file via terminal:', flowErr)
        }
        
        // Fallback to default pipeline if needed
        if (!content) {
          try {
            const defaultPipelineResponse = await fetch('/pipeline.flow')
            if (defaultPipelineResponse.ok) {
              content = await defaultPipelineResponse.text()
            }
          } catch (defaultErr) {
            console.error('Error loading default pipeline:', defaultErr)
          }
        }
      } else if (response.binary) {
        content = '[Binary file content not displayed]'
      } else if (response.truncated) {
        content = `[File too large to display: ${response.metadata?.size || 'unknown'} bytes]`
      } else {
        content = typeof response.content === 'string' 
          ? response.content 
          : JSON.stringify(response.content, null, 2)
        
        // Default template for empty .flow files
        if (filePath.endsWith('.flow') && (!content || content.trim() === '')) {
          content = JSON.stringify({
            "nodes": [],
            "edges": [],
            "global_variables": {},
            "shared_imports": [],
            "execution_history": []
          }, null, 2)
        }
      }
      
      onContentUpdate(content)
      
    } catch (err) {
      console.error('Error fetching file content:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to load file: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [authToken, onContentUpdate, isLoading])

  return {
    isLoading,
    error,
    fetchFileContent,
    setError
  }
}
