import React from 'react'
import { User } from 'lucide-react'
import {
  Message as AIMessage,
  MessageContent,
} from '@/components/ai-elements/message'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Message as ChatMessage } from './chatStore'
import { useAuthStore } from '@/lib/stores/auth-store'

interface UserMessageProps {
  message: ChatMessage
}

function UserMessage({ message }: UserMessageProps) {
  const user = useAuthStore((state) => state.user)

  const displayName = (() => {
    const fullName = user?.full_name?.trim()
    if (fullName) {
      const parts = fullName.split(/\s+/)
      return parts[parts.length - 1]
    }
    return user?.username || 'You'
  })()

  return (
    <AIMessage from="user" className="px-4 py-2">
      <div className="flex items-center gap-2 mb-1 ml-auto w-fit">
        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }) : ''}
        </span>
        <span className="text-xs font-medium text-foreground">{displayName}</span>
        <Avatar className="h-5 w-5">
          {user?.avatar && (
            <AvatarImage src={user.avatar} alt={displayName} />
          )}
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
      </div>
      <MessageContent className="text-xs leading-relaxed">
        {message.content}
      </MessageContent>
    </AIMessage>
  )
}

export default UserMessage