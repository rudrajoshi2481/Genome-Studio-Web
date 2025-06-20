import React, { useEffect, useRef } from 'react'
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

interface CodeEditorProps {
  content: string
  onChange: (value: string) => void
  extension?: string
  readOnly?: boolean
  hasUnsavedChanges?: boolean
}

function CodeEditor({ content, onChange, extension = '', readOnly = false, hasUnsavedChanges = false }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

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

  useEffect(() => {
    if (!editorRef.current) return

    // Create editor state
    const state = EditorState.create({
      doc: content,
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
            onChange(update.state.doc.toString())
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
  }, [extension, readOnly])

  // Update content when it changes externally
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (content !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: content }
      })
    }
  }, [content])

  return (
    <div className="relative h-full w-full">
      {hasUnsavedChanges && (
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-amber-400 z-10" title="Unsaved changes" />
      )}
      <div className="h-full w-full overflow-auto" ref={editorRef} />
    </div>
  )
}

export default CodeEditor