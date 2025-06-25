import React, { useEffect, useRef, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { StreamLanguage } from '@codemirror/language'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { useCodeEditor } from './hooks/useCodeEditor'
import { Loader2 } from 'lucide-react'

interface CodeEditorProps {
  tabId: string
  initialContent?: string
  extension?: string
  readOnly?: boolean
}

function CodeEditor({ tabId, initialContent = '', extension = '', readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  
  // Use the code editor hook
  const {
    activeContent,
    hasUnsavedChanges,
    isLoading,
    error,
    handleContentChange,
    saveFileContent
  } = useCodeEditor(tabId, initialContent)

  // Get language extension based on file extension
  const getLanguageExtension = (fileExtension: string) => {
    const ext = fileExtension.toLowerCase()
    
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return javascript()
      case 'py':
      case 'python':
        return python()
      case 'md':
        return markdown()
      case 'json':
        return json()
      case 'html':
      case 'htm':
        return html()
      case 'css':
        return css()
      case 'yml':
      case 'yaml':
        return StreamLanguage.define(yaml)
      case 'sh':
      case 'bash':
        return StreamLanguage.define(shell)
      default:
        return javascript()
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Save on Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveFileContent()
    }
  }, [saveFileContent])

  useEffect(() => {
    // Add keyboard shortcut listener
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (!editorRef.current) return

    // Destroy previous view if it exists
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    // Create editor state
    const state = EditorState.create({
      doc: activeContent,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        indentOnInput(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        
        // Enable autocompletion
        autocompletion(),
      
        
        getLanguageExtension(extension),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            handleContentChange(update.state.doc.toString())
          }
        }),
        EditorView.editable.of(!readOnly)
      ]
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
  }, [tabId, extension, readOnly]) // Don't include activeContent to prevent recreation on every change

  // Update content when it changes externally (not from user typing)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (activeContent !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: activeContent }
      })
    }
  }, [activeContent, tabId])

  return (
    <div className="relative h-full w-full">
      {/* Status indicators */}
      {isLoading && (
        <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white px-2 py-1 rounded-md flex items-center">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          <span className="text-xs">{activeContent === initialContent ? 'Loading...' : 'Saving...'}</span>
        </div>
      )}
      
      {error && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white px-2 py-1 rounded-md text-xs">
          {error}
        </div>
      )}
      
      {hasUnsavedChanges && !isLoading && (
        <div 
          className="absolute top-2 right-2 w-3 h-3 rounded-full bg-amber-400 z-10 cursor-pointer" 
          title="Unsaved changes (Ctrl+S to save)" 
          onClick={saveFileContent}
        />
      )}
      
      {/* Editor container */}
      <div className="h-full w-full overflow-auto" ref={editorRef} />
    </div>
  )
}

export default CodeEditor