import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import { useChatStore, Message } from './chatStore';
import UserMessage from './UserMessage';
import AIMessage from './AIMessage';
import ToolMessage from './ToolMessage';
import Footer from '../Footer';

interface ConversationViewProps {
  onBackToHistory: () => void;
  onSendMessage: (content: string) => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ 
  onBackToHistory, 
  onSendMessage 
}) => {
  const { messages, isConnected, isLoading, currentConversationId } = useChatStore();

  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'human':
        return <UserMessage key={message.id} message={message} />;
      case 'ai':
        return <AIMessage key={message.id} message={message} />;
      case 'tool':
        return <ToolMessage key={message.id} message={message} />;
      case 'thinking':
        return (
          <div key={message.id} className="text-xs text-muted-foreground text-center py-2 animate-pulse">
            <span className="inline-flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              {message.content}
            </span>
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
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Back Button */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onBackToHistory}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h2 className="text-sm font-medium">AI Conversation</h2>
            <p className="text-xs text-muted-foreground">
              {currentConversationId ? `ID: ${currentConversationId.slice(0, 8)}...` : 'New conversation'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="w-full">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <div className="text-center space-y-2 max-w-sm w-full">
                  <div className="w-10 h-10 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div className="px-2">
                    <h3 className="text-sm font-semibold text-foreground">Start a conversation</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-tight">
                      Ask about genome analysis or workflows
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center px-2">
                    <div className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      Analysis
                    </div>
                    <div className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      Workflows
                    </div>
                    <div className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      Code
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map(renderMessage)
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="mb-6 mx-3 shadow-md">
        <Footer onSendMessage={onSendMessage} />
      </div>
    </div>
  );
};

export default ConversationView;
