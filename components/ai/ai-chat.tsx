import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAIChat } from "./use-ai-chat";

interface AIChatProps {
  className?: string;
}

export function AIChat({ className }: AIChatProps) {
  const { messages, isLoading, sendMessage } = useAIChat();
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
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
        <ScrollArea className="flex-1 p-4">
          <div className="flex-1 overflow-auto p-4 space-y-4" ref={scrollAreaRef}>
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
