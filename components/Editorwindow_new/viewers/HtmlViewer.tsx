import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Loader2, Code, Eye, Columns, RefreshCw } from 'lucide-react'
import { editorAPI } from '../services/EditorAPI'
import { useEditorContext } from '../context/EditorContext'
import { cn } from '@/lib/utils'

// Lazy load CodeEditor for source view
const CodeEditor = lazy(() => import('../editors/CodeEditor'))

interface HtmlViewerProps {
  tabId: string
  filePath: string
  extension?: string
  isActive?: boolean
}

type ViewMode = 'source' | 'split' | 'preview'

/**
 * HtmlViewer component for viewing HTML files with source code and live preview.
 * Supports three modes: Source (code editor), Split (side-by-side), Preview (rendered iframe).
 */
const HtmlViewer: React.FC<HtmlViewerProps> = ({ tabId, filePath, extension = 'html', isActive }) => {
  const [previewContent, setPreviewContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [refreshKey, setRefreshKey] = useState(0)

  const { getEditor } = useEditorContext()
  const editor = getEditor(tabId)

  // Load HTML content for the preview
  const loadContent = useCallback(async () => {
    if (!filePath) return

    try {
      setIsLoading(true)
      setError(null)

      const fileContent = await editorAPI.getFileContent(filePath)
      setPreviewContent(fileContent.content || '')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load HTML file'
      console.error('HtmlViewer: Error loading file:', msg)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [filePath])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  // Use content from EditorContext (updated by CodeEditor when user edits) for live preview
  const liveContent = editor?.content
  const iframeSrcDoc = useMemo(() => {
    const c = liveContent || previewContent
    return c || '<!DOCTYPE html><html><body></body></html>'
  }, [liveContent, previewContent, refreshKey])

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading HTML...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p className="mb-2">Error loading HTML file</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadContent}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const modeButtons: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'source', icon: <Code className="h-4 w-4" />, label: 'Source' },
    { mode: 'split', icon: <Columns className="h-4 w-4" />, label: 'Split' },
    { mode: 'preview', icon: <Eye className="h-4 w-4" />, label: 'Preview' },
  ]

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-1">
          {modeButtons.map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors',
                viewMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Source code panel — reuse CodeEditor with HTML syntax highlighting */}
        {viewMode !== 'preview' && (
          <div
            className={cn(
              'h-full overflow-hidden',
              viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full'
            )}
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Loading editor...</span>
                </div>
              }
            >
              <CodeEditor
                tabId={tabId}
                filePath={filePath}
                extension={extension}
              />
            </Suspense>
          </div>
        )}

        {/* Preview panel — render HTML in sandboxed iframe */}
        {viewMode !== 'source' && (
          <div
            className={cn(
              'h-full overflow-hidden bg-white',
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            )}
          >
            <iframe
              key={refreshKey}
              srcDoc={iframeSrcDoc}
              title="HTML Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default HtmlViewer
