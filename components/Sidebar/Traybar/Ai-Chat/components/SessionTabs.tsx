"use client";
import React from 'react';
import { X, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from './chatStore';

function SessionTabs() {
  const { openSessions, activeSessionId, switchSession, closeSession } = useChatStore();

  if (openSessions.length === 0) return null;

  return (
    <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto flex-shrink-0 tab-scroll-container">
      {openSessions.map((session) => (
        <div
          key={session.id}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 text-xs cursor-pointer group relative overflow-hidden flex-shrink-0',
            'transition-colors duration-150 border-r border-border',
            activeSessionId === session.id
              ? 'bg-background text-foreground font-medium'
              : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
          )}
          onClick={() => switchSession(session.id)}
          title={session.title}
        >
          <MessageSquare size={12} className="flex-shrink-0 opacity-60" />
          <span className="whitespace-nowrap max-w-[120px] truncate">
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
      ))}
    </div>
  );
}

export default SessionTabs;
