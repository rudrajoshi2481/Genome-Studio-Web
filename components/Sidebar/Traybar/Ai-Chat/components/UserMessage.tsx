import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import { HumanMessage } from './chatStore'

interface UserMessageProps {
  message: HumanMessage
}

function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex gap-3 p-4 group min-w-0 overflow-hidden flex-row-reverse border-b border-t">
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback className="bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 min-w-0 overflow-hidden text-right">
        {/* Header with name and timestamp */}
        <div className="flex items-center gap-2 mb-2 flex-wrap justify-end">
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          <Badge variant="default" className="text-xs px-2 py-0.5 font-medium">
            You
          </Badge>
        </div>

        {/* Message content */}
        <div className="min-w-0 overflow-hidden">
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-justify break-words">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  )
}

export default UserMessage