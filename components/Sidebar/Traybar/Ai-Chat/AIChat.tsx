"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Appbar from './Appbar';
import Footer from './Footer';
import { useChatStore, Message } from './components/chatStore';
import UserMessage from './components/UserMessage';
import AIMessage from './components/AIMessage';
import ToolMessage from './components/ToolMessage';

function AIChat() {
  const { messages, addMessage } = useChatStore();

  const handleSendMessage = (content: string) => {
    // Add user message
    addMessage({
      type: 'human',
      role: 'user',
      content
    });

    // TODO: Add AI response logic here
    // For now, just add a simple response
    setTimeout(() => {
      addMessage({
        type: 'ai',
        role: 'assistant',
        content: "# this is the response to your query: . This is a placeholder response. \n > ${content} \n **bold** *italic* \n ### Third Passage \n ```code block```",
      });
    }, 1000);
  };

  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'human':
        return <UserMessage key={message.id} message={message} />;
      case 'ai':
        return <AIMessage key={message.id} message={message} />;
      case 'tool':
        return <ToolMessage key={message.id} message={message} />;
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
    <div className="flex flex-col h-screen bg-background">
      <Appbar />
      
      <div className='flex-1 overflow-hidden'>
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

      <div className='mb-6 mx-3 shadow-md'>
        <Footer onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}

export default AIChat;

