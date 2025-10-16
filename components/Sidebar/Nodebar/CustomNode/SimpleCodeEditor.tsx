"use client"

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

interface SimpleCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  extension?: string;
  readOnly?: boolean;
}

function SimpleCodeEditor({ value, onChange, extension = '', readOnly = false }: SimpleCodeEditorProps) {
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

    // Destroy previous view if it exists
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    // Create editor state
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        indentOnInput(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        autocompletion(),
        getLanguageExtension(extension),
        // oneDark,
        EditorView.updateListener.of(update => {
          if (update.docChanged && !readOnly) {
            onChange(update.state.doc.toString())
          }
        }),
        EditorView.editable.of(!readOnly)
      ]
    })

    // Create editor view with proper styling
    const view = new EditorView({
      state,
      parent: editorRef.current,
      root: editorRef.current.getRootNode() as Document | ShadowRoot
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [extension, readOnly]) // Intentionally not including value in deps to prevent recreation on every change

  // Handle value changes from outside
  useEffect(() => {
    const view = viewRef.current
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value }
      })
    }
  }, [value])

  return (
    <div className="w-full h-full overflow-auto">
      <div ref={editorRef} className="h-full min-h-full" style={{ minHeight: '100%' }} />
    </div>
  )
}

export default SimpleCodeEditor
