import React, { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { r } from '@codemirror/legacy-modes/mode/r';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { autocompletion, completionKeymap, closeBrackets, CompletionContext } from '@codemirror/autocomplete';
import type { Cell } from '../store/types';
import { notebookConfig } from '../config/editor';

interface CodeMirrorEditorProps {
  cell: Cell;
  onChange: (value: string[]) => void;
  onExecute?: () => void;
  readOnly?: boolean;
}

/**
 * Get the appropriate language extension for syntax highlighting.
 * Currently supported languages:
 * - Python (default)
 * - JavaScript/TypeScript
 * - Markdown
 * - R (via legacy mode)
 * - Bash (via legacy mode)
 */
// Create custom autocompletion for different languages
const createLanguageCompletion = (language: string) => {
  const pythonKeywords = ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield'];
  const pythonBuiltins = ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'map', 'filter', 'reduce'];
  
  const rKeywords = ['function', 'if', 'else', 'for', 'while', 'in', 'next', 'break', 'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA'];
  const rFunctions = ['mean', 'sum', 'max', 'min', 'length', 'paste', 'print', 'plot', 'data.frame', 'read.csv', 'write.csv'];
  
  const bashKeywords = ['if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'while', 'do', 'done', 'until', 'in'];
  const bashCommands = ['echo', 'cd', 'ls', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'find', 'chmod', 'chown'];

  return (context: CompletionContext) => {
    const word = context.matchBefore(/\w*/);;
    if (!word) return null;

    let options: { label: string; type: string }[] = [];
    
    switch (language) {
      case 'python':
        options = [
          ...pythonKeywords.map(k => ({ label: k, type: 'keyword' })),
          ...pythonBuiltins.map(b => ({ label: b, type: 'function' }))
        ];
        break;
      case 'r':
        options = [
          ...rKeywords.map(k => ({ label: k, type: 'keyword' })),
          ...rFunctions.map(f => ({ label: f, type: 'function' }))
        ];
        break;
      case 'bash':
        options = [
          ...bashKeywords.map(k => ({ label: k, type: 'keyword' })),
          ...bashCommands.map(c => ({ label: c, type: 'function' }))
        ];
        break;
    }

    return {
      from: word.from,
      options: options.filter(opt => opt.label.startsWith(word.text))
    };
  };
};

const getLanguageExtension = (language: string): LanguageSupport => {
  const lang = notebookConfig.languages.find(l => l.id === language);
  const mimeType = lang?.mimeType || 'text/x-python';


  let extension: LanguageSupport;
  // Map MIME types to available CodeMirror language extensions
  switch (mimeType) {
    case 'text/javascript':

      extension = javascript();
      break;
    case 'text/typescript':

      extension = javascript({ typescript: true });
      break;
    case 'text/x-python':

      extension = python();
      break;
    case 'text/x-r':

      extension = new LanguageSupport(
        StreamLanguage.define(r),
        [autocompletion({ override: [createLanguageCompletion('r')] })]
      );
      break;
    case 'text/x-sh':

      extension = new LanguageSupport(
        StreamLanguage.define(shell),
        [autocompletion({ override: [createLanguageCompletion('bash')] })]
      );
      break;
    default:
      console.warn(`[SyntaxHighlighting] No direct support for MIME type: ${mimeType}, using Python as fallback`);
      extension = python();
  }

  return extension;
};

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  cell,
  onChange,
  onExecute,
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const languageCompartmentRef = useRef<Compartment | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Clean up previous editor instance
    if (editorViewRef.current) {
      editorViewRef.current.destroy();
      editorViewRef.current = null;
    }

    // Create a compartment for language to allow dynamic switching
    languageCompartmentRef.current = new Compartment();
    
    // Basic editor setup with proper text direction and autocompletion
    const basicSetup = [
      // Enable autocompletion
      autocompletion(),
      closeBrackets(),
      keymap.of([...completionKeymap]),
      lineNumbers(),
      highlightActiveLine(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      rectangularSelection(),
      crosshairCursor(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        dir: 'ltr', // Force left-to-right text direction
        spellcheck: 'false',
      }),
      EditorView.theme({
        '&': {
          backgroundColor: 'transparent !important',
          height: 'auto',
          minHeight: '2.5em',
          maxHeight: '500px'
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
          backgroundColor: 'rgba(255, 255, 255, 0.05)'
        },
        '.cm-line': {
          padding: '0 2px 0 4px'
        },
        // Syntax highlighting colors
        '&.cm-focused': {
          outline: 'none'
        },
        '.cm-keyword': { color: '#cc7832' },
        '.cm-operator': { color: '#a9b7c6' },
        '.cm-variable-2': { color: '#a9b7c6' },
        '.cm-variable-3': { color: '#9876aa' },
        '.cm-builtin': { color: '#8888c6' },
        '.cm-atom': { color: '#cc7832' },
        '.cm-number': { color: '#6897bb' },
        '.cm-def': { color: '#ffc66d' },
        '.cm-string': { color: '#6a8759' },
        '.cm-string-2': { color: '#6a8759' },
        '.cm-comment': { color: '#808080' },
        '.cm-meta': { color: '#bbb529' },
        '.cm-tag': { color: '#629755' },
        '.cm-attribute': { color: '#6897bb' }
      }),
    ];
    
    // Keyboard handling
    const keyBindings = keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
      {
        key: "Shift-Enter",
        run: () => {
          if (onExecute) {
            onExecute();
            return true;
          }
          return false;
        },
        preventDefault: true
      },
    ]);
    
    // Theme and editor state
    const editorState = [
      basicSetup,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString();
          onChange([content]);
        }
      }),
      EditorView.domEventHandlers({
        keydown: (event, view) => {
          return false;
        }
      }),
      EditorView.editable.of(!readOnly),
      oneDark,
    ];
    
    // Determine language extension based on cell type and metadata
    const languageExtension = cell.cell_type === 'code' 
      ? getLanguageExtension(cell.metadata.language || notebookConfig.defaultLanguage)
      : markdown();
    
    // Combine all extensions
    const extensions = [
      ...basicSetup,
      keyBindings,
      ...editorState,
      languageCompartmentRef.current.of(languageExtension),
    ];

    // Join source array into a single string for the editor
    const sourceContent = cell.source.join('') || '';
    
    // Create editor state
    const startState = EditorState.create({
      doc: sourceContent,
      extensions,
    });

    // Create editor view with explicit direction settings
    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    // Store reference to editor view
    editorViewRef.current = view;

    // Focus the editor when it's created
    setTimeout(() => {
      view.focus();
    }, 100);

    return () => {
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
      }
    };
  }, [cell.id, cell.cell_type, readOnly]); // Removed onChange and onExecute from deps

  // Update content when cell.source changes
  useEffect(() => {
    if (!editorViewRef.current || !cell.source || cell.source.length === 0) return;
    const currentContent = editorViewRef.current.state.doc.toString();
    if (currentContent !== cell.source.join('\n')) {


      const transaction = editorViewRef.current.state.update({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: cell.source.join('\n')
        }
      });
      editorViewRef.current.dispatch(transaction);
    }
  }, [cell.source]);

  // Update the language when it changes
  useEffect(() => {
    if (!editorViewRef.current || !languageCompartmentRef.current) return;

    const extension = getLanguageExtension(cell.metadata?.language || 'python');
    const transaction = editorViewRef.current.state.update({
      effects: languageCompartmentRef.current.reconfigure(extension)
    });
    editorViewRef.current.dispatch(transaction);

  }, [cell.metadata?.language]);

  return (
    <div 
      ref={editorRef} 
      className="w-full h-full font-mono text-sm"
      style={{ minHeight: '2.5em' }}
    />
  );
};
