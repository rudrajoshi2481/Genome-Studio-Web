import React from 'react'
import { User } from 'lucide-react'
import { Message } from './chatStore'

interface UserMessageProps {
  message: Message
}

function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex gap-3 px-4 py-3 bg-muted/20 group min-w-0 overflow-hidden">
      {/* Minimal Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-600 flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Minimal Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-medium text-foreground">You</span>
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : ''}
          </span>
        </div>

        {/* Message text */}
        <p className="text-xs leading-relaxed break-words text-foreground/90">
          {message.content}
        </p>
      </div>
    </div>
  )
}

export default UserMessage