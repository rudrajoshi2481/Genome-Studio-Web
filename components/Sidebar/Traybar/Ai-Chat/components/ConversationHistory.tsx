import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Clock, Zap } from 'lucide-react';
import { useChatStore, Conversation } from './chatStore';

interface ConversationHistoryProps {
  onNewConversation: () => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ onNewConversation }) => {
  const { 
    conversations, 
    setCurrentConversation, 
    setConversations,
    isLoading 
  } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/v1/ai-agent/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    setCurrentConversation(conversation.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'research':
        return '🔬';
      case 'coding':
        return '💻';
      case 'analysis':
        return '📊';
      default:
        return '🧬';
    }
  };

  const getAgentName = (agentType: string) => {
    switch (agentType) {
      case 'research':
        return 'Research Assistant';
      case 'coding':
        return 'Bioinformatics Programmer';
      case 'analysis':
        return 'Genomic Data Analyst';
      default:
        return 'Genome Studio AI';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with New Conversation Button */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">AI Conversations</h2>
          <Button 
            onClick={onNewConversation}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Continue your previous conversations or start a new one
        </p>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium mb-1">No conversations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start your first AI conversation
              </p>
              <Button onClick={onNewConversation} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Start Chatting
              </Button>
            </div>
          ) : (
            conversations.map((conversation) => (
              <Card 
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-l-4 border-l-primary/20 hover:border-l-primary"
                onClick={() => handleConversationClick(conversation)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">{getAgentIcon(conversation.agent_type)}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {conversation.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {getAgentName(conversation.agent_type)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {conversation.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{conversation.message_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>{conversation.total_tokens_used}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(conversation.last_message_at || conversation.updated_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationHistory;
