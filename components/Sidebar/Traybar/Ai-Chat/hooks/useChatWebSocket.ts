import { useEffect, useRef, useCallback } from 'react';
import { useChatStore, type ChatMentionItem, type UploadedFile } from '../components/chatStore';
import { wsService } from './wsService';
import { useTabStore } from '@/components/FileTabs/useTabStore';
import { useFileExplorerStore } from '@/components/Sidebar/FileExplorer_New/store/fileExplorerStore';
import { getAllCanvasStates } from '@/components/Editorwindow_new/editors/canvas/canvasStateStore';
import { getApiBaseUrl } from '@/config/server';
import * as authService from '@/lib/services/auth-service';

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
    setContextWindow,
    setContextTokens,
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
          // Skip adding connection confirmation messages to the chat
          if (message.content && message.content !== 'Connected to Genome Studio AI') {
            sessionAddMessage({
              type: 'system',
              role: 'system',
              content: message.content
            });
          }
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
              // Add a separator to visually mark the end of the AI response
              const sepState = useChatStore.getState();
              const lastMsg = sepState.messages[sepState.messages.length - 1];
              if (lastMsg && lastMsg.type !== 'separator' && lastMsg.type !== 'human') {
                sepState.addMessage({
                  type: 'separator',
                  role: 'system',
                  content: '',
                });
              }
              setStreamingMessage(null);
              setCurrentReasoningId(null);
              sessionSetLoading(false);
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
            // Add separator for background session too
            const bgState = useChatStore.getState();
            const bgSession = bgState.openSessions.find(s => s.id === msgSessionId);
            if (bgSession) {
              const lastBgMsg = bgSession.messages[bgSession.messages.length - 1];
              if (lastBgMsg && lastBgMsg.type !== 'separator' && lastBgMsg.type !== 'human') {
                sessionAddMessage({
                  type: 'separator',
                  role: 'system',
                  content: '',
                });
              }
            }
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
        case 'status_update':
          // Replace existing thinking/status messages with the new short status
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
          const chunkContent = message.content || '';
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
                startedAt: Date.now(),
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
            const startedAt = lastMsg.reasoning?.startedAt;
            const duration = startedAt ? Math.ceil((Date.now() - startedAt) / 1000) : undefined;
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === lastMsg.id
                  ? { ...m, reasoning: { ...m.reasoning!, isStreaming: false, duration } }
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
        case 'canvas_update': {
          // Handle open_flow action: open the file in the editor tab store
          if (message.action === 'open_flow' && message.filePath) {
            try {
              const tabState = useTabStore.getState();
              const filePath = message.filePath;
              const fileName = filePath.split('/').pop() || 'workflow.flow';
              console.log('🔍 [AI CHAT] open_flow received:', { filePath, fileName });
              console.log('🔍 [AI CHAT] Current tabs before open_flow:', tabState.getAllTabs().map(t => ({ id: t.id, path: t.path, name: t.name })));
              // addTab already deduplicates by filePath and activates existing tab.
              // It returns the tabId (existing or new). We activate it to ensure
              // the user sees the flow that the AI just opened.
              const tabId = tabState.addTab(filePath, fileName, '');
              console.log('🔍 [AI CHAT] addTab returned:', { tabId, filePath });
              if (tabId) {
                tabState.activateTab(tabId);
                console.log('🔍 [AI CHAT] Activated tab:', tabId);
              }
              console.log('🔍 [AI CHAT] Current tabs after open_flow:', tabState.getAllTabs().map(t => ({ id: t.id, path: t.path, name: t.name })));
              console.log('[AI Chat] Opened/activated flow file tab:', filePath);
              // Refresh the file explorer tree so a newly created flow file
              // shows up immediately without needing a manual refresh.
              useFileExplorerStore.getState().refreshFileTree(true).catch((err: unknown) => {
                console.error('[AI Chat] Failed to refresh file tree after open_flow:', err);
              });
            } catch (e) {
              console.error('[AI Chat] Failed to open flow file:', e);
            }
            // Don't break — also dispatch canvasUpdateEvent so the Canvas
            // component can react to the open_flow action if needed
          }
          // Dispatch a custom window event that Canvas.tsx listens for
          // This allows gradual canvas updates without hard refreshes
          window.dispatchEvent(new CustomEvent('canvasUpdateEvent', {
            detail: {
              action: message.action,
              node: message.node,
              edge: message.edge,
              node_id: message.node_id,
              updates: message.updates,
              filePath: message.filePath,
            }
          }));
          break;
        }
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
        case 'tool_code': {
          const codeToolStepId = message.tool_message_id || `tool-${Date.now()}`;
          // Check if a tool_start message already exists for this tool_message_id
          const existingToolMsg = sessionGetMessages().find(
            m => m.type === 'tool' && m.metadata?.toolMessageId === codeToolStepId
          );
          if (existingToolMsg) {
            // Update the existing tool message with code info instead of creating a duplicate
            sessionUpdateMessages(msgs =>
              msgs.map(m => {
                if (m.type === 'tool' && m.metadata?.toolMessageId === codeToolStepId) {
                  return {
                    ...m,
                    type: 'tool_code',
                    code: message.code || '',
                    codeLanguage: message.language || 'bash',
                    outputLines: [],
                  };
                }
                return m;
              })
            );
          } else {
            sessionAddMessage({
              type: 'tool_code',
              role: 'assistant',
              content: '',
              toolName: message.tool_name || 'tool',
              code: message.code || '',
              codeLanguage: message.language || 'bash',
              outputLines: [],
              isRunning: true,
              metadata: {
                toolName: message.tool_name || 'tool',
                toolMessageId: codeToolStepId,
              },
            });
          }
          break;
        }
        case 'tool_output_stream': {
          const streamMessages = sessionGetMessages();
          const toolMsg = streamMessages.find(
            m => (m.type === 'tool' || m.type === 'tool_code') && m.metadata?.toolMessageId === message.tool_message_id
          );
          if (toolMsg) {
            const newOutputLine = message.output || '';
            sessionUpdateMessages(msgs =>
              msgs.map(m => {
                if (m.id !== toolMsg.id) return m;
                if (m.type === 'tool_code') {
                  return { ...m, outputLines: [...(m.outputLines || []), newOutputLine] };
                }
                const currentOutput = m.result || '';
                const newOutput = currentOutput + (currentOutput ? '\n' : '') + newOutputLine;
                return { ...m, result: newOutput };
              })
            );
          }
          break;
        }
        case 'tool_result':
        case 'tool_execution_complete': {
          sessionUpdateMessages(msgs =>
            msgs.map(m => {
              if (
                (m.type === 'tool' || m.type === 'tool_code') &&
                m.metadata?.toolMessageId === message.tool_message_id &&
                m.isRunning
              ) {
                return {
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
                };
              }
              return m;
            })
          );
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
            // Auto-load each saved file as a tab (not activated, so it
            // doesn't disrupt the user's current view)
            try {
              const tabState = useTabStore.getState();
              for (const f of message.saved_files) {
                const fp = f.file_path as string;
                if (!fp) continue;
                const existing = tabState.getAllTabs().find(tab => tab.path === fp);
                if (!existing) {
                  tabState.addTab(fp, f.filename, '');
                }
              }
            } catch (e) {
              console.error('[AI Chat] Failed to auto-load file tabs:', e);
            }
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
            const stillRunning = postMessages.some(m => (m.type === 'tool' || m.type === 'tool_code') && m.isRunning);
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
          if (message.context_window) {
            setContextWindow(message.context_window);
          }
          if (message.context_tokens !== undefined) {
            setContextTokens(message.context_tokens);
          }
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
          if (message.context_window) {
            setContextWindow(message.context_window);
          }
          if (message.context_tokens !== undefined) {
            setContextTokens(message.context_tokens);
          }
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
        case 'command_stopped': {
          const cmdToolMsg = sessionGetMessages().find(
            m => (m.type === 'tool' || m.type === 'tool_code') && m.metadata?.toolMessageId === message.tool_message_id
          );
          if (cmdToolMsg) {
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === cmdToolMsg.id
                  ? {
                      ...m,
                      isRunning: false,
                      result: m.result || (message.killed ? 'Command stopped by user' : 'Command finished'),
                      toolResult: {
                        status: 'stopped',
                        error: message.killed ? 'Command was killed' : undefined,
                      },
                    }
                  : m
              )
            );
          }
          break;
        }
        case 'ask_user_question_resolved': {
          const askToolMsg = sessionGetMessages().find(
            m => m.type === 'confirmation' && m.metadata?.toolMessageId === message.tool_message_id
          );
          if (askToolMsg) {
            sessionUpdateMessages(msgs =>
              msgs.map(m =>
                m.id === askToolMsg.id
                  ? {
                      ...m,
                      confirmation: {
                        ...m.confirmation!,
                        state: 'approval-responded',
                        approved: true,
                      },
                    }
                  : m
              )
            );
          }
          break;
        }
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

  const sendMessage = async (content: string, model?: string, options?: SendMessageOptions) => {
    if (!wsService.isConnected()) {
      console.error('WebSocket is not connected');
      addMessage({
        type: 'system',
        role: 'system',
        content: 'WebSocket is not connected. Attempting to reconnect...'
      });
      // Queue the message so it can be sent once reconnected
      useChatStore.getState().addQueuedMessage({
        id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        parts: [{ text: content, type: 'text' }],
      });
      // Trigger reconnection
      wsService.connect().catch(() => {});
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

      // Fetch all workspace folders so the AI agent knows which workspaces exist
      let workspaceFolders: { path: string; alias: string }[] | undefined;
      try {
        const baseUrl = getApiBaseUrl();
        const token = authService.getToken();
        const url = `${baseUrl}/file-explorer-new/workspace/folders`;
        const response = await fetch(url, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          workspaceFolders = data.folders || undefined;
        }
      } catch (e) {
        // Silently handle — workspace folders are optional context for the AI
      }

      // Collect open tabs info (paths + active tab) so the backend agent knows
      // which files are open, especially .flow files for the canvas agent
      let openTabs: { path: string; name: string; isActive: boolean }[] | undefined;
      try {
        const tabState = useTabStore.getState();
        const allTabs = tabState.getAllTabs();
        const activeId = tabState.activeTabId;
        if (allTabs.length > 0) {
          openTabs = allTabs.map((t) => ({
            path: t.path,
            name: t.name,
            isActive: t.id === activeId,
          }));
          console.log('[AI Chat] Sending open_tabs:', openTabs.length, 'tabs, active:', openTabs.find(t => t.isActive)?.path || 'none');
        } else {
          console.log('[AI Chat] No open tabs found in tab store');
        }
      } catch (e) {
        console.error('[AI Chat] Failed to collect open tabs:', e);
      }

      // Collect live canvas state for any open .flow files so the backend
      // agent gets the current (unsaved) nodes/edges instead of stale file data
      let canvasState: Record<string, { nodes: any[]; edges: any[] }> | undefined;
      try {
        const allCanvasStates = getAllCanvasStates();
        if (allCanvasStates.size > 0) {
          canvasState = {};
          for (const [flowPath, state] of allCanvasStates) {
            // Only include flow files that are in open_tabs to avoid sending stale data
            if (openTabs?.some(t => t.path === flowPath)) {
              canvasState[flowPath] = {
                nodes: state.nodes.map(n => ({
                  id: n.id,
                  type: n.type,
                  position: n.position,
                  data: n.data,
                })),
                edges: state.edges.map(e => ({
                  id: e.id,
                  source: e.source,
                  target: e.target,
                  sourceHandle: e.sourceHandle,
                  targetHandle: e.targetHandle,
                })),
              };
            }
          }
          if (Object.keys(canvasState).length === 0) {
            canvasState = undefined;
          }
        }
      } catch (e) {
        console.error('[AI Chat] Failed to collect canvas state:', e);
      }

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
        workspaces: workspaceFolders,
        keep_intermediate_files: options?.keepIntermediateFiles,
        open_tabs: openTabs,
        canvas_state: canvasState,
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
    const state = useChatStore.getState();
    const sessionIdToSend = state.currentConversationId || state.activeSessionId || undefined;
    wsService.sendMessage({ type: 'stop_command', tool_message_id: toolMessageId, conversation_id: sessionIdToSend });
  };

  const sendAskUserResponse = (toolMessageId: string, response: string) => {
    wsService.sendMessage({
      type: 'ask_user_question_response',
      tool_message_id: toolMessageId,
      response,
    });
  };

  const sendToolApproval = (toolMessageId: string, approved: boolean, reason?: string, approvalMode?: 'once' | 'always' | 'lytic') => {
    wsService.sendMessage({
      type: 'tool_approval_response',
      tool_message_id: toolMessageId,
      approved,
      reason: reason || '',
      approval_mode: approvalMode || 'once',
    });
  };

  const sendLyticMode = () => {
    wsService.sendMessage({
      type: 'set_permission_mode',
      mode: 'bypass',
    });
  };

  const sendCommand = (command: string, commandArgs?: string[], model?: string) => {
    if (!wsService.isConnected()) {
      console.error('WebSocket is not connected');
      addMessage({
        type: 'system',
        role: 'system',
        content: 'WebSocket is not connected. Attempting to reconnect...'
      });
      wsService.connect().catch(() => {});
      return;
    }
    // Read fresh state to get correct session ID for this tab
    const state = useChatStore.getState();
    const activeId = state.activeSessionId;
    const sessionIdToSend = state.currentConversationId || activeId || undefined;
    // Show the command as a user message in the chat
    const argsStr = commandArgs && commandArgs.length > 0 ? ' ' + commandArgs.join(' ') : '';
    addMessage({
      type: 'human',
      role: 'user',
      content: `/${command}${argsStr}`
    });
    // Add a thinking message immediately so the PonderingIndicator shows
    addMessage({
      type: 'thinking',
      role: 'system',
      content: ''
    });
    setLoading(true);
    // Sync loading state to the session
    useChatStore.setState((state) => ({
      openSessions: state.openSessions.map(s =>
        s.id === activeId ? { ...s, isLoading: true } : s
      ),
    }));
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
    sendLyticMode,
    sendCommand,
    isConnected
  };
};
