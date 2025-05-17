'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Cell } from '../store/useNotebookStore';
import ReactMarkdown from 'react-markdown';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeMirrorEditor } from './CodeMirrorEditor';

interface MarkdownCellProps {
  cell: Cell;
  onContentChange: (content: string[]) => void;
}

export const MarkdownCell: React.FC<MarkdownCellProps> = ({
  cell,
  onContentChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing, handleKeyDown]);

  return (
    <Card 
      className={`relative ml-16 transition-all duration-200 rounded-lg ${isEditing ? 'p-0 ring-2 ring-primary shadow-lg' : 'p-6 hover:shadow-md hover:border-border/80'}`}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (!isEditing) {
          setIsEditing(true);
        }
      }}
    >
      {/* Edit button */}
      <Button
        variant="ghost"
        size="icon"
        className={`absolute right-3 top-3 h-7 w-7 ${isEditing ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'opacity-0 group-hover:opacity-100 hover:bg-muted'}`}
        onClick={() => setIsEditing(!isEditing)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {isEditing ? (
        <div className="p-6 bg-background/50 rounded-lg">
          <CodeMirrorEditor
            value={cell.content.join('\n')}
            onChange={(value) => onContentChange([value])}
            language="markdown"
          />
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2 border-t pt-3">
            Press <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to exit edit mode
          </div>
        </div>
      ) : (
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code: ({className, children, inline, ...props}: any) => {
                const match = /language-(\w+)/.exec(className || '')
                return !inline ? (
                  <div className="not-prose my-4">
                    <pre className="bg-muted/50 p-4 rounded-lg border overflow-x-auto">
                      <code
                        className={match ? `language-${match[1]}` : ''}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <code className="bg-muted/50 px-1.5 py-0.5 rounded text-primary" {...props}>
                    {children}
                  </code>
                )
              },
              pre: ({children, ...props}: any) => (
                <div className="not-prose my-4">
                  <pre className="bg-muted/50 p-4 rounded-lg border overflow-x-auto" {...props}>
                    {children}
                  </pre>
                </div>
              ),
              h1: (props: any) => <h1 className="text-2xl font-bold mb-4" {...props} />,
              h2: (props: any) => <h2 className="text-xl font-bold mb-3" {...props} />,
              h3: (props: any) => <h3 className="text-lg font-bold mb-2" {...props} />,
              p: (props: any) => <p className="mb-4 leading-relaxed" {...props} />,
              ul: (props: any) => <ul className="list-disc pl-6 mb-4" {...props} />,
              ol: (props: any) => <ol className="list-decimal pl-6 mb-4" {...props} />,
              blockquote: (props: any) => (
                <blockquote className="border-l-4 border-primary pl-4 italic my-4" {...props} />
              )
            }}
          >
            {cell.content[0]}
          </ReactMarkdown>
        </div>
      )}
    </Card>
  );
};