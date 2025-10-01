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
                  <div className="px-2 mb-4">
                    <h3 className="text-lg font-bold text-foreground bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Start a conversation
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      Ask about genome analysis, workflows, or get help with code
                    </p>
                  </div>
                  
                  {/* Suggestion Cards */}
                  <div className="grid grid-cols-1 gap-2 px-2 w-full max-w-md">
                    <button
                      onClick={() => onSendMessage("Help me analyze genomic data")}
                      className="group flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/40 dark:hover:to-blue-800/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-all duration-200 hover:shadow-md text-left"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300">
                          Analysis
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Analyze genomic data
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <button
                      onClick={() => onSendMessage("Create a bioinformatics workflow")}
                      className="group flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/40 dark:hover:to-purple-800/40 rounded-lg border border-purple-200 dark:border-purple-800 transition-all duration-200 hover:shadow-md text-left"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-300">
                          Workflows
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Build analysis pipelines
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <button
                      onClick={() => onSendMessage("Help me write Python code for bioinformatics")}
                      className="group flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/40 dark:hover:to-green-800/40 rounded-lg border border-green-200 dark:border-green-800 transition-all duration-200 hover:shadow-md text-left"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground group-hover:text-green-700 dark:group-hover:text-green-300">
                          Code
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Generate Python code
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
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
