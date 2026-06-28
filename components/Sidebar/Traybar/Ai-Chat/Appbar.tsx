"use client";

import { Button } from '@/components/ui/button'
import { Plus, History, PanelRightClose, X, MessageSquare } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useChatStore } from './components/chatStore'
import { cn } from '@/lib/utils'
import React from 'react'

function Appbar({ onNewChat, onToggleHistory, showHistory, onClose }: { onNewChat?: () => void; onToggleHistory?: () => void; showHistory?: boolean; onClose?: () => void }) {
  const { isConnected, openSessions, activeSessionId, switchSession, closeSession } = useChatStore()

  const handleNewChat = () => {
    onNewChat?.()
  }

  return (
    <TooltipProvider>
      <div className="border-b bg-background/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center h-9">
          {/* Session tabs - left side */}
          <div className="flex items-center flex-1 min-w-0 overflow-x-auto tab-scroll-container">
            {openSessions.length === 0 ? (
              <div className="flex items-center gap-2 px-3">
                <span
                  className={`size-2 rounded-full ring-1 ring-background ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                  title={isConnected ? 'Connected' : 'Disconnected'}
                />
                <span className="font-semibold text-xs text-muted-foreground">New Chat</span>
              </div>
            ) : (
              openSessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'flex items-center gap-1.5 h-9 px-3 text-xs cursor-pointer group relative overflow-hidden flex-shrink-0',
                    'transition-colors duration-150 border-r border-border',
                    activeSessionId === session.id
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                  )}
                  onClick={() => switchSession(session.id)}
                  title={session.title}
                >
                  <MessageSquare size={12} className="flex-shrink-0 opacity-60" />
                  <span className="whitespace-nowrap max-w-[140px] truncate">
                    {session.title}
                  </span>
                  <button
                    className="ml-1 opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-muted transition-all duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeSession(session.id);
                    }}
                    aria-label={`Close ${session.title} tab`}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Action buttons - right side */}
          <div className="flex items-center gap-0.5 px-2 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${showHistory ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={onToggleHistory}
                >
                  <History size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {showHistory ? 'Hide history' : 'Show history'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleNewChat}
                >
                  <Plus size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                New chat
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={onClose}
                >
                  <PanelRightClose size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Close panel
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default Appbar