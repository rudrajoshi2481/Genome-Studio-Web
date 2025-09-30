import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Terminal, Code2, FileEdit } from 'lucide-react'
import { Message } from './chatStore'
import ReactMarkdown from 'react-markdown'

interface ToolMessageProps {
  message: Message
}

function ToolMessage({ message }: ToolMessageProps) {
  const toolName = message.metadata?.toolName || message.toolName || 'tool'
  
  // Determine icon based on tool type
  const getIcon = () => {
    if (toolName === 'run_command') return <Terminal className="h-3.5 w-3.5" />
    if (toolName === 'file_edit') return <FileEdit className="h-3.5 w-3.5" />
    return <Code2 className="h-3.5 w-3.5" />
  }

  return (
    <div className="flex gap-3 px-4 py-2 group">
      {/* Minimal Icon */}
      <div className="flex-shrink-0 mt-1">
        <div className="h-6 w-6 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
          {getIcon()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Tool badge */}
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
            {toolName}
          </Badge>
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : ''}
          </span>
        </div>

        {/* Tool message with markdown support */}
        <div className="prose prose-xs dark:prose-invert max-w-none">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                code: ({ className, children, ...props }: any) => {
                  const inline = !className
                  return inline ? (
                    <code className="px-1 py-0.5 rounded bg-muted text-[11px] font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <pre className="mt-2 p-3 rounded-lg bg-muted/50 border overflow-x-auto">
                      <code className="text-[11px] font-mono leading-relaxed block">{children}</code>
                    </pre>
                  )
                },
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ToolMessage