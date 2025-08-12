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
import useRealtimeFileSync from '@/hooks/useRealtimeFileSync'
import { useTabStore } from '@/components/FileTabs/useTabStore'

interface CodeEditorProps {
  tabId: string
  initialContent?: string
  extension?: string
  readOnly?: boolean
}

function CodeEditor({ tabId, initialContent = '', extension = '', readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [filePath, setFilePath] = React.useState<string>('')
  
  // Use the code editor hook
  const {
    activeContent,
    hasUnsavedChanges,
    isLoading,
    error,
    handleContentChange,
    saveFileContent
  } = useCodeEditor(tabId, initialContent)

  // Get file path from tab store
  const tabStore = useTabStore();
  const activeTab = tabStore.getTab(tabId);

  // Update local file path state when tab changes
  React.useEffect(() => {
    if (activeTab?.path && activeTab.path !== filePath) {
      setFilePath(activeTab.path);
    }
  }, [activeTab?.path]); // Remove filePath from dependencies to prevent loop

  // Track if we're currently typing to prevent sync overwrites
  const isTypingRef = React.useRef(false);
  const lastUserInputRef = React.useRef(Date.now());

  // Real-time file sync integration - only enable if file path exists
  const { saveFile, forceSave, isConnected } = useRealtimeFileSync({
    filePath: filePath || '', // Ensure we have a valid file path
    onFileUpdated: (content, timestamp) => {
      console.log('Real-time file update received in CodeEditor:', timestamp);
      
      // Don't update if user is currently typing (within last 2 seconds)
      const timeSinceLastInput = Date.now() - lastUserInputRef.current;
      if (isTypingRef.current || timeSinceLastInput < 2000) {
        console.log('Skipping real-time update - user is typing');
        return;
      }
      
      // Only update if content is actually different
      if (content !== activeContent) {
        console.log('Applying real-time update to CodeEditor');
        
        // Update the CodeMirror editor view directly (don't trigger handleContentChange)
        const view = viewRef.current;
        if (view) {
          const currentContent = view.state.doc.toString();
          if (content !== currentContent) {
            view.dispatch({
              changes: { from: 0, to: currentContent.length, insert: content }
            });
          }
        }
        
        // Update the hook's state without triggering save
        // Note: We can't directly set activeContent as it's managed by useCodeEditor hook
        // The content will be updated through the CodeMirror view dispatch above
      }
    },
    onFileChanged: (changeType, content) => {
      console.log(`File ${changeType} in CodeEditor:`, filePath);
      if (changeType === 'deleted') {
        console.warn('File was deleted:', filePath);
      }
      // Don't auto-update on file changes to prevent overwrites
    },
    onError: (error) => {
      console.error('Real-time sync error in CodeEditor:', error);
    },
    autoSave: false, // Disable auto-save to prevent feedback loops
    saveDebounceMs: 1000
  });

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
            const newContent = update.state.doc.toString();
            
            // Check if this change was triggered by user input
            // For now, assume all changes are user input unless we're in the middle of a sync update
            const isUserInput = !isTypingRef.current || Date.now() - lastUserInputRef.current > 100;
            
            if (isUserInput) {
              // Mark that user is typing and update timestamp
              isTypingRef.current = true;
              lastUserInputRef.current = Date.now();
              
              // Clear typing flag after 1 second of no input
              setTimeout(() => {
                isTypingRef.current = false;
              }, 1000);
              
              // Manual save to real-time sync for user input (with debouncing)
              if (isConnected() && filePath && !readOnly) {
                saveFile(newContent);
              }
            }
            
            // Always update the local content state
            handleContentChange(newContent);
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