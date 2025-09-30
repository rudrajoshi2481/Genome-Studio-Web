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
    currentConversationId
  } = useChatStore();

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await wsService.connect();
        setConnectionStatus(true);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
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
          if (!streamingId) {
            const messageId = addMessage({
              type: 'ai',
              role: 'assistant',
              content: message.content,
              isStreaming: true,
              isComplete: false
            });
            setStreamingMessage(messageId);
          } else {
            updateStreamingMessage(message.content, message.is_complete);
          }
          if (message.is_complete) {
            setStreamingMessage(null);
            setLoading(false);
          }
          break;
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
        case 'system':
          addMessage({
            type: 'system',
            role: 'system',
            content: message.content
          });
          break;
        case 'stream_chunk':
          const { currentStreamingMessageId: streamingId2 } = useChatStore.getState();
          if (!streamingId2) {
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
          addMessage({
            type: 'tool',
            role: 'system',
            content: `🔧 ${message.content} (Iteration ${message.iteration})`
          });
          break;
        case 'tool_start':
          // Enhanced tool start message with detailed information
          const toolArgs = message.tool_args || {};
          let detailedContent = message.content;
          
          // Add file path information for file operations
          if (message.tool_name === 'save_research_documents' && toolArgs.filename) {
            detailedContent += `\n📁 **File**: ${toolArgs.filename}`;
          } else if (message.tool_name === 'file_edit' && toolArgs.filepath) {
            detailedContent += `\n📁 **File**: ${toolArgs.filepath}`;
          } else if (message.tool_name === 'run_command' && toolArgs.working_directory) {
            detailedContent += `\n📁 **Directory**: ${toolArgs.working_directory}`;
          }
          
          addMessage({
            type: 'tool',
            role: 'system',
            content: detailedContent,
            metadata: {
              toolName: message.tool_name,
              toolArgs: toolArgs,
              toolIndex: message.tool_index,
              totalTools: message.total_tools
            }
          });
          break;
        case 'tool_execution_complete':
          // Enhanced completion message with file details
          let completionContent = message.content;
          
          // Add file information from tool results
          if (message.tool_results && message.tool_results.length > 0) {
            const fileResults = message.tool_results.filter((result: any) => 
              result.filepath || result.file_location
            );
            
            if (fileResults.length > 0) {
              completionContent += '\n\n📋 **Files Created/Modified**:';
              fileResults.forEach((result: any) => {
                const filePath = result.file_location || result.filepath;
                const fileSize = result.file_size ? ` (${result.file_size} bytes)` : '';
                completionContent += `\n• \`${filePath}\`${fileSize}`;
              });
            }
          }
          
          addMessage({
            type: 'tool',
            role: 'system',
            content: completionContent,
            metadata: {
              toolResults: message.tool_results || []
            }
          });
          break;
        case 'ai_followup':
          addMessage({
            type: 'ai',
            role: 'assistant',
            content: message.content,
            isStreaming: false,
            isComplete: true
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

  const sendMessage = (content: string) => {
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
      console.log('Sending message:', content);
      
      // Don't add user message here - let backend confirmation handle it
      wsService.sendMessage({
        type: 'chat',
        content,
        conversation_id: currentConversationId || undefined,
        agent_type: 'default',
        model_name: 'claude-3-5-sonnet-20241022',
        temperature: 1,
        max_tokens: 4000,
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

  return {
    sendMessage,
    isConnected
  };
};
