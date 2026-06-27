import React from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Terminal as TerminalIcon,
  FileEdit,
  Wrench,
  ChevronDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Message } from './chatStore'

interface ToolMessageProps {
  message: Message
}

function ToolMessage({ message }: ToolMessageProps) {
  const toolName = message.metadata?.toolName || message.toolName || 'tool'
  const toolArgs = message.metadata?.toolArgs || {}
  const isRunning = message.isRunning
  const rawOutput = message.result || ''
  const hasError = message.toolResult?.error

  const isCommandTool = toolName === 'run_command'
  const command = toolArgs?.command || ''
  const explanation = toolArgs?.explanation || ''

  const getIcon = () => {
    if (isCommandTool) return TerminalIcon
    if (toolName === 'file_edit') return FileEdit
    return Wrench
  }

  const Icon = getIcon()

  const statusBadge = isRunning ? (
    <Loader2 className="size-3 animate-spin text-muted-foreground" />
  ) : hasError ? (
    <AlertCircle className="size-3 text-red-600" />
  ) : (
    <CheckCircle2 className="size-3 text-green-600" />
  )

  return (
    <div className="px-3 py-0.5">
      {explanation && (
        <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">{explanation}</p>
      )}
      <Collapsible defaultOpen={isRunning} className="group not-prose mb-2 w-full rounded-md border">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <div className="flex flex-col min-w-0 flex-1">
              {isCommandTool && command ? (
                <span className="font-mono text-xs truncate">{command}</span>
              ) : (
                <span className="font-medium text-xs">
                  {toolName === 'file_edit' ? 'File Edit' : toolName}
                </span>
              )}
            </div>
            {statusBadge}
          </div>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-2 p-2.5 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in">
          {isCommandTool && rawOutput ? (
            <div className="flex flex-col overflow-hidden rounded-md border bg-zinc-950 text-zinc-100 max-h-48">
              <div className="flex items-center justify-between border-b border-zinc-800 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <TerminalIcon className="size-3" />
                  Output
                </div>
              </div>
              <div className="max-h-48 overflow-auto p-2.5 font-mono text-xs leading-relaxed">
                <pre className="whitespace-pre-wrap break-words">
                  <code>{rawOutput}</code>
                </pre>
              </div>
            </div>
          ) : rawOutput ? (
            <div className="rounded-md bg-muted/50 p-2 text-[11px]">
              {hasError && (
                <p className="text-destructive mb-1.5">{hasError}</p>
              )}
              <pre className="whitespace-pre-wrap break-words font-mono">
                {rawOutput}
              </pre>
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default ToolMessage