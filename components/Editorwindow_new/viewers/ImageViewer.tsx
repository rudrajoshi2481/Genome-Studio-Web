import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, RotateCw, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { editorAPI } from '../services/EditorAPI'
import { toast } from 'sonner'

interface ImageViewerProps {
  tabId: string
  filePath: string
}

interface ImageMetadata {
  width?: number
  height?: number
  format?: string
  size?: number
}

/**
 * ImageViewer component for displaying images with zoom and rotation controls
 * Uses the new file-explorer-new API for image loading
 */
const ImageViewer: React.FC<ImageViewerProps> = ({ tabId, filePath }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Load image content
  const loadImage = useCallback(async () => {
    if (!filePath) return

    try {
      setIsLoading(true)
      setError(null)
      
      console.log('🖼️ ImageViewer: Loading image for:', filePath)
      
      // Try to get image preview first
      try {
        const preview = await editorAPI.getFilePreview(filePath)
        if (preview.preview_url) {
          setImageUrl(preview.preview_url)
          setMetadata(preview.metadata || {})
          console.log('✅ ImageViewer: Preview loaded successfully')
          return
        }
      } catch (previewError) {
        console.warn('⚠️ ImageViewer: Preview not available, downloading file')
      }

      // Fallback to downloading the file as blob
      const blob = await editorAPI.downloadFile(filePath)
      const url = URL.createObjectURL(blob)
      setImageUrl(url)
      
      // Get basic metadata
      const fileMetadata = await editorAPI.getFileMetadata(filePath)
      setMetadata({
        size: fileMetadata.size,
        format: filePath.split('.').pop()?.toUpperCase()
      })
      
      console.log('✅ ImageViewer: Image loaded successfully')
    } catch (error) {
      console.error('❌ ImageViewer: Error loading image:', error)
      setError(error instanceof Error ? error.message : 'Failed to load image')
    } finally {
      setIsLoading(false)
    }
  }, [filePath])

  // Download image
  const downloadImage = useCallback(async () => {
    try {
      const blob = await editorAPI.downloadFile(filePath)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filePath.split('/').pop() || 'image'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Image downloaded successfully')
    } catch (error) {
      console.error('❌ ImageViewer: Error downloading image:', error)
      toast.error('Failed to download image')
    }
  }, [filePath])

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 5))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.1))
  }, [])

  const resetZoom = useCallback(() => {
    setZoom(1)
    setRotation(0)
  }, [])

  // Rotation controls
  const rotateClockwise = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])

  const rotateCounterClockwise = useCallback(() => {
    setRotation(prev => (prev - 90 + 360) % 360)
  }, [])

  // Load image on mount
  useEffect(() => {
    loadImage()
    
    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [loadImage])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading image...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p className="mb-2">Error loading image</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadImage}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="p-1 hover:bg-gray-200 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-sm font-mono min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1 hover:bg-gray-200 rounded"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={rotateCounterClockwise}
            className="p-1 hover:bg-gray-200 rounded"
            title="Rotate Counter-Clockwise"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={rotateClockwise}
            className="p-1 hover:bg-gray-200 rounded"
            title="Rotate Clockwise"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={downloadImage}
            className="p-1 hover:bg-gray-200 rounded"
            title="Download Image"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image display */}
      <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={filePath.split('/').pop()}
            className="max-w-none transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
            onError={() => setError('Failed to display image')}
          />
        )}
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            {metadata.format && (
              <span>Format: {metadata.format}</span>
            )}
            {metadata.width && metadata.height && (
              <span>Dimensions: {metadata.width} × {metadata.height}</span>
            )}
            {metadata.size && (
              <span>Size: {(metadata.size / 1024).toFixed(1)} KB</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageViewer
