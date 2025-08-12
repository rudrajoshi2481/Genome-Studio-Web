import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLine, keymap, drawSelection, scrollPastEnd } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'
import { Loader2, Save, AlertCircle } from 'lucide-react'
import { editorAPI } from '../services/EditorAPI'
import { useEditorContext } from '../context/EditorContext'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import { FileType } from '../utils/fileTypeDetector'

interface CodeEditorProps {
  tabId: string
  filePath: string
  extension?: string
  readOnly?: boolean
}

/**
 * Enhanced CodeEditor component with better error handling and API integration
 */
const CodeEditor: React.FC<CodeEditorProps> = ({ 
  tabId, 
  filePath, 
  extension = '', 
  readOnly = false 
}) => {
  // Minimal logging for performance
  // console.log('📝 CodeEditor: Initializing for:', { tabId, filePath })

  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const { 
    registerEditor, 
    unregisterEditor, 
    updateContent, 
    setLoading, 
    setError, 
    setDirty, 
    setSaved,
    getEditor,
    setSyncStatus,
    state: { globalSettings }
  } = useEditorContext()
  
  const { updateTab } = useTabStore()
  const editor = getEditor(tabId)
  
  // Only log errors, not normal state
  // if (!editor) {
  //   console.log('📊 CodeEditor: No editor found in context for:', tabId)
  // }
  
  // Conditional real-time sync - only sync if this is the active tab
  const isActiveTab = () => {
    const activeTab = useTabStore.getState().getActiveTab()
    return activeTab?.id === tabId
  }

  // Real-time sync removed for new EditorWindow implementation
  // Focus on file loading, editing, and saving via new API
  
  // Local state for immediate UI updates
  const [localContent, setLocalContent] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Register editor on mount
  useEffect(() => {
    registerEditor(tabId, filePath, FileType.CODE)
    return () => unregisterEditor(tabId)
  }, [tabId, filePath, registerEditor, unregisterEditor])

  // Load file content with minimal logging
  const loadFileContent = useCallback(async () => {
    if (!filePath) return

    // Check if this is the active tab before loading
    if (!isActiveTab()) return

    try {
      setLoading(tabId, true)
      setError(tabId, null)
      
      const fileContent = await editorAPI.getFileContent(filePath)
      
      updateContent(tabId, fileContent.content, fileContent.version)
      setLocalContent(fileContent.content)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load file'
      console.error('❌ CodeEditor: Error loading file:', errorMessage)
      setError(tabId, errorMessage)
    } finally {
      setLoading(tabId, false)
    }
  }, [filePath, tabId, setLoading, setError, updateContent, isActiveTab])

  // Save file content with minimal logging
  const saveFileContent = useCallback(async (content?: string) => {
    if (!filePath || !editor) return

    const contentToSave = content || localContent
    if (contentToSave === editor.content && !editor.isDirty) return

    try {
      setLoading(tabId, true)
      setError(tabId, null)

      await editorAPI.updateFileContent(filePath, contentToSave, editor.version)
      
      updateContent(tabId, contentToSave, (editor.version || 1) + 1)
      setSaved(tabId, (editor.version || 1) + 1)
      updateTab(tabId, { isDirty: false })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file'
      setError(tabId, errorMessage)
      console.error('Failed to save file:', error)
    } finally {
      setLoading(tabId, false)
    }
  }, [filePath, editor, localContent, tabId, setLoading, setError, setSaved, updateTab])



  // Memoize language extension to prevent infinite re-renders
  const languageExtension = useMemo(() => {
    const ext = extension.toLowerCase()
    
    switch (ext) {
      // JavaScript/TypeScript
      case 'js':
      case 'jsx':
      case 'mjs':
        return javascript({ jsx: true })
      case 'ts':
      case 'tsx':
        return javascript({ jsx: true, typescript: true })
      
      // Python - Enhanced highlighting for .py files
      case 'py':
      case 'python':
      case 'pyw':
      case 'pyi':
        return python()
      
      // Web languages
      case 'html':
      case 'htm':
      case 'xhtml':
        return html()
      case 'css':
      case 'scss':
      case 'sass':
        return css()
      
      // Data formats
      case 'json':
      case 'jsonc':
        return json()
      
      // Documentation
      case 'md':
      case 'markdown':
      case 'mdown':
      case 'mkd':
        return markdown()
      
    
      // Text files and other extensions - use basic text highlighting
      case 'txt':
      case 'text':
      case 'readme':
      case 'xml':
      case 'xsl':
      case 'xsd':
      case 'svg':
      case 'php':
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'c++':
      case 'c':
      case 'h':
      case 'hpp':
      case 'java':
      case 'rs':
      case 'rust':
      case 'go':
      case 'yaml':
      case 'yml':
      case 'sh':
      case 'bash':
      case 'zsh':
      case 'fish':
      case 'ksh':
      case 'conf':
      case 'config':
      case 'ini':
      case 'properties':
      case 'env':
      case 'dockerfile':
      case 'sql':
      case 'mysql':
      case 'pgsql':
        // For unsupported languages, return empty array (basic text highlighting)
        return []
      
      default:
        // For unknown extensions, use basic text highlighting
        return []
    }
  }, [extension, filePath])

  // Handle keyboard shortcuts with minimal logging
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveFileContent()
    }
  }, [saveFileContent])

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorRef.current || !editor) return

    // Destroy previous view
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      indentOnInput(),
      // Add word wrap here
      EditorView.lineWrapping,
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([
        ...defaultKeymap, 
        ...historyKeymap, 
        ...completionKeymap,
        // Additional natural scrolling shortcuts
        {
          key: 'Ctrl-Home',
          run: (view) => {
            view.dispatch({
              selection: { anchor: 0 },
              scrollIntoView: true
            })
            return true
          }
        },
        {
          key: 'Ctrl-End',
          run: (view) => {
            const doc = view.state.doc
            view.dispatch({
              selection: { anchor: doc.length },
              scrollIntoView: true
            })
            return true
          }
        },
        {
          key: 'PageUp',
          run: (view) => {
            const { scrollTop, clientHeight } = view.scrollDOM
            view.scrollDOM.scrollTop = Math.max(0, scrollTop - clientHeight * 0.8)
            return true
          }
        },
        {
          key: 'PageDown',
          run: (view) => {
            const { scrollTop, clientHeight, scrollHeight } = view.scrollDOM
            view.scrollDOM.scrollTop = Math.min(scrollHeight - clientHeight, scrollTop + clientHeight * 0.8)
            return true
          }
        }
      ]),
      autocompletion(),
      languageExtension,
      
      // Enhanced scrolling and selection
      scrollPastEnd(),
      drawSelection(),
      
      // Better scrolling behavior and natural editor feel
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: `${globalSettings.fontSize || 14}px`
        },
        '.cm-editor': {
          height: '100%'
        },
        '.cm-content': {
          padding: '16px',
          minHeight: '100%',
          caretColor: globalSettings.theme === 'dark' ? '#fff' : '#000'
        },
        '.cm-focused': {
          outline: 'none'
        },
        '.cm-line': {
          padding: '0 2px',
          lineHeight: '1.6'
        },
        '.cm-cursor': {
          borderLeftColor: globalSettings.theme === 'dark' ? '#fff' : '#000'
        },
        '.cm-selectionBackground': {
          backgroundColor: globalSettings.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }),
      
      // Enable smooth scrolling and better scroll behavior
      EditorView.scrollMargins.of(f => ({
        top: 50,
        bottom: 50
      })),
      
     
      
      // Update listener for content changes
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString()
          setLocalContent(newContent)
          setIsTyping(true)
          
          // Mark as dirty if content changed
          const isDirty = newContent !== editor.content
          if (isDirty !== editor.isDirty) {
            setDirty(tabId, isDirty)
            updateTab(tabId, { isDirty })
          }
          
          // Auto-save disabled - manual save only
          // if (isDirty) {
          //   triggerAutoSave(newContent)
          // }
          
          // Clear typing flag after delay
          setTimeout(() => setIsTyping(false), 1000)
        }
      }),
      
      // Theme
      globalSettings.theme === 'dark' ? oneDark : [],
      
      // Read-only mode
      EditorView.editable.of(!readOnly)
    ]

    // Create editor state
    const state = EditorState.create({
      doc: editor.content || localContent,
      extensions
    })

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [
    editor?.content,
    extension, 
    globalSettings?.theme, 
    readOnly, 
    languageExtension, 
    tabId
  ])

  // Lazy load file content only when this tab is actually active
  useEffect(() => {
    const activeTab = useTabStore.getState().getActiveTab()
    const isActiveTab = activeTab?.id === tabId
    
    if (!isActiveTab || editor?.isDirty) return
    
    const timeoutId = setTimeout(() => {
      loadFileContent()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [tabId, filePath, editor?.isDirty]) // Removed loadFileContent to prevent infinite loop

  // Update editor content when context changes - but NOT when file is dirty
  useEffect(() => {
    const view = viewRef.current
    if (!view || !editor || editor.isDirty || isTyping) return

    const currentContent = view.state.doc.toString()
    if (editor.content !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: editor.content || '' }
      })
      setLocalContent(editor.content || '')
    }
  }, [editor?.content, editor?.isDirty, isTyping])

  // Keyboard shortcuts
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Cleanup auto-save timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Status indicators */}
      {/* {isLoading && (
        <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white px-2 py-1 rounded-md flex items-center">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          <span className="text-xs">{localContent === (editor?.content || '') ? 'Loading...' : 'Saving...'}</span>
        </div>
      )} */}
      
      {editor.error && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white px-2 py-1 rounded-md text-xs">
          {editor.error}
        </div>
      )}
      
      {/* {editor.isDirty && !editor.isLoading && (
        <div 
          className="absolute top-2 right-2 w-3 h-3 rounded-full bg-amber-400 z-10 cursor-pointer" 
          title="Unsaved changes (Ctrl+S to save)" 
          onClick={() => saveFileContent()}
        />
      )} */}
      
      {/* Editor container */}
      <div className="h-full w-full overflow-auto" ref={editorRef} />
    </div>
  )
}

export default CodeEditor
