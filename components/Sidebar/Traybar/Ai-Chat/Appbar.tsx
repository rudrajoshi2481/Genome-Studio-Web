"use client";

import { Button } from '@/components/ui/button'
import { Plus, History, PanelRightClose, X, MessageSquare, XCircle, Copy, Minimize2, ChevronsRight, ChevronsLeft } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useChatStore } from './components/chatStore'
import { cn } from '@/lib/utils'
import React from 'react'

function Appbar({ onNewChat, onToggleHistory, showHistory, onClose }: { onNewChat?: () => void; onToggleHistory?: () => void; showHistory?: boolean; onClose?: () => void }) {
  const { isConnected, openSessions, activeSessionId, switchSession, closeSession, isLoading, currentStreamingMessageId } = useChatStore()

  const handleNewChat = () => {
    onNewChat?.()
  }

  const handleCloseOthers = (id: string) => {
    openSessions.forEach((s) => {
      if (s.id !== id) closeSession(s.id)
    })
  }

  const handleCloseToRight = (id: string) => {
    const currentIndex = openSessions.findIndex((s) => s.id === id)
    openSessions.slice(currentIndex + 1).forEach((s) => closeSession(s.id))
  }

  const handleCloseToLeft = (id: string) => {
    const currentIndex = openSessions.findIndex((s) => s.id === id)
    openSessions.slice(0, currentIndex).forEach((s) => closeSession(s.id))
  }

  const handleCloseAll = () => {
    openSessions.forEach((s) => closeSession(s.id))
  }

  const handleCopySessionId = (id: string) => {
    navigator.clipboard.writeText(id)
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
              openSessions.map((session) => {
                const currentIndex = openSessions.findIndex((s) => s.id === session.id)
                const hasTabsToRight = currentIndex < openSessions.length - 1
                const hasTabsToLeft = currentIndex > 0
                const hasOtherTabs = openSessions.length > 1

                const isActive = activeSessionId === session.id
                const isStreaming = isActive
                  ? (isLoading || currentStreamingMessageId !== null)
                  : (session.isLoading || session.currentStreamingMessageId !== null)

                return (
                <ContextMenu key={session.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 h-9 px-3 text-xs cursor-pointer group relative overflow-hidden flex-shrink-0',
                        'transition-all duration-150 border-r border-border border-b-2',
                        isActive
                          ? 'bg-background text-foreground font-medium border-b-green-500'
                          : 'text-muted-foreground hover:bg-background/50 hover:text-foreground border-b-transparent',
                        isStreaming && !isActive && 'border-b-green-500',
                      )}
                      onClick={() => switchSession(session.id)}
                      onAuxClick={(e) => {
                        if (e.button === 1) {
                          e.preventDefault();
                          closeSession(session.id);
                        }
                      }}
                      title={session.title}
                    >
                      {isStreaming && (
                        <span className="relative z-10 inline-flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse mr-1.5" />
                      )}
                      <MessageSquare size={12} className={cn('flex-shrink-0 relative z-10 transition-colors', isActive ? 'text-green-500' : 'opacity-60')} />
                      <span className="whitespace-nowrap max-w-[140px] truncate relative z-10">
                        {session.title}
                      </span>
                      <button
                        className={cn(
                          'ml-1 rounded p-0.5 hover:bg-muted transition-all duration-150 relative z-10',
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}
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
                  </ContextMenuTrigger>

                  <ContextMenuContent className="w-56">
                    <ContextMenuItem onClick={() => closeSession(session.id)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Close
                    </ContextMenuItem>

                    <ContextMenuItem onClick={() => handleCloseOthers(session.id)} disabled={!hasOtherTabs}>
                      <Minimize2 className="mr-2 h-4 w-4" />
                      Close Others
                    </ContextMenuItem>

                    <ContextMenuItem onClick={() => handleCloseToRight(session.id)} disabled={!hasTabsToRight}>
                      <ChevronsRight className="mr-2 h-4 w-4" />
                      Close to the Right
                    </ContextMenuItem>

                    <ContextMenuItem onClick={() => handleCloseToLeft(session.id)} disabled={!hasTabsToLeft}>
                      <ChevronsLeft className="mr-2 h-4 w-4" />
                      Close to the Left
                    </ContextMenuItem>

                    <ContextMenuItem onClick={handleCloseAll}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Close All
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem onClick={() => handleCopySessionId(session.id)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Session ID
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                )
              })
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