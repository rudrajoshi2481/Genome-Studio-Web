import { create } from 'zustand'

export interface Message {
  id: string
  type: 'human' | 'ai' | 'tool' | 'system' | 'thinking' | 'stream'
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  isStreaming?: boolean
  isComplete?: boolean
  isRunning?: boolean
  result?: any
  conversationId?: string
  model?: string
  toolName?: string
  toolResult?: {
    status?: string
    error?: string
    [key: string]: any
  }
  metadata?: {
    toolName?: string
    toolArgs?: Record<string, any>
    toolIndex?: number
    totalTools?: number
    iteration?: number
    toolMessageId?: string
    toolResults?: Array<{
      status?: string
      filepath?: string
      file_location?: string
      file_name?: string
      file_size?: number
      command?: string
      return_code?: number
      tool_name?: string
      [key: string]: any
    }>
  }
}

export interface Conversation {
  id: string
  title: string
  agent_type: string
  status: string
  created_at: string
  updated_at: string
  last_message_at?: string
  message_count: number
  total_tokens_used: number
}

interface ChatState {
  messages: Message[]
  conversations: Conversation[]
  currentConversationId: string | null
  isConnected: boolean
  isLoading: boolean
  currentStreamingMessageId: string | null
  showConversationHistory: boolean
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, updates: Partial<Message>) => void
  updateStreamingMessage: (content: string, isComplete?: boolean) => void
  setStreamingMessage: (messageId: string | null) => void
  setConnectionStatus: (connected: boolean) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
  setConversations: (conversations: Conversation[]) => void
  setCurrentConversation: (conversationId: string | null) => void
  setShowConversationHistory: (show: boolean) => void
  loadConversationMessages: (conversationId: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversations: [],
  currentConversationId: null,
  isConnected: false,
  isLoading: false,
  currentStreamingMessageId: null,
  showConversationHistory: true,
  
  addMessage: (message) => {
    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: messageId,
          timestamp: new Date().toISOString(),
        },
      ],
    }));
    return messageId;
  },
    
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),
    
  updateStreamingMessage: (content, isComplete = false) => {
    const state = get()
    if (state.currentStreamingMessageId) {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === state.currentStreamingMessageId
            ? { ...msg, content, isComplete, isStreaming: !isComplete }
            : msg
        ),
      }))
    }
  },
  
  setStreamingMessage: (messageId) =>
    set({ currentStreamingMessageId: messageId }),
    
  setConnectionStatus: (connected) =>
    set({ isConnected: connected }),
    
  setLoading: (loading) =>
    set({ isLoading: loading }),
    
  clearMessages: () => set({ messages: [] }),
  
  setConversations: (conversations) =>
    set({ conversations }),
    
  setCurrentConversation: (conversationId) =>
    set({ currentConversationId: conversationId, showConversationHistory: false }),
    
  setShowConversationHistory: (show) =>
    set({ showConversationHistory: show }),
    
  loadConversationMessages: (conversationId) => {
    // This will be implemented to fetch messages for a specific conversation
    set({ currentConversationId: conversationId, showConversationHistory: false, messages: [] });
  },
}))