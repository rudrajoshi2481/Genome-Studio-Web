import React, { useState, useCallback } from 'react'
import { Download, FileText, AlertCircle } from 'lucide-react'
import { editorAPI } from '../services/EditorAPI'
import { toast } from 'sonner'

interface UnsupportedFileViewerProps {
  tabId: string
  filePath: string
}

/**
 * UnsupportedFileViewer component for files that don't have a specific viewer
 * Provides download functionality and file information
 */
const UnsupportedFileViewer: React.FC<UnsupportedFileViewerProps> = ({ tabId, filePath }) => {
  const [isDownloading, setIsDownloading] = useState(false)

  // Get file extension and name
  const fileName = filePath.split('/').pop() || 'Unknown File'
  const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN'

  // Download file
  const downloadFile = useCallback(async () => {
    try {
      setIsDownloading(true)
      const blob = await editorAPI.downloadFile(filePath)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('File downloaded successfully')
    } catch (error) {
      console.error('❌ UnsupportedFileViewer: Error downloading file:', error)
      toast.error('Failed to download file')
    } finally {
      setIsDownloading(false)
    }
  }, [filePath, fileName])

  // Get file type suggestions
  const getSuggestions = () => {
    const ext = fileExtension.toLowerCase()
    
    switch (ext) {
      case 'exe':
      case 'msi':
      case 'dmg':
        return 'This appears to be an executable file. Download to run on your system.'
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return 'This is an archive file. Download and extract to view contents.'
      case 'bin':
      case 'dat':
      case 'db':
        return 'This is a binary data file. Use appropriate software to open.'
      case 'log':
        return 'This is a log file. Consider opening as text if it contains readable content.'
      default:
        return 'This file type is not directly supported in the editor. Download to view with appropriate software.'
    }
  }

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        {/* File icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
            <FileText className="w-10 h-10 text-gray-500" />
          </div>
        </div>

        {/* File info */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {fileName}
        </h2>
        
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 mb-4">
          {fileExtension} File
        </div>

        {/* Warning message */}
        <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-yellow-800 text-left">
            <p className="font-medium mb-1">Preview not available</p>
            <p>{getSuggestions()}</p>
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={downloadFile}
          disabled={isDownloading}
          className="flex items-center justify-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5 mr-2" />
          {isDownloading ? 'Downloading...' : 'Download File'}
        </button>

        {/* File path */}
        <p className="text-xs text-gray-500 mt-4 font-mono break-all">
          {filePath}
        </p>
      </div>
    </div>
  )
}

export default UnsupportedFileViewer
