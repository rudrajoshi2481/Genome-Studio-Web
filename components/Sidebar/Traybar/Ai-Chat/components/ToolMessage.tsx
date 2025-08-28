import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Wrench, CheckCircle, XCircle } from 'lucide-react'
import { ToolMessage as ToolMessageType } from './chatStore'

interface ToolMessageProps {
  message: ToolMessageType
}

function ToolMessage({ message }: ToolMessageProps) {
  const hasResult = message.toolResult !== undefined
  const isSuccess = hasResult && !message.toolResult?.error

  return (
    <div className="flex gap-3 p-4 group min-w-0 overflow-hidden">
      {/* Tool Icon */}
      <div className="flex-shrink-0 mt-1">
        <div className="h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
          <Wrench className="h-4 w-4" />
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Header with tool name and timestamp */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="outline" className="text-xs px-2 py-0.5 font-medium">
            {message.toolName}
          </Badge>
          {hasResult && (
            <div className="flex items-center gap-1">
              {isSuccess ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isSuccess ? 'Success' : 'Error'}
              </span>
            </div>
          )}
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>

        {/* Tool content */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3">
            <div className="space-y-2">
              {/* Tool execution message */}
              <p className="text-xs text-amber-800 font-medium">
                {message.content}
              </p>
              
              {/* Tool result if available */}
              {hasResult && (
                <div className="mt-2 p-2 bg-white rounded border">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                    {typeof message.toolResult === 'string' 
                      ? message.toolResult 
                      : JSON.stringify(message.toolResult, null, 2)
                    }
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ToolMessage