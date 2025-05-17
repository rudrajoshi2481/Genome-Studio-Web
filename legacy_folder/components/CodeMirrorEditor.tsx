'use client'

import React, { useEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { indentWithTab, defaultKeymap } from '@codemirror/commands'
import { LanguageSupport } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  language?: 'python' | 'javascript' | 'markdown'
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  language = 'python'
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const lastLanguageRef = useRef(language)

  useEffect(() => {
    const initEditor = async () => {
      if (!editorRef.current || editorViewRef.current) return

      try {
        // Dynamically import language suppo
        const module = await import(`@codemirror/lang-${language}`)
        const languageSupport = new LanguageSupport(
          language === 'javascript' ? module.javascriptLanguage :
          language === 'python' ? module.pythonLanguage :
          module.markdownLanguage
        )

        const view = new EditorView({
          state: EditorState.create({
            doc: value || 'print("Hello World")',
            extensions: [
              keymap.of([...defaultKeymap, indentWithTab]),
              languageSupport,
              oneDark,
              EditorView.lineWrapping,
              EditorView.theme({
                '&': {
                  backgroundColor: 'transparent !important',
                  height: '100%',
                  minHeight: '100px'
                },
                '.cm-content': {
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                },
                '.cm-gutters': {
                  backgroundColor: 'transparent',
                  borderRight: 'none'
                },
                '.cm-activeLineGutter, .cm-activeLine': {
                  backgroundColor: 'rgba(0, 0, 0, 0.05)'
                },
                '.cm-line': {
                  padding: '0 2px 0 4px'
                }
              }),
              EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                  const docText = update.state.doc.toString()
                  if (docText !== value) {
                    onChange(docText)
                  }
                }
              })
            ]
          }),
          parent: editorRef.current
        })

        editorViewRef.current = view
      } catch (error) {
        console.error('Error initializing editor:', error)
      }
    }

    // Reinitialize editor if language changes
    if (lastLanguageRef.current !== language) {
      editorViewRef.current?.destroy()
      editorViewRef.current = null
      lastLanguageRef.current = language
    }

    initEditor()

    return () => {
      editorViewRef.current?.destroy()
      editorViewRef.current = null
    }
  }, [language])

  // Handle value updates
  useEffect(() => {
    const view = editorViewRef.current
    if (!view || view.state.doc.toString() === value) return

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value || ''
      }
    })
  }, [value])

  return (
    <div 
      ref={editorRef}
      className="w-full min-h-[100px] font-mono text-sm"
    />
  )
}