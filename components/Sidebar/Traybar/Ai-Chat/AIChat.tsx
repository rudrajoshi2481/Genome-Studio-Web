"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from './components/chatStore';
import { shallow } from 'zustand/shallow';
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
import ToolCodeMessage from './components/ToolCodeMessage';
import ChatGreeting from './components/ChatGreeting';
import ErrorMessage from './components/ErrorMessage';
import RetryMessage from './components/RetryMessage';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { ShieldCheck } from 'lucide-react';

import QueuePanel from './components/QueuePanel';
import HistoryPanel from './components/HistoryPanel';
import FileApprovalPanel from './components/FileApprovalPanel';
import { getApiBaseUrl } from '@/config/server';
import { Conversation as ConvType } from './components/chatStore';

function AIChat({ onClose }: { onClose?: () => void }) {
  const inputSetterRef = useRef<((text: string) => void) | null>(null);
  const {
    setCurrentConversation,
    clearMessages,
    messages,
    queuedMessages,
    queuedTodos,
    conversations,
    setConversations,
    currentConversationId,
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
  } = useChatStore(s => ({
    setCurrentConversation: s.setCurrentConversation,
    clearMessages: s.clearMessages,
    messages: s.messages,
    queuedMessages: s.queuedMessages,
    queuedTodos: s.queuedTodos,
    conversations: s.conversations,
    setConversations: s.setConversations,
    currentConversationId: s.currentConversationId,
    isLoading: s.isLoading,
    clearMentions: s.clearMentions,
    clearUploadedFiles: s.clearUploadedFiles,
    mentions: s.mentions,
    uploadedFiles: s.uploadedFiles,
    promptSuggestions: s.promptSuggestions,
    enabledDatabases: s.enabledDatabases,
    keepIntermediateFiles: s.keepIntermediateFiles,
    pendingFiles: s.pendingFiles,
    addPendingFiles: s.addPendingFiles,
    showFilePanel: s.showFilePanel,
    openSessions: s.openSessions,
    activeSessionId: s.activeSessionId,
    openSession: s.openSession,
    switchSession: s.switchSession,
    closeSession: s.closeSession,
    cacheCurrentSession: s.cacheCurrentSession,
    permissionMode: s.permissionMode,
    allowedTools: s.allowedTools,
    tokenUsage: s.tokenUsage,
    resetPermissionMode: s.resetPermissionMode,
  }), shallow);
  const { sendMessage, stopSending, stopCommand, sendAskUserResponse, sendToolApproval, sendCommand } = useChatWebSocket();

  const [showAllConvs, setShowAllConvs] = useState(false);
  const [showConvList, setShowConvList] = useState(false);
  const [isFetchingConvs, setIsFetchingConvs] = useState(false);
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
    // The zustand persist onRehydrateStorage already ensures at least one
    // session exists (creating a fresh "New Chat" if needed). Only open a
    // default tab here when rehydration left zero sessions — guards against
    // the rare case where rehydration hasn't run yet.
    const state = useChatStore.getState();
    if (state.openSessions.length === 0 && state.activeSessionId === null) {
      const tempId = `temp-${Date.now()}`;
      state.openSession(tempId, 'New Chat');
      state.setCurrentConversation(null);
    }
  }, []);

  const fetchConversations = async (fetchAll: boolean) => {
    setIsFetchingConvs(true);
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
      setIsFetchingConvs(false);
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
    const sessionId = conv.id;
    openSession(sessionId, conv.title || 'Chat');
    // CRITICAL: openSession treats any ID starting with "temp-" as a new
    // temporary session (setting currentConversationId=null, isNewChat=true).
    // But conversations from history may have temp-prefixed IDs (the backend
    // session store uses them as permanent conversation IDs). Override these
    // flags so the backend knows this is an existing conversation and loads
    // the previous messages into the agent's context.
    useChatStore.setState({
      currentConversationId: sessionId,
      isNewChat: false,
    });
    // Also update the session in openSessions so switching back to it later
    // preserves the correct state.
    useChatStore.setState((state) => ({
      openSessions: state.openSessions.map(s =>
        s.id === sessionId
          ? { ...s, currentConversationId: sessionId, isNewChat: false }
          : s
      ),
    }));
    setShowConvList(false);
    try {
      const url = `${getApiBaseUrl()}/ai-chat/conversations/${sessionId}/messages`;
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
        // Use updateMessagesInSession to set messages on the correct session,
        // even if the user switched to another tab during the fetch
        const store = useChatStore.getState();
        store.updateMessagesInSession(sessionId, () => transformed);
        // Only update top-level messages if this session is still active
        if (store.activeSessionId === sessionId) {
          useChatStore.setState({ messages: transformed });
        }
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
      // Always send the array (even when empty) so the backend applies
      // database filtering. Sending `undefined` makes the backend treat it
      // as "no filtering" and the AI can still query disabled databases.
      enabledDatabases,
      keepIntermediateFiles,
    });
  };

  const handlePromptSuggestion = (suggestion: string) => {
    if (inputSetterRef.current) {
      inputSetterRef.current(suggestion);
    } else {
      sendMessage(suggestion);
    }
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
      const lastUserIndex = messages.lastIndexOf(lastUserMsg);
      // Remove all messages after the last user message (AI responses, tools, reasoning, thinking, etc.)
      useChatStore.setState((state) => ({
        messages: state.messages.slice(0, lastUserIndex + 1),
      }));
      sendMessage(lastUserMsg.content);
    }
  };

  const renderMessage = (message: any, index: number) => {
    const groupedTypes = ['tool', 'tool_code', 'reasoning', 'plan', 'task', 'confirmation', 'thinking', 'error', 'retry'];
    const isGrouped = index > 0 && groupedTypes.includes(message.type);
    const wrapperClass = isGrouped ? '-mt-1' : '';
    const isLast = index === messages.length - 1;

    const content = (() => {
    switch (message.type) {
      case 'human':
        return <UserMessage key={message.id} message={message} isLast={isLast} onEdit={handleEditMessage} onDelete={handleDeleteMessage} />;
      case 'ai':
        return <AIMessage key={message.id} message={message} isLast={isLast} isLoading={isLoadingConvs} onRegenerate={handleRegenerate} onDelete={handleDeleteMessage} />;
      case 'tool':
        return <ToolMessage key={message.id} message={message} isLast={isLast} onStopCommand={stopCommand} onApprove={(id, approvalMode) => {
          const toolMessageId = message.metadata?.toolMessageId || id;
          sendToolApproval(toolMessageId, true, undefined, approvalMode);
        }} onReject={(id) => {
          const toolMessageId = message.metadata?.toolMessageId || id;
          sendToolApproval(toolMessageId, false);
        }} />;
      case 'tool_code':
        return <ToolCodeMessage key={message.id} message={message} isLast={isLast} onStopCommand={stopCommand} />;
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
          <div key={message.id} className="flex items-center gap-2 py-1 px-1 text-xs text-muted-foreground/70">
            <span className="inline-block size-1.5 rounded-full bg-current animate-pulse" />
            <span className="text-muted-foreground/60">{message.content || 'Thinking...'}</span>
          </div>
        );
      case 'stream':
        return <AIMessage key={message.id} message={message} isLast={isLast} isLoading={isLoadingConvs} onRegenerate={handleRegenerate} onDelete={handleDeleteMessage} />;
      case 'system':
        return (
          <div key={message.id} className="text-sm text-muted-foreground text-center py-2 whitespace-pre-wrap font-sans">
            {message.content}
          </div>
        );
      case 'error':
        return <ErrorMessage key={message.id} message={message} onRetry={handleRegenerate} />;
      case 'retry':
        return <RetryMessage key={message.id} message={message} />;
      case 'separator':
        return (
          <div key={message.id} className="flex items-center gap-2 py-2 px-1 select-none">
            <div className="flex-1 h-px bg-border/50" />
            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <div className="flex-1 h-px bg-border/50" />
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
        // Toggling history open should NOT discard the current chat.
        // Just refresh the conversation list and reveal the panel.
        if (!showConvList) {
          fetchConversations(false);
        }
        setShowConvList(!showConvList);
      }} showHistory={showConvList} onClose={onClose} />

      <Conversation className="flex-1">
        <ConversationContent className="gap-0.5 px-1 py-2">
          {messages.length === 0 ? (
            <ChatGreeting />
          ) : (
            <>
              {messages.map((msg, idx) => renderMessage(msg, idx))}
              {isLoadingConvs && !messages.some(m => m.isStreaming) && !messages.some(m => m.type === 'thinking') && (
                <div className="flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground/70">
                  <span className="inline-block size-1.5 rounded-full bg-current animate-pulse" />
                  <span className="text-muted-foreground/60">
                    {messages.some(m => (m.type === 'tool' || m.type === 'tool_code') && m.isRunning)
                      ? 'Running tools...'
                      : 'Working...'}
                  </span>
                </div>
              )}
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
            isLoading={isFetchingConvs}
            showAll={showAllConvs}
            onToggleShowAll={handleToggleShowAll}
            onSelectConversation={handleSelectConversation}
            onConversationDeleted={(id) => {
              useChatStore.setState((state) => ({
                conversations: state.conversations.filter((c) => c.id !== id),
              }));
              // Close the session tab if it's open
              const state = useChatStore.getState();
              const session = state.openSessions.find(s => s.id === id);
              if (session) {
                state.closeSession(id);
              }
              // If the deleted conversation was the active one, start a new chat.
              // Read fresh state — the closure's currentConversationId may be stale.
              if (state.currentConversationId === id) {
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
        <Footer onSendMessage={handleSendMessage} onStop={stopSending} onSendCommand={sendCommand} setInputRef={(fn) => { inputSetterRef.current = fn; }} />
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

