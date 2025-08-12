import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, ExternalLink } from 'lucide-react'
import { editorAPI } from '../services/EditorAPI'
import { toast } from 'sonner'

interface PDFViewerProps {
  tabId: string
  filePath: string
}

/**
 * PDFViewer component for displaying PDF files
 * Uses the new file-explorer-new API for PDF loading
 */
const PDFViewer: React.FC<PDFViewerProps> = ({ tabId, filePath }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)

  // Load PDF content
  const loadPDF = useCallback(async () => {
    if (!filePath) return

    try {
      setIsLoading(true)
      setError(null)
      
      console.log('📄 PDFViewer: Loading PDF for:', filePath)
      
      // Get file metadata first
      try {
        const metadata = await editorAPI.getFileMetadata(filePath)
        setFileSize(metadata.size || null)
      } catch (metaError) {
        console.warn('⚠️ PDFViewer: Could not get file metadata')
      }

      // Download PDF as blob
      const blob = await editorAPI.downloadFile(filePath)
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      
      console.log('✅ PDFViewer: PDF loaded successfully')
    } catch (error) {
      console.error('❌ PDFViewer: Error loading PDF:', error)
      setError(error instanceof Error ? error.message : 'Failed to load PDF')
    } finally {
      setIsLoading(false)
    }
  }, [filePath])

  // Download PDF
  const downloadPDF = useCallback(async () => {
    try {
      const blob = await editorAPI.downloadFile(filePath)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filePath.split('/').pop() || 'document.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('❌ PDFViewer: Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }, [filePath])

  // Open PDF in new tab
  const openInNewTab = useCallback(() => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank')
    }
  }, [pdfUrl])

  // Load PDF on mount
  useEffect(() => {
    loadPDF()
    
    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [loadPDF])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading PDF...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p className="mb-2">Error loading PDF</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadPDF}
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
        <div className="flex items-center space-x-4">
          <h3 className="font-medium text-gray-700">
            {filePath.split('/').pop()}
          </h3>
          {fileSize && (
            <span className="text-sm text-gray-500">
              {(fileSize / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={openInNewTab}
            className="flex items-center px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
            title="Open in New Tab"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            title="Download PDF"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 bg-gray-100">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={`PDF: ${filePath.split('/').pop()}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-center">
              <p>PDF could not be displayed</p>
              <button
                onClick={downloadPDF}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Download to View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PDFViewer
