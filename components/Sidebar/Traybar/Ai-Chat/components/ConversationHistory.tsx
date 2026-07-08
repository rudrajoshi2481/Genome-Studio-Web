"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Clock, Zap, FlaskConical, Code2, BarChart3, Dna, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useChatStore, Conversation } from './chatStore';
import { getApiBaseUrl } from '@/config/server';
import { cn } from '@/lib/utils';

interface ConversationHistoryProps {
  onNewConversation: () => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ onNewConversation }) => {
  const {
    conversations,
    setCurrentConversation,
    setConversations,
    isLoading,
    setLoading,
    currentConversationId,
  } = useChatStore();

  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchConversations(false);
  }, []);

  const fetchConversations = async (fetchAll: boolean) => {
    setLoading(true);
    try {
      const url = `${getApiBaseUrl()}/ai-chat/conversations${fetchAll ? '?all=true' : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShowAll = () => {
    const next = !showAll;
    setShowAll(next);
    fetchConversations(next);
  };

  const handleConversationClick = (conversation: Conversation) => {
    setCurrentConversation(conversation.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'research':
        return FlaskConical;
      case 'coding':
        return Code2;
      case 'analysis':
        return BarChart3;
      default:
        return Dna;
    }
  };

  const getAgentName = (agentType: string) => {
    switch (agentType) {
      case 'research':
        return 'Research Assistant';
      case 'coding':
        return 'Bioinformatics Programmer';
      case 'analysis':
        return 'Genomic Data Analyst';
      default:
        return 'Bioinformatics Studio AI';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <h2 className="text-xs font-semibold">Conversations</h2>
          </div>
          <Button
            onClick={onNewConversation}
            size="sm"
            variant="outline"
            className="h-6 text-[10px] gap-1"
          >
            <Plus className="size-3" />
            New
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Continue a previous conversation
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center mb-2">
                <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center">
                  <MessageSquare className="size-5 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-[10px] font-medium mb-1">No conversations yet</h3>
              <p className="text-[10px] text-muted-foreground mb-3">
                Start your first AI conversation
              </p>
              <Button onClick={onNewConversation} size="sm" className="h-6 text-[10px]">
                <Plus className="size-3 mr-1" />
                Start Chatting
              </Button>
            </div>
          ) : (
            conversations.map((conversation) => {
              const AgentIcon = getAgentIcon(conversation.agent_type);
              const isActive = currentConversationId === conversation.id;
              return (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={cn(
                    "w-full text-left rounded-lg p-2 transition-all duration-150 group/conv",
                    "border hover:shadow-sm",
                    isActive
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border/50 hover:border-border hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "shrink-0 size-6 rounded-md flex items-center justify-center mt-0.5",
                      isActive ? "bg-primary/15" : "bg-muted/50 group-hover/conv:bg-muted",
                    )}>
                      <AgentIcon className={cn("size-3", isActive ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[11px] truncate leading-tight">
                        {conversation.title}
                      </h3>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {getAgentName(conversation.agent_type)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="size-2.5" />
                          {conversation.message_count}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Zap className="size-2.5" />
                          {conversation.total_tokens_used > 1000
                            ? `${(conversation.total_tokens_used / 1000).toFixed(1)}k`
                            : conversation.total_tokens_used}
                        </span>
                        <span className="flex items-center gap-0.5 ml-auto">
                          <Clock className="size-2.5" />
                          {formatDate(conversation.last_message_at || conversation.updated_at)}
                        </span>
                      </div>
                    </div>
                    {conversation.status && conversation.status !== 'active' && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 shrink-0">
                        {conversation.status}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })
          )}
          {conversations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleShowAll}
              className="w-full text-[10px] text-muted-foreground hover:text-foreground h-6 mt-1"
            >
              {showAll ? (
                <>
                  <ChevronUp className="size-3 mr-0.5" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="size-3 mr-0.5" />
                  Show All
                </>
              )}
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationHistory;
