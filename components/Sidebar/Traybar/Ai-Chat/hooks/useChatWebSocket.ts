import { useEffect, useRef } from 'react';
import { useChatStore } from '../components/chatStore';
import { wsService } from './wsService';

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
    setTokenUsage,
    stopGeneration,
    setCurrentReasoningId,
  } = useChatStore();

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      switch (message.type) {
        case 'system':
          setConnectionStatus(true);
          break;
        case 'connection':
          // Ignore connection messages to prevent unknown message type error
          break;
        case 'message':
          addMessage({
            type: message.role === 'user' ? 'human' : 'ai',
            role: message.role,
            content: message.content,
            conversationId: message.conversation_id
          });
          break;
        case 'stream':
          const { currentStreamingMessageId: streamingId } = useChatStore.getState();
          if (!streamingId && message.content) {
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
          break;
        case 'complete': {
          // Final completion - finalize streaming ai message and reasoning blocks
          const completeState = useChatStore.getState();
          const hasRunningTools = completeState.messages.some(
            m => m.type === 'tool' && m.isRunning
          );
          if (!hasRunningTools) {
            useChatStore.setState({
              messages: completeState.messages.map(m => {
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
            setLoading(false);
          }
          break;
        }
        case 'thinking':
          addMessage({
            type: 'thinking',
            role: 'system',
            content: message.content
          });
          setLoading(true);
          break;
        case 'ai_thinking':
          addMessage({
            type: 'thinking',
            role: 'system',
            content: `🤔 ${message.content}`
          });
          break;
        case 'reasoning':
        case 'reasoning_chunk': {
          const chunkContent = (message.content || '').trim();
          if (!chunkContent) break;
          const { messages: currentMsgs } = useChatStore.getState();
          const lastMsg = currentMsgs[currentMsgs.length - 1];
          // Only merge with the immediately preceding reasoning block if it is still streaming
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
            useChatStore.setState({
              messages: currentMsgs.map(m =>
                m.id === mergeTarget.id
                  ? { ...m, content: newContent, reasoning: { ...m.reasoning!, content: newContent, isStreaming: true, orderedSteps: newSteps } }
                  : m
              )
            });
          } else {
            const reasoningId = addMessage({
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
            setCurrentReasoningId(reasoningId);
          }
          break;
        }
        case 'reasoning_complete': {
          const { messages: reasoningMsgs } = useChatStore.getState();
          const lastMsg = reasoningMsgs[reasoningMsgs.length - 1];
          // Mark the most recent reasoning block's text streaming as done.
          // Tools that follow in the same turn still attach (tool_start checks type only).
          if (lastMsg && lastMsg.type === 'reasoning') {
            useChatStore.setState({
              messages: reasoningMsgs.map(m =>
                m.id === lastMsg.id
                  ? { ...m, reasoning: { ...m.reasoning!, isStreaming: false } }
                  : m
              )
            });
          }
          break;
        }
        case 'plan': {
          addMessage({
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
          addMessage({
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
          addMessage({
            type: 'confirmation',
            role: 'assistant',
            content: message.content || '',
            confirmation: {
              toolName: message.tool_name || 'tool',
              toolArgs: message.tool_args,
              state: message.state || 'approval-requested',
              approved: message.approved,
              reason: message.reason,
            }
          });
          break;
        }
        case 'system':
          addMessage({
            type: 'system',
            role: 'system',
            content: message.content
          });
          break;
        case 'stream_chunk': {
          const { messages: currentMessages } = useChatStore.getState();
          const lastMsg = currentMessages[currentMessages.length - 1];
          // Only merge with the immediately preceding ai block if it is still streaming
          if (lastMsg && lastMsg.type === 'ai' && lastMsg.isStreaming) {
            const newContent = (lastMsg.content || '') + message.content;
            useChatStore.setState({
              messages: currentMessages.map(m =>
                m.id === lastMsg.id ? { ...m, content: newContent } : m
              )
            });
          } else {
            // Starting a new ai block - close any streaming reasoning block first
            const closed = currentMessages.map(m =>
              m.type === 'reasoning' && m.reasoning?.isStreaming
                ? { ...m, reasoning: { ...m.reasoning, isStreaming: false } }
                : m
            );
            if (closed.some((m, i) => m !== currentMessages[i])) {
              useChatStore.setState({ messages: closed });
            }
            const messageId = addMessage({
              type: 'ai',
              role: 'assistant',
              content: message.content,
              isStreaming: true,
              isComplete: false
            });
            setStreamingMessage(messageId);
            setCurrentReasoningId(null);
          }
          break;
        }
        case 'followup_chunk':
          const { currentStreamingMessageId: streamingId3 } = useChatStore.getState();
          if (!streamingId3) {
            const messageId = addMessage({
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
          break;
        case 'tool_execution_start':
          // Don't add separate message for tool execution start
          break;
        case 'tool_start': {
          // Create a separate tool message in the chat flow (not inside reasoning)
          const toolStepId = message.tool_message_id || `tool-${Date.now()}`;
          addMessage({
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
          // Stream tool output into the separate tool message
          const streamState = useChatStore.getState();
          const toolMsg = streamState.messages.find(
            m => m.type === 'tool' && m.metadata?.toolMessageId === message.tool_message_id
          );
          if (toolMsg) {
            const currentOutput = toolMsg.result || '';
            const newOutput = currentOutput + (currentOutput ? '\n' : '') + (message.output || '');
            useChatStore.setState({
              messages: streamState.messages.map(m =>
                m.id === toolMsg.id
                  ? { ...m, result: newOutput }
                  : m
              )
            });
          }
          break;
        }
        case 'tool_result':
        case 'tool_execution_complete': {
          // Finalize the separate tool message
          const storeState = useChatStore.getState();
          const toolMsg = storeState.messages.find(
            m => m.type === 'tool' && m.metadata?.toolMessageId === message.tool_message_id && m.isRunning
          );
          if (toolMsg) {
            useChatStore.setState({
              messages: storeState.messages.map(m =>
                m.id === toolMsg.id
                  ? {
                      ...m,
                      isRunning: false,
                      result: m.result || message.output || message.result || message.content || '',
                      toolResult: {
                        status: message.error ? 'error' : 'success',
                        error: message.error || message.tool_result?.error,
                      },
                    }
                  : m
              )
            });
          }
          break;
        }
        case 'ai_followup':
          addMessage({
            type: 'ai',
            role: 'assistant',
            content: message.content,
            isStreaming: false,
            isComplete: true
          });
          break;
        case 'token_usage':
          setTokenUsage({
            inputTokens: message.input_tokens || 0,
            outputTokens: message.output_tokens || 0,
            totalTokens: message.total_tokens || 0,
          });
          break;
        case 'error':
          addMessage({
            type: 'system',
            role: 'system',
            content: `Error: ${message.content}`
          });
          setLoading(false);
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

  const sendMessage = (content: string, model?: string) => {
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
      // Finalize any ongoing reasoning/streaming from previous turn
      const state = useChatStore.getState();
      if (state.currentReasoningId || state.currentStreamingMessageId) {
        stopGeneration();
      }

      // Add user message immediately for better UX
      addMessage({
        type: 'human',
        role: 'user',
        content: content
      });
      
      wsService.sendMessage({
        type: 'chat',
        content,
        conversation_id: currentConversationId || undefined,
        agent_type: 'default',
        model: model || undefined,
        stream: true
      });
      
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
    wsService.sendMessage({ type: 'stop' });
    stopGeneration();
  };

  return {
    sendMessage,
    stopSending,
    isConnected
  };
};
