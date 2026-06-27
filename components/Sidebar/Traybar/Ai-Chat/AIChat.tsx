"use client";

import React, { useState, useEffect } from 'react';
import { useChatStore } from './components/chatStore';
import { useChatWebSocket } from './hooks/useChatWebSocket';
import Appbar from './Appbar';
import Footer from './Footer';
import UserMessage from './components/UserMessage';
import AIMessage from './components/AIMessage';
import ReasoningMessage from './components/ReasoningMessage';
import PlanMessage from './components/PlanMessage';
import TaskMessage from './components/TaskMessage';
import ConfirmationMessage from './components/ConfirmationMessage';
import ToolMessage from './components/ToolMessage';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Suggestions,
  Suggestion,
} from '@/components/ai-elements/suggestion';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import QueuePanel from './components/QueuePanel';
import { getApiBaseUrl } from '@/config/server';
import { Conversation as ConvType } from './components/chatStore';

function AIChat({ onClose }: { onClose?: () => void }) {
  const {
    setCurrentConversation,
    clearMessages,
    messages,
    queuedMessages,
    queuedTodos,
    conversations,
    setConversations,
    currentConversationId,
    setLoading,
    isLoading: isLoadingConvs
  } = useChatStore();
  const { sendMessage, stopSending } = useChatWebSocket();

  const [showAllConvs, setShowAllConvs] = useState(false);
  const [showConvList, setShowConvList] = useState(false);

  useEffect(() => {
    fetchConversations(false);
  }, []);

  const fetchConversations = async (fetchAll: boolean) => {
    setLoading(true);
    try {
      const url = `${getApiBaseUrl()}/ai-chat/conversations${fetchAll ? '?all=true' : ''}`;
      const response = await fetch(url);
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

  const handleNewConversation = () => {
    setCurrentConversation(null);
    clearMessages();
    setShowConvList(false);
  };

  const handleSelectConversation = async (conv: ConvType) => {
    setCurrentConversation(conv.id);
    clearMessages();
    setShowConvList(false);
    try {
      const url = `${getApiBaseUrl()}/ai-chat/conversations/${conv.id}/messages`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Load messages into the store
        useChatStore.setState({ messages: data });
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    }
  };

  const handleToggleShowAll = () => {
    const next = !showAllConvs;
    setShowAllConvs(next);
    fetchConversations(next);
  };

  const handleSendMessage = (content: string, model?: string) => {
    setShowConvList(false);
    sendMessage(content, model);
  };

  const handleSuggestion = (suggestion: string) => {
    setShowConvList(false);
    sendMessage(suggestion);
  };

  const renderMessage = (message: any, index: number) => {
    const groupedTypes = ['tool', 'reasoning', 'plan', 'task', 'confirmation'];
    const isGrouped = index > 0 && groupedTypes.includes(message.type);
    const wrapperClass = isGrouped ? '-mt-2' : '';
    
    const content = (() => {
    switch (message.type) {
      case 'human':
        return <UserMessage key={message.id} message={message} />;
      case 'ai':
        return <AIMessage key={message.id} message={message} />;
      case 'tool':
        return <ToolMessage key={message.id} message={message} />;
      case 'reasoning':
        return <ReasoningMessage key={message.id} message={message} />;
      case 'plan':
        return <PlanMessage key={message.id} message={message} />;
      case 'task':
        return <TaskMessage key={message.id} message={message} />;
      case 'confirmation':
        return <ConfirmationMessage key={message.id} message={message} />;
      case 'thinking':
        return (
          <div key={message.id} className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />
            <span>{message.content}</span>
          </div>
        );
      case 'stream':
        return <AIMessage key={message.id} message={message} />;
      case 'system':
        return (
          <div key={message.id} className="text-xs text-muted-foreground text-center py-2">
            {message.content}
          </div>
        );
      default:
        return null;
    }
    })();

    if (wrapperClass) {
      return <div key={message.id} className={wrapperClass}>{content}</div>;
    }
    return content;
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <Appbar onNewChat={handleNewConversation} onToggleHistory={() => {
        if (!showConvList && conversations.length === 0) {
          fetchConversations(false);
        }
        setShowConvList(!showConvList);
      }} showHistory={showConvList} onClose={onClose} />

      <Conversation className="flex-1">
        <ConversationContent className="gap-4 p-3">
          {messages.length === 0 ? (
            <>
              <ConversationEmptyState
                title="Start a conversation"
                description="Ask about genome analysis or workflows"
                icon={<Sparkles className="size-8" />}
              />
              <div className="space-y-3">
                <Suggestions className="justify-center">
                  {[
                    "Analyze my genome data",
                    "Create a workflow",
                    "Help with code",
                    "Explain a gene variant",
                    "Search for genetic markers",
                    "Compare genome assemblies",
                  ].map((suggestion) => (
                    <Suggestion
                      key={suggestion}
                      suggestion={suggestion}
                      onClick={handleSuggestion}
                    />
                  ))}
                </Suggestions>
              </div>
            </>
          ) : (
            messages.map((msg, idx) => renderMessage(msg, idx))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {(queuedMessages.length > 0 || queuedTodos.length > 0) && (
        <div className="px-3 pb-1">
          <QueuePanel onSendMessage={handleSendMessage} />
        </div>
      )}

      {/* Conversation tabs */}
      {showConvList && conversations.length > 0 && (
        <div className="px-3 pb-1 space-y-0.5">
          <button
            onClick={handleToggleShowAll}
            className="ml-auto flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground px-1 py-0.5"
          >
            {showAllConvs ? (
              <><ChevronUp className="size-3" /> Show Less</>
            ) : (
              <><ChevronDown className="size-3" /> Show All</>
            )}
          </button>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className={`w-full text-left rounded-md px-2 py-1 text-xs font-medium transition-colors truncate ${
                currentConversationId === conv.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {conv.title || 'Untitled'}
            </button>
          ))}
        </div>
      )}

      <div className='p-3 pt-1'>
        <Footer onSendMessage={handleSendMessage} onStop={stopSending} />
      </div>
    </div>
  );
}

export default AIChat;

