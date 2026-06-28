"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import ChatGreeting from './components/ChatGreeting';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { PonderingIndicator, SpinnerMode } from './components/PonderingIndicator';
import QueuePanel from './components/QueuePanel';
import HistoryPanel from './components/HistoryPanel';
import FileApprovalPanel from './components/FileApprovalPanel';
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
    isLoading: isLoadingConvs,
    clearMentions,
    clearUploadedFiles,
    mentions,
    uploadedFiles,
    promptSuggestions,
    enabledDatabases,
    keepIntermediateFiles,
    pendingFiles,
    addPendingFiles,
    showFilePanel,
    openSessions,
    activeSessionId,
    openSession,
    switchSession,
    closeSession,
    cacheCurrentSession,
    permissionMode,
    allowedTools,
    tokenUsage,
    resetPermissionMode,
  } = useChatStore();
  const { sendMessage, stopSending, stopCommand, sendAskUserResponse, sendToolApproval, sendCommand } = useChatWebSocket();

  const [showAllConvs, setShowAllConvs] = useState(false);
  const [showConvList, setShowConvList] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wasLoadingRef = useRef(false);

  // Auto-process queued messages when loading finishes
  useEffect(() => {
    if (wasLoadingRef.current && !isLoadingConvs) {
      const { queuedMessages, removeQueuedMessage } = useChatStore.getState();
      if (queuedMessages.length > 0) {
        const nextMsg = queuedMessages[0];
        const text = nextMsg.parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join(' ')
          .trim();
        removeQueuedMessage(nextMsg.id);
        if (text) {
          handleSendMessage(text);
        }
      }
    }
    wasLoadingRef.current = isLoadingConvs;
  }, [isLoadingConvs]);

  useEffect(() => {
    fetchConversations(false);
    // Open a default "New Chat" tab on first load if no sessions are open
    const state = useChatStore.getState();
    if (state.openSessions.length === 0) {
      const tempId = `temp-${Date.now()}`;
      state.openSession(tempId, 'New Chat');
      state.setCurrentConversation(null);
    }
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
    // Cache current session before switching
    cacheCurrentSession();
    // Create a new temporary session tab — openSession resets all session-specific state
    const tempId = `temp-${Date.now()}`;
    openSession(tempId, 'New Chat');
    setShowConvList(false);
  };

  const handleSelectConversation = async (conv: ConvType) => {
    // Cache current session before switching
    cacheCurrentSession();
    // Check if this conversation is already open in a tab
    const existingSession = openSessions.find(s => s.id === conv.id);
    if (existingSession) {
      switchSession(conv.id);
      setShowConvList(false);
      return;
    }
    // Open a new tab for this conversation — openSession resets all session-specific state
    openSession(conv.id, conv.title || 'Chat');
    setShowConvList(false);
    try {
      const url = `${getApiBaseUrl()}/ai-chat/conversations/${conv.id}/messages`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Transform backend messages into frontend Message format
        const transformed: any[] = [];
        for (const msg of data) {
          if (msg.type === 'tool') {
            // Reconstruct tool message from stored content
            transformed.push({
              id: msg.id,
              type: 'tool',
              role: 'tool',
              content: '',
              result: msg.content || '',
              toolName: msg.parts?.find((p: any) => p.type === 'tool')?.metadata?.tool || 'tool',
              timestamp: msg.created_at,
              isRunning: false,
              metadata: {
                toolName: msg.parts?.find((p: any) => p.type === 'tool')?.metadata?.tool || 'tool',
                toolArgs: msg.parts?.find((p: any) => p.type === 'tool')?.content
                  ? (() => { try { return JSON.parse(msg.parts.find((p: any) => p.type === 'tool').content); } catch { return {}; } })()
                  : {},
                toolMessageId: msg.id,
              },
            });
          } else if (msg.type === 'human') {
            transformed.push({
              id: msg.id,
              type: 'human',
              role: 'user',
              content: msg.content || '',
              timestamp: msg.created_at,
            });
          } else {
            // AI message — check for reasoning parts
            const reasoningPart = msg.parts?.find((p: any) => p.type === 'reasoning');
            const toolParts = msg.parts?.filter((p: any) => p.type === 'tool') || [];
            transformed.push({
              id: msg.id,
              type: 'ai',
              role: 'assistant',
              content: msg.content || '',
              isStreaming: false,
              isComplete: true,
              timestamp: msg.created_at,
              reasoning: reasoningPart ? {
                content: reasoningPart.content || '',
                isStreaming: false,
              } : undefined,
              metadata: toolParts.length > 0 ? {
                toolCalls: toolParts.map((p: any) => {
                  try { return JSON.parse(p.content); } catch { return { name: p.metadata?.tool, args: {} }; }
                }),
              } : undefined,
            });
          }
        }
        useChatStore.setState({ messages: transformed });
        // Also update the session's messages in openSessions
        useChatStore.getState().cacheCurrentSession();
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
    const attachments = uploadedFiles.map(f => ({
      type: 'file' as const,
      name: f.name,
      path: f.name,
    }));
    sendMessage(content, model, {
      mentions: mentions.length > 0 ? mentions : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      enabledDatabases: enabledDatabases.length > 0 ? enabledDatabases : undefined,
      keepIntermediateFiles,
    });
  };

  const handlePromptSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleDeleteMessage = (id: string) => {
    useChatStore.setState((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  };

  const handleEditMessage = (id: string, newContent: string) => {
    useChatStore.setState((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: newContent } : m
      ),
    }));
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.type === 'human');
    if (lastUserMsg) {
      const aiMessages = messages.filter((m) => m.type === 'ai' || m.type === 'stream');
      const lastAiMsg = aiMessages[aiMessages.length - 1];
      if (lastAiMsg) {
        useChatStore.setState((state) => ({
          messages: state.messages.filter((m) => m.id !== lastAiMsg.id),
        }));
      }
      sendMessage(lastUserMsg.content);
    }
  };

  const renderMessage = (message: any, index: number) => {
    const groupedTypes = ['tool', 'reasoning', 'plan', 'task', 'confirmation'];
    const isGrouped = index > 0 && groupedTypes.includes(message.type);
    const wrapperClass = isGrouped ? '-mt-4' : '';
    const isLast = index === messages.length - 1;

    const content = (() => {
    switch (message.type) {
      case 'human':
        return <UserMessage key={message.id} message={message} isLast={isLast} onEdit={handleEditMessage} />;
      case 'ai':
        return <AIMessage key={message.id} message={message} isLast={isLast} isLoading={isLoadingConvs} onRegenerate={handleRegenerate} />;
      case 'tool':
        return <ToolMessage key={message.id} message={message} isLast={isLast} onStopCommand={stopCommand} onApprove={(id, approvalMode) => {
          const toolMessageId = message.metadata?.toolMessageId || id;
          sendToolApproval(toolMessageId, true, undefined, approvalMode);
        }} onReject={(id) => {
          const toolMessageId = message.metadata?.toolMessageId || id;
          sendToolApproval(toolMessageId, false);
        }} />;
      case 'confirmation':
        return <ConfirmationMessage key={message.id} message={message} onApprove={(toolName, approved, _reason, approvalMode) => {
          const toolMessageId = message.metadata?.toolMessageId || message.id;
          sendToolApproval(toolMessageId, approved, undefined, approvalMode);
        }} onRespond={(toolMessageId, response) => sendAskUserResponse(toolMessageId, response)} />;
      case 'reasoning':
        return <ReasoningMessage key={message.id} message={message} />;
      case 'plan':
        return <PlanMessage key={message.id} message={message} />;
      case 'task':
        return <TaskMessage key={message.id} message={message} />;
      case 'thinking':
        return (
          <div key={message.id} className="py-1">
            <PonderingIndicator verb={message.content || undefined} mode="thinking" />
          </div>
        );
      case 'stream':
        return <AIMessage key={message.id} message={message} isLast={isLast} isLoading={isLoadingConvs} onRegenerate={handleRegenerate} />;
      case 'system':
        return (
          <div key={message.id} className="text-xs text-muted-foreground text-center py-2 whitespace-pre-wrap">
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
        <ConversationContent className="gap-2 p-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <ChatGreeting />
          ) : (
            <>
              {messages.map((msg, idx) => renderMessage(msg, idx))}
              {isLoadingConvs && !messages.some(m => m.isStreaming) && !messages.some(m => m.type === 'thinking') && (() => {
                const hasRunningTools = messages.some(m => m.type === 'tool' && m.isRunning);
                const spinnerMode: SpinnerMode = hasRunningTools ? 'tool-use' : 'requesting';
                return (
                  <PonderingIndicator
                    tokenCount={tokenUsage.outputTokens || undefined}
                    mode={spinnerMode}
                    hasActiveTools={hasRunningTools}
                  />
                );
              })()}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {(queuedMessages.length > 0 || queuedTodos.length > 0) && (
        <div className="px-3 pb-1">
          <QueuePanel onSendMessage={handleSendMessage} />
        </div>
      )}

      {showFilePanel && pendingFiles.length > 0 && (
        <FileApprovalPanel sessionId={currentConversationId} />
      )}

      {showConvList && (
        <div className="border-t bg-background/95 backdrop-blur-sm">
          <HistoryPanel
            conversations={conversations}
            currentConversationId={currentConversationId}
            isLoading={isLoadingConvs}
            showAll={showAllConvs}
            onToggleShowAll={handleToggleShowAll}
            onSelectConversation={handleSelectConversation}
            onConversationDeleted={(id) => {
              useChatStore.setState((state) => ({
                conversations: state.conversations.filter((c) => c.id !== id),
              }));
              if (currentConversationId === id) {
                handleNewConversation();
              }
            }}
          />
        </div>
      )}

      <div className='p-3 pt-1'>
        {allowedTools.length > 0 && permissionMode !== 'bypass' && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              <ShieldCheck className="size-2.5" />
              {allowedTools.length} tool{allowedTools.length > 1 ? 's' : ''} auto-approved
            </span>
          </div>
        )}
        <Footer key={activeSessionId} onSendMessage={handleSendMessage} onStop={stopSending} onSendCommand={sendCommand} />
      </div>

      {promptSuggestions.length > 0 && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-thin">
          {promptSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => handlePromptSuggestion(s)}
              className="text-xs px-2 py-1 rounded-md border bg-background hover:bg-accent transition-colors text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AIChat;

