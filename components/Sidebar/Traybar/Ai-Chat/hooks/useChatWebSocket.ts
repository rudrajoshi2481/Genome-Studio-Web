import { useEffect, useRef, useCallback } from 'react';
import { useChatStore, type ChatMentionItem, type UploadedFile } from '../components/chatStore';
import { wsService } from './wsService';

export interface SendMessageOptions {
  mentions?: ChatMentionItem[];
  attachments?: Array<{ type: 'file'; path?: string; name?: string; lines?: string; url?: string; mediaType?: string }>;
  command?: string;
  commandArgs?: string[];
  agent?: string;
  enabledDatabases?: string[];
  rootPath?: string;
  keepIntermediateFiles?: boolean;
}

export const useChatWebSocket = () => {
  const {
    addMessage,
    updateStreamingMessage,
    setStreamingMessage,
    setConnectionStatus,
    setLoading,
    isConnected,
    currentStreamingMessageId,
    currentConversationId,
    isNewChat,
    setTokenUsage,
    stopGeneration,
    setCurrentReasoningId,
  } = useChatStore();

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingAskUserResolverRef = useRef<((response: string) => void) | null>(null);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await wsService.connect();
        setConnectionStatus(true);
      } catch (error) {
        // Silently handle connection failures - will retry automatically
        if (process.env.NODE_ENV === 'development') {
          console.debug('WebSocket connection attempt failed (will retry):', error);
        }
        setConnectionStatus(false);
        // Retry connection after delay
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      }
    };

    // Set up message handler
    const handleMessage = (message: any) => {
      // Determine if this message is for the active session or a background one
      const msgSessionId = message.session_id;
      const isActiveSession = !msgSessionId || useChatStore.getState().activeSessionId === msgSessionId;

      // Session-aware helpers: route to active messages or background session
      const sessionAddMessage = (msg: any) => {
        if (isActiveSession || !msgSessionId) {
          return addMessage(msg);
        }
        return useChatStore.getState().addMessageToSession(msgSessionId, msg);
      };
      const sessionUpdateMessages = (updater: (messages: any[]) => any[]) => {
        if (isActiveSession || !msgSessionId) {
          useChatStore.setState({ messages: updater(useChatStore.getState().messages) });
        } else {
          useChatStore.getState().updateMessagesInSession(msgSessionId, updater);
        }
      };
      const sessionGetMessages = () => {
        if (isActiveSession || !msgSessionId) {
          return useChatStore.getState().messages;
        }
        const session = useChatStore.getState().openSessions.find(s => s.id === msgSessionId);
        return session?.messages || [];
      };
      const sessionSetLoading = (loading: boolean) => {
        if (isActiveSession || !msgSessionId) {
          setLoading(loading);
        } else {
          useChatStore.setState(state => ({
            openSessions: state.openSessions.map(s =>
              s.id === msgSessionId ? { ...s, isLoading: loading } : s
            ),
          }));
        }
      };

      switch (message.type) {
        case 'system':
          setConnectionStatus(true);
          break;
        case 'connection':
          // Ignore connection messages to prevent unknown message type error
          break;
        case 'message':
          sessionAddMessage({
            type: message.role === 'user' ? 'human' : 'ai',
            role: message.role,
            content: message.content,
            conversationId: message.conversation_id
          });
          break;
        case 'session_title':
          // LLM-generated title from backend — update the active session tab
          {
            const state = useChatStore.getState();
            const sessionId = message.session_id;
            const title = message.title;
            if (!title) break;
            // Find the session by session_id first
            const targetId = state.openSessions.find(s => s.id === sessionId)?.id;
            if (targetId) {
              useChatStore.getState().updateSessionTitle(targetId, title);
            } else if (state.activeSessionId) {
              // Fall back to active session (including temp sessions)
              useChatStore.getState().updateSessionTitle(state.activeSessionId, title);
            }
          }
          break;
        case 'stream':
          // If backend sent a session_id that doesn't match any existing session,
          // and the active session is temp, upgrade the active temp session.
          // This is now rare since we send conversation_id = temp ID for new chats,
          // but kept as a safety net for backward compatibility.
          if (message.session_id) {
            const state = useChatStore.getState();
            const activeId = state.activeSessionId;
            const sessionExists = state.openSessions.some(s => s.id === message.session_id);
            if (activeId && activeId.startsWith('temp-') && !sessionExists && message.session_id !== activeId) {
              // Only upgrade if no existing session has this ID — prevents
              // upgrading the wrong tab when multiple temp sessions are open
              const tempSession = state.openSessions.find(s => s.id === activeId);
              if (tempSession) {
                useChatStore.setState({
                  openSessions: state.openSessions.map(s =>
                    s.id === activeId
                      ? { ...s, id: message.session_id, isTemporary: false }
                      : s
                  ),
                  activeSessionId: message.session_id,
                  currentConversationId: message.session_id,
                  isNewChat: false,
                });
              }
            }
          }
          // Route message to the correct session
          {
            if (isActiveSession) {
              // Active session — use normal streaming flow
              const { currentStreamingMessageId: streamingId } = useChatStore.getState();
              if (!streamingId && message.content) {
                // Remove thinking messages — actual content is now streaming
                sessionUpdateMessages(msgs => msgs.filter(m => m.type !== 'thinking'));
                const messageId = addMessage({
                  type: 'ai',
                  role: 'assistant',
                  content: message.content,
                  isStreaming: true,
                  isComplete: false
                });
                setStreamingMessage(messageId);
              } else if (streamingId) {
                updateStreamingMessage(message.content, message.is_complete);
              }
              if (message.is_complete) {
                const streamCompleteState = useChatStore.getState();
                const hasRunningTools = streamCompleteState.messages.some(
                  m => m.type === 'tool' && m.isRunning
                );
                if (!hasRunningTools) {
                  setStreamingMessage(null);
                  setCurrentReasoningId(null);
                  setLoading(false);
                }
              }
            } else {
              // Background session — route to that session's messages without affecting UI state
              const sessionMessages = sessionGetMessages();
              const lastMsg = sessionMessages[sessionMessages.length - 1];
              if (lastMsg && lastMsg.type === 'ai' && lastMsg.isStreaming) {
                sessionUpdateMessages(msgs =>
                  msgs.map(m =>
                    m.id === lastMsg.id
                      ? { ...m, content: message.content, isComplete: message.is_complete, isStreaming: !message.is_complete }
                      : m
                  )
                );
              } else if (message.content) {
                sessionAddMessage({
                  type: 'ai',
                  role: 'assistant',
                  content: message.content,
                  isStreaming: !message.is_complete,
                  isComplete: message.is_complete,
                });
              }
              // When background session stream completes, clear its loading state
              if (message.is_complete) {
                sessionSetLoading(false);
              }
            }
          }
          break;
        case 'complete': {
          // Final completion - finalize streaming ai message and reasoning blocks
          if (isActiveSession) {
            const completeState = useChatStore.getState();
            const hasRunningTools = completeState.messages.some(
              m => m.type === 'tool' && m.isRunning
            );
            if (!hasRunningTools) {
              useChatStore.setState({
                messages: completeState.messages
                  .filter(m => m.type !== 'thinking')
                  .map(m => {
                  if (m.type === 'ai' && m.isStreaming) {
                    return { ...m, isStreaming: false, isComplete: true };
                  }
                  if (m.type === 'reasoning' && m.reasoning?.isStreaming) {
                    return { ...m, reasoning: { ...m.reasoning, isStreaming: false } };
                  }
                  return m;
                })
              });
              setStreamingMessage(null);
              setCurrentReasoningId(null);
              sessionSetLoading(false);
            }
          } else {
            // Background session — finalize streaming messages there
            sessionUpdateMessages(msgs =>
              msgs
                .filter(m => m.type !== 'thinking')
                .map(m => {
                if (m.type === 'ai' && m.isStreaming) {
                  return { ...m, isStreaming: false, isComplete: true };
                }
                if (m.type === 'reasoning' && m.reasoning?.isStreaming) {
                  return { ...m, reasoning: { ...m.reasoning, isStreaming: false } };
                }
                return m;
              })
            );
            sessionSetLoading(false);
          }
          break;
        }
        case 'thinking':
          // Remove any existing thinking messages to prevent stacking
          sessionUpdateMessages(msgs => msgs.filter(m => m.type !== 'thinking'));
          sessionAddMessage({
            type: 'thinking',
            role: 'system',
            content: message.content
          });
          sessionSetLoading(true);
          break;
        case 'ai_thinking':
          sessionAddMessage({
            type: 'thinking',
            role: 'system',
            content: `🤔 ${message.content}`
          });
          break;
        case 'reasoning':
        case 'reasoning_chunk': {
          const chunkContent = (message.content || '').trim();
          if (!chunkContent) break;
          const currentMsgs = sessionGetMessages();
          const lastMsg = currentMsgs[currentMsgs.length - 1];
          const mergeTarget = lastMsg && lastMsg.type === 'reasoning' && lastMsg.reasoning?.isStreaming
            ? lastMsg
            : null;
          if (mergeTarget) {
            const orderedSteps = mergeTarget.reasoning?.orderedSteps || [];
            const lastStep = orderedSteps[orderedSteps.length - 1];
            let newSteps;
            if (lastStep && lastStep.kind === 'text') {
              newSteps = [...orderedSteps.slice(0, -1), { ...lastStep, text: lastStep.text + (message.content || '') }];
            } else {
              newSteps = [...orderedSteps, { kind: 'text' as const, id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: message.content || '' }];
            }
            const newContent = (mergeTarget.reasoning?.content || '') + (message.content || '');
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === mergeTarget.id
                  ? { ...m, content: newContent, reasoning: { ...m.reasoning!, content: newContent, isStreaming: true, orderedSteps: newSteps } }
                  : m
              )
            );
          } else {
            // Remove thinking messages — reasoning content is now streaming
            sessionUpdateMessages(msgs => msgs.filter(m => m.type !== 'thinking'));
            const reasoningId = sessionAddMessage({
              type: 'reasoning',
              role: 'assistant',
              content: message.content || '',
              isStreaming: true,
              reasoning: {
                content: message.content || '',
                isStreaming: true,
                orderedSteps: [{ kind: 'text', id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: message.content || '' }],
              }
            });
            if (isActiveSession) setCurrentReasoningId(reasoningId);
          }
          break;
        }
        case 'reasoning_complete': {
          const reasoningMsgs = sessionGetMessages();
          const lastMsg = reasoningMsgs[reasoningMsgs.length - 1];
          if (lastMsg && lastMsg.type === 'reasoning') {
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === lastMsg.id
                  ? { ...m, reasoning: { ...m.reasoning!, isStreaming: false } }
                  : m
              )
            );
          }
          break;
        }
        case 'plan': {
          sessionAddMessage({
            type: 'plan',
            role: 'assistant',
            content: message.content || '',
            plan: {
              title: message.title || 'Plan',
              description: message.description,
              steps: message.steps,
              isStreaming: message.is_streaming,
            }
          });
          break;
        }
        case 'task': {
          sessionAddMessage({
            type: 'task',
            role: 'assistant',
            content: message.content || '',
            task: {
              title: message.title || 'Task',
              items: message.items,
            }
          });
          break;
        }
        case 'confirmation': {
          const storeMessages = sessionGetMessages();
          const toolMsg = storeMessages.find(
            m => m.type === 'tool' && m.metadata?.toolMessageId === message.tool_message_id && m.isRunning
          );
          if (toolMsg) {
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === toolMsg.id
                  ? {
                      ...m,
                      confirmation: {
                        toolName: message.tool_name || 'tool',
                        toolArgs: message.tool_args,
                        state: message.state || 'approval-requested',
                        approved: message.approved,
                        reason: message.reason,
                      },
                    }
                  : m
              )
            );
          } else {
            sessionAddMessage({
              type: 'confirmation',
              role: 'assistant',
              content: message.content || '',
              confirmation: {
                toolName: message.tool_name || 'tool',
                toolArgs: message.tool_args,
                state: message.state || 'approval-requested',
                approved: message.approved,
                reason: message.reason,
              },
              metadata: {
                toolMessageId: message.tool_message_id,
              },
            });
          }
          break;
        }
        case 'system':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: message.content
          });
          break;
        case 'stream_chunk': {
          const currentMessages = sessionGetMessages();
          const lastMsg = currentMessages[currentMessages.length - 1];
          if (lastMsg && lastMsg.type === 'ai' && lastMsg.isStreaming) {
            const newContent = (lastMsg.content || '') + message.content;
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === lastMsg.id ? { ...m, content: newContent } : m
              )
            );
          } else {
            const closed = currentMessages.map(m =>
              m.type === 'reasoning' && m.reasoning?.isStreaming
                ? { ...m, reasoning: { ...m.reasoning, isStreaming: false } }
                : m
            );
            // Also remove thinking messages — the pondering indicator is no longer needed
            // since actual content is now streaming
            const cleaned = closed.filter(m => m.type !== 'thinking');
            if (cleaned.some((m, i) => m !== currentMessages[i])) {
              sessionUpdateMessages(() => cleaned);
            }
            const messageId = sessionAddMessage({
              type: 'ai',
              role: 'assistant',
              content: message.content,
              isStreaming: true,
              isComplete: false
            });
            if (isActiveSession) {
              setStreamingMessage(messageId);
              setCurrentReasoningId(null);
            }
          }
          break;
        }
        case 'followup_chunk':
          if (isActiveSession) {
            const { currentStreamingMessageId: streamingId3 } = useChatStore.getState();
            if (!streamingId3) {
              const messageId = sessionAddMessage({
                type: 'ai',
                role: 'assistant',
                content: message.content,
                isStreaming: true,
                isComplete: false
              });
              setStreamingMessage(messageId);
            } else {
              updateStreamingMessage(message.full_content, false);
            }
          } else {
            const sessionMessages = sessionGetMessages();
            const lastMsg = sessionMessages[sessionMessages.length - 1];
            if (lastMsg && lastMsg.type === 'ai' && lastMsg.isStreaming) {
              sessionUpdateMessages(msgs =>
                msgs.map(m => m.id === lastMsg.id ? { ...m, content: message.full_content } : m)
              );
            } else {
              sessionAddMessage({
                type: 'ai',
                role: 'assistant',
                content: message.content,
                isStreaming: true,
                isComplete: false
              });
            }
          }
          break;
        case 'tool_execution_start':
          break;
        case 'tool_start': {
          const toolStepId = message.tool_message_id || `tool-${Date.now()}`;
          // Remove thinking messages — the agent is now executing a tool, not pondering
          sessionUpdateMessages(msgs => msgs.filter(m => m.type !== 'thinking'));
          sessionAddMessage({
            type: 'tool',
            role: 'assistant',
            content: '',
            toolName: message.tool_name || 'tool',
            isRunning: true,
            metadata: {
              toolName: message.tool_name || 'tool',
              toolArgs: message.tool_args || {},
              toolMessageId: toolStepId,
            },
          });
          break;
        }
        case 'tool_output_stream': {
          const streamMessages = sessionGetMessages();
          const toolMsg = streamMessages.find(
            m => m.type === 'tool' && m.metadata?.toolMessageId === message.tool_message_id
          );
          if (toolMsg) {
            const currentOutput = toolMsg.result || '';
            const newOutput = currentOutput + (currentOutput ? '\n' : '') + (message.output || '');
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === toolMsg.id
                  ? { ...m, result: newOutput }
                  : m
              )
            );
          }
          break;
        }
        case 'tool_result':
        case 'tool_execution_complete': {
          const resultMessages = sessionGetMessages();
          const toolMsg = resultMessages.find(
            m => m.type === 'tool' && m.metadata?.toolMessageId === message.tool_message_id && m.isRunning
          );
          if (toolMsg) {
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === toolMsg.id
                  ? {
                      ...m,
                      isRunning: false,
                      result: m.result || message.output || message.result || message.content || '',
                      toolResult: {
                        status: message.error ? 'error' : 'success',
                        error: message.error || message.tool_result?.error,
                      },
                      metadata: {
                        ...m.metadata,
                        savedFiles: message.saved_files,
                      },
                    }
                  : m
              )
            );
          }
          if (message.saved_files && message.saved_files.length > 0) {
            const pendingFiles = message.saved_files.map((f: any) => ({
              id: `${f.file_id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              file_id: f.file_id,
              filename: f.filename,
              file_path: f.file_path,
              file_type: f.file_type,
              size: f.size,
              toolName: message.tool_name,
              status: 'pending' as const,
              additions: f.additions,
              deletions: f.deletions,
            }));
            if (isActiveSession || !msgSessionId) {
              useChatStore.getState().addPendingFiles(pendingFiles);
            } else {
              useChatStore.setState(state => ({
                openSessions: state.openSessions.map(s =>
                  s.id === msgSessionId
                    ? { ...s, pendingFiles: [...(s.pendingFiles || []), ...pendingFiles], showFilePanel: true }
                    : s
                ),
              }));
            }
          }
          // Safety net: if all tools done, finalize streaming/loading state
          {
            const postMessages = sessionGetMessages();
            const stillRunning = postMessages.some(m => m.type === 'tool' && m.isRunning);
            if (!stillRunning) {
              sessionUpdateMessages(msgs =>
                msgs.map(m => {
                  if (m.type === 'ai' && m.isStreaming) {
                    return { ...m, isStreaming: false, isComplete: true };
                  }
                  if (m.type === 'reasoning' && m.reasoning?.isStreaming) {
                    return { ...m, reasoning: { ...m.reasoning, isStreaming: false } };
                  }
                  return m;
                })
              );
              if (isActiveSession) {
                setStreamingMessage(null);
                setCurrentReasoningId(null);
                sessionSetLoading(false);
              }
            }
          }
          break;
        }
        case 'tool_approval_resolved': {
          const storeState = useChatStore.getState();
          const toolMsg = sessionGetMessages().find(
            m => m.type === 'tool' && m.metadata?.toolMessageId === message.tool_message_id
          );
          if (toolMsg) {
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === toolMsg.id
                  ? {
                      ...m,
                      confirmation: {
                        toolName: m.confirmation?.toolName || m.metadata?.toolName || 'tool',
                        toolArgs: m.confirmation?.toolArgs,
                        state: message.approved ? 'approval-responded' : 'output-denied',
                        approved: message.approved,
                      },
                    }
                  : m
              )
            );
          }
          break;
        }
        case 'permission_mode_changed': {
          if (message.mode === 'bypass') {
            if (isActiveSession || !msgSessionId) {
              useChatStore.getState().setPermissionMode('bypass');
            } else {
              useChatStore.setState(state => ({
                openSessions: state.openSessions.map(s =>
                  s.id === msgSessionId ? { ...s, permissionMode: 'bypass' as const } : s
                ),
              }));
            }
            // Auto-resolve all pending confirmation messages in this session
            sessionUpdateMessages(msgs => msgs.map(m => {
              if (m.type === 'tool' && m.confirmation?.state === 'approval-requested') {
                return {
                  ...m,
                  confirmation: {
                    ...m.confirmation,
                    state: 'approval-responded',
                    approved: true,
                  },
                };
              }
              if (m.type === 'confirmation' && m.confirmation?.state === 'approval-requested') {
                return {
                  ...m,
                  confirmation: {
                    ...m.confirmation,
                    state: 'approval-responded',
                    approved: true,
                  },
                };
              }
              return m;
            }));
          } else if (message.mode === 'always' && message.tool_name) {
            if (isActiveSession || !msgSessionId) {
              useChatStore.getState().addAllowedTool(message.tool_name);
            } else {
              useChatStore.setState(state => ({
                openSessions: state.openSessions.map(s =>
                  s.id === msgSessionId
                    ? { ...s, allowedTools: s.allowedTools.includes(message.tool_name) ? s.allowedTools : [...s.allowedTools, message.tool_name] }
                    : s
                ),
              }));
            }
          }
          break;
        }
        case 'ai_followup':
          sessionAddMessage({
            type: 'ai',
            role: 'assistant',
            content: message.content,
            isStreaming: false,
            isComplete: true
          });
          break;
        case 'token_usage': {
          const usage = {
            inputTokens: message.input_tokens || 0,
            outputTokens: message.output_tokens || 0,
            totalTokens: message.total_tokens || 0,
            cacheReadTokens: message.cache_read_tokens || 0,
            cacheWriteTokens: message.cache_write_tokens || 0,
          };
          if (isActiveSession || !msgSessionId) {
            setTokenUsage(usage);
          } else {
            useChatStore.setState(state => ({
              openSessions: state.openSessions.map(s =>
                s.id === msgSessionId ? { ...s, tokenUsage: usage } : s
              ),
            }));
          }
          break;
        }
        case 'ask_user_question': {
          const askToolId = message.tool_message_id || `ask-${Date.now()}`;
          sessionAddMessage({
            type: 'confirmation',
            role: 'assistant',
            content: message.question || '',
            confirmation: {
              toolName: 'ask_user_question',
              toolArgs: { question: message.question, options: message.options },
              state: 'approval-requested',
            },
            metadata: {
              toolName: 'ask_user_question',
              toolMessageId: askToolId,
              toolArgs: { question: message.question, options: message.options },
            },
          });
          break;
        }
        case 'prompt_suggestion': {
          if (message.suggestions && Array.isArray(message.suggestions)) {
            if (isActiveSession || !msgSessionId) {
              useChatStore.setState({ promptSuggestions: message.suggestions });
            } else {
              useChatStore.setState(state => ({
                openSessions: state.openSessions.map(s =>
                  s.id === msgSessionId ? { ...s, promptSuggestions: message.suggestions } : s
                ),
              }));
            }
          }
          break;
        }
        case 'retry':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: `Retrying (attempt ${message.attempt})... ${message.message || ''}`
          });
          break;
        case 'model_fallback':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: `Model fallback: ${message.original_model} → ${message.fallback_model}`
          });
          break;
        case 'compaction':
        case 'reactive_compact':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: message.content || 'Context window was compacted'
          });
          break;
        case 'doom_loop':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: `Doom loop detected on ${message.tool_name}. ${message.content || ''}`
          });
          if (isActiveSession) sessionSetLoading(false);
          break;
        case 'budget_stop':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: `Budget limit reached (${message.pct}% used, ${message.continuation_count} continuations)`
          });
          break;
        case 'budget_continue':
          break;
        case 'subagent_spawned':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: `Subagent spawned. ${message.result || ''}`
          });
          break;
        case 'team_update':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: `Team ${message.action}: ${message.result || ''}`
          });
          break;
        case 'tool_use_summary':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: message.content || ''
          });
          break;
        case 'query_chain':
        case 'job_classified':
        case 'auto_dream':
        case 'max_output_tokens_recovery':
        case 'stop_hook_blocking':
          break;
        case 'error':
          sessionAddMessage({
            type: 'system',
            role: 'system',
            content: `Error: ${message.content}`
          });
          if (isActiveSession) sessionSetLoading(false);
          break;
        default:
          console.log('Unknown message type:', message.type);
          break;
      }
    };

    wsService.addMessageHandler(handleMessage);

    // Initial connection
    connectWebSocket();

    return () => {
      wsService.removeMessageHandler(handleMessage);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsService.disconnect();
    };
  }, []);

  const sendMessage = (content: string, model?: string, options?: SendMessageOptions) => {
    if (!wsService.isConnected()) {
      console.error('WebSocket is not connected');
      addMessage({
        type: 'system',
        role: 'system',
        content: 'WebSocket is not connected. Attempting to reconnect...'
      });
      return;
    }

    try {
      // Read fresh state at call time to avoid stale closure values when switching tabs
      const state = useChatStore.getState();
      const activeId = state.activeSessionId;
      const convId = state.currentConversationId;
      const isNew = state.isNewChat;

      // Finalize any ongoing reasoning/streaming from the active session only
      if (activeId && (state.currentReasoningId || state.currentStreamingMessageId)) {
        stopGeneration();
      }

      // Always send conversation_id so the backend uses the correct session.
      // For new chats, use the activeSessionId (temp ID) so the backend creates
      // a session with that ID and echoes it back — no temp upgrade needed.
      const sessionIdToSend = convId || activeId || undefined;

      // Add user message immediately for better UX
      addMessage({
        type: 'human',
        role: 'user',
        content: content
      });

      // Add a thinking message immediately so the PonderingIndicator shows
      // right away — the backend will replace it when real content arrives
      addMessage({
        type: 'thinking',
        role: 'system',
        content: ''
      });

      // Build attachments from options
      const attachments = (options?.attachments || []).map(a => ({
        type: 'file' as const,
        path: a.path || a.name,
        name: a.name,
        lines: a.lines,
      }));

      // Extract agent from mentions if any
      const agentMention = options?.mentions?.find(m => m.type === 'agent');
      const agent = options?.agent || agentMention?.name;

      // Extract enabled databases from mentions
      const dbMentions = options?.mentions?.filter(m => m.type === 'database').map(m => m.id || m.name) || [];
      const enabledDatabases = options?.enabledDatabases || (dbMentions.length > 0 ? dbMentions : undefined);

      // Get the active file explorer root path
      const activeRootPath = options?.rootPath || (typeof window !== 'undefined' ? localStorage.getItem('fileExplorer_rootPath') || undefined : undefined);

      wsService.sendMessage({
        type: 'chat',
        content,
        conversation_id: sessionIdToSend,
        new_chat: isNew || undefined,
        agent_type: 'default',
        model: model || undefined,
        stream: true,
        attachments: attachments.length > 0 ? attachments : undefined,
        agent: agent || undefined,
        enabled_databases: enabledDatabases,
        command: options?.command || undefined,
        command_args: options?.commandArgs || undefined,
        root_path: activeRootPath,
        keep_intermediate_files: options?.keepIntermediateFiles,
      });

      if (isNew) {
        // Set currentConversationId to the session ID so subsequent messages
        // from this tab use the same session — also sync to openSessions
        useChatStore.setState((state) => ({
          isNewChat: false,
          currentConversationId: sessionIdToSend,
          openSessions: state.openSessions.map(s =>
            s.id === activeId
              ? { ...s, isNewChat: false, currentConversationId: sessionIdToSend }
              : s
          ),
        }));
      }

      // Sync loading state to the session
      useChatStore.setState((state) => ({
        openSessions: state.openSessions.map(s =>
          s.id === activeId ? { ...s, isLoading: true } : s
        ),
      }));
      setLoading(true);
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage({
        type: 'system',
        role: 'system',
        content: 'Failed to send message. Please check your connection.'
      });
      setLoading(false);
    }
  };

  const stopSending = () => {
    const state = useChatStore.getState();
    const sessionIdToSend = state.currentConversationId || state.activeSessionId || undefined;
    wsService.sendMessage({ type: 'stop', conversation_id: sessionIdToSend });
    stopGeneration();
  };

  const stopCommand = (toolMessageId: string) => {
    wsService.sendMessage({ type: 'stop_command', tool_message_id: toolMessageId });
  };

  const sendAskUserResponse = (toolMessageId: string, response: string) => {
    wsService.sendMessage({
      type: 'ask_user_question_response',
      tool_message_id: toolMessageId,
      response,
    });
  };

  const sendToolApproval = (toolMessageId: string, approved: boolean, reason?: string, approvalMode?: 'once' | 'always' | 'yolo') => {
    wsService.sendMessage({
      type: 'tool_approval_response',
      tool_message_id: toolMessageId,
      approved,
      reason: reason || '',
      approval_mode: approvalMode || 'always',
    });
  };

  const sendYoloMode = () => {
    wsService.sendMessage({
      type: 'set_permission_mode',
      mode: 'bypass',
    });
  };

  const sendCommand = (command: string, commandArgs?: string[], model?: string) => {
    if (!wsService.isConnected()) {
      console.error('WebSocket is not connected');
      return;
    }
    // Read fresh state to get correct session ID for this tab
    const state = useChatStore.getState();
    const sessionIdToSend = state.currentConversationId || state.activeSessionId || undefined;
    // Add a thinking message immediately so the PonderingIndicator shows
    addMessage({
      type: 'thinking',
      role: 'system',
      content: ''
    });
    setLoading(true);
    wsService.sendMessage({
      type: 'chat',
      content: '',
      command,
      command_args: commandArgs || [],
      model: model || undefined,
      conversation_id: sessionIdToSend,
    });
  };

  return {
    sendMessage,
    stopSending,
    stopCommand,
    sendAskUserResponse,
    sendToolApproval,
    sendYoloMode,
    sendCommand,
    isConnected
  };
};
