import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Terminal, Code2, FileEdit, Loader2, CheckCircle2 } from 'lucide-react'
import { Message } from './chatStore'
import ReactMarkdown from 'react-markdown'

interface ToolMessageProps {
  message: Message
}

function ToolMessage({ message }: ToolMessageProps) {
  const toolName = message.metadata?.toolName || message.toolName || 'tool'
  const toolArgs = message.metadata?.toolArgs || {}
  const isRunning = message.isRunning
  
  // Determine icon based on tool type
  const getIcon = () => {
    if (toolName === 'run_command') return <Terminal className="h-3.5 w-3.5" />
    if (toolName === 'file_edit') return <FileEdit className="h-3.5 w-3.5" />
    return <Code2 className="h-3.5 w-3.5" />
  }

  // Get tool details to display
  const getToolDetails = () => {
    if (toolName === 'run_command' && toolArgs.command) {
      return {
        label: 'Command',
        value: toolArgs.command,
        explanation: toolArgs.explanation
      }
    }
    if (toolName === 'file_edit' && toolArgs.filepath) {
      return {
        label: 'File',
        value: toolArgs.filepath,
        explanation: toolArgs.explanation
      }
    }
    return null
  }

  const toolDetails = getToolDetails()

  return (
    <div className="flex gap-3 px-4 py-2 group">
      {/* Icon with running indicator */}
      <div className="flex-shrink-0 mt-1">
        <div className={`h-6 w-6 rounded-md flex items-center justify-center relative ${
          isRunning 
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
            : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
        }`}>
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            getIcon()
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Tool badge with status */}
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
            {toolName}
          </Badge>
          {isRunning ? (
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></span>
              Running...
            </span>
          ) : (
            <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
          )}
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : ''}
          </span>
        </div>

        {/* Tool details (command/file) */}
        {toolDetails && (
          <div className="mb-2 text-[11px]">
            <span className="text-muted-foreground">{toolDetails.label}: </span>
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">
              {toolDetails.value}
            </code>
            {toolDetails.explanation && (
              <div className="mt-1 text-muted-foreground italic">
                {toolDetails.explanation}
              </div>
            )}
          </div>
        )}

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
                    <pre className="mt-2 p-3 rounded-lg bg-muted/50 border overflow-x-auto max-w-full">
                      <code className="text-[11px] font-mono leading-relaxed block whitespace-pre">{children}</code>
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