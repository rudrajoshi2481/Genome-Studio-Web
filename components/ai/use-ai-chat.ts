import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AIMessage, AIEvent, AIContext } from './types';

export function useAIChat() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string, context?: AIContext) => {
    const messageId = uuidv4();
    
    // Add user message
    setMessages(prev => [...prev, {
      id: uuidv4(),
      role: 'user',
      content
    }]);

    // Add pending assistant message
    setMessages(prev => [...prev, {
      id: messageId,
      role: 'assistant',
      content: '',
      pending: true
    }]);

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          context,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response reader available');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk and split by newlines to handle NDJSON
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const event: AIEvent = JSON.parse(line);
            
            switch (event.event_type) {
              case 'token':
                accumulatedContent += event.data.token;
                setMessages(prev => prev.map(msg => 
                  msg.id === messageId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
                break;

              case 'action':
                // Handle agent actions if needed
                console.log('Agent action:', event.data);
                break;

              case 'error':
                throw new Error(event.data.message || 'Unknown error');
            }
          } catch (e) {
            console.error('Error parsing event:', e);
          }
        }
      }

      // Mark message as complete
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, pending: false }
          : msg
      ));

    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, error: error instanceof Error ? error.message : 'Unknown error', pending: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages
  };
}
