import React from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'
import {
  Message as AIMessageComponent,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import { Badge } from '@/components/ui/badge'
import { Message as ChatMessage } from './chatStore'

interface AIMessageProps {
  message: ChatMessage
}

function AIMessage({ message }: AIMessageProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AIMessageComponent from="assistant" className="px-4 py-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-5 w-5 rounded-md bg-gradient-to-br from-primary/80 to-primary/60 flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-primary-foreground" />
        </div>
        <span className="text-xs font-medium text-foreground">Genome Studio AI</span>
        {message.isStreaming && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0 animate-pulse">
            streaming
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }) : ''}
        </span>
      </div>
      <MessageContent className="text-xs leading-relaxed whitespace-normal [&_h1]:text-xs [&_h1]:font-semibold [&_h1]:my-1 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:my-1 [&_h3]:text-xs [&_h3]:font-medium [&_h3]:my-0.5 [&_p]:text-xs [&_p]:my-1 [&_p]:leading-relaxed [&_ul]:text-xs [&_ul]:my-1 [&_ol]:text-xs [&_ol]:my-1 [&_li]:text-xs [&_li]:my-0.5 [&_code]:text-[11px] [&_pre]:text-[11px] [&_pre]:my-1 [&_pre]:rounded-md [&_pre]:p-2 [&_blockquote]:text-xs [&_blockquote]:my-1 [&_blockquote]:pl-2 [&_a]:text-xs [&_hr]:my-1 [&_table]:text-xs [&_th]:text-xs [&_td]:text-xs [&_td]:p-1">
        <MessageResponse>{message.content}</MessageResponse>
      </MessageContent>
      {!message.isStreaming && message.content && (
        <MessageActions className="mt-1">
          <MessageAction
            tooltip="Copy"
            onClick={handleCopy}
            size="icon-sm"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </MessageAction>
        </MessageActions>
      )}
    </AIMessageComponent>
  )
}

export default AIMessage