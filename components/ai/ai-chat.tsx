import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { config } from "@/lib/config";

interface AIChatProps {
  className?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  error?: string;
}

export function AIChat({ className }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageIdCounter = useRef(0);
  
  useEffect(() => {
    const host = config.host || 'localhost';
    const port = config.port || '8000';
    const ws = new WebSocket(`ws://${host}:${port}/llm/stream`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Connection established successfully
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'chunk') {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.pending) {
            const updatedMessages = [...prev];
            updatedMessages[prev.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + data.content
            };
            return updatedMessages;
          }
          return prev;
        });
      } else if (data.type === 'complete') {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.pending) {
            const updatedMessages = [...prev];
            updatedMessages[prev.length - 1] = {
              ...lastMessage,
              pending: false
            };
            return updatedMessages;
          }
          return prev;
        });
        setIsLoading(false);
      } else if (data.type === 'error') {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.pending) {
            const updatedMessages = [...prev];
            updatedMessages[prev.length - 1] = {
              ...lastMessage,
              error: data.error,
              pending: false
            };
            return updatedMessages;
          }
          return prev;
        });
        setIsLoading(false);
      }
    };

    ws.onerror = (error) => {
      // console.error('WebSocket error:', error);
      // Only show error message if we're currently loading (waiting for a response)
      if (isLoading) {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.pending) {
            const updatedMessages = [...prev];
            updatedMessages[prev.length - 1] = {
              ...lastMessage,
              error: 'Connection error. Please try again.',
              pending: false
            };
            return updatedMessages;
          }
          return prev;
        });
        setIsLoading(false);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || !wsRef.current) return;
    
    const message = input;
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: String(messageIdCounter.current++),
        role: 'user',
        content: message
      }
    ]);

    // Add pending assistant message
    setMessages(prev => [
      ...prev,
      {
        id: String(messageIdCounter.current++),
        role: 'assistant',
        content: '',
        pending: true
      }
    ]);

    // Send message through WebSocket
    wsRef.current.send(JSON.stringify({ prompt: message }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isAtBottom = () => {
    if (!scrollAreaRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    // Consider "at bottom" if within 100px of the bottom
    return scrollHeight - (scrollTop + clientHeight) < 100;
  };

  useEffect(() => {
    if (scrollAreaRef.current && isAtBottom()) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100); // Small delay to ensure content is rendered
    }
  }, [messages]);

  return (
    <div className={cn("h-[97vh] flex flex-col", className)}>
      <div className="h-12 border-b bg-muted/20 px-4 flex items-center justify-between backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <span className="font-medium">AI Assistant</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 overflow-hidden">
          <div 
            className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[calc(97vh-180px)]" 
            ref={scrollAreaRef}
          >
            {messages.length === 0 ? (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Start a conversation with the AI assistant...
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id}
                  className={cn(
                    "p-4 rounded-lg",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground ml-12" 
                      : "bg-muted mr-12"
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                    {message.pending && (
                      <Loader2 className="h-4 w-4 animate-spin inline ml-2" />
                    )}
                    {message.error && (
                      <span className="text-destructive">{message.error}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t bg-muted/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 space-y-4">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your prompt here..."
              className="w-full min-h-[80px] resize-none px-4 py-3 rounded-md bg-background border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={!input.trim() || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
