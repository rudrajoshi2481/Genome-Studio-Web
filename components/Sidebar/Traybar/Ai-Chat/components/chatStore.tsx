import { create } from 'zustand'

export interface QueueMessageItem {
  id: string
  parts: Array<{ text: string; type: 'text' } | { filename?: string; mediaType?: string; type: 'file'; url?: string }>
}

export interface QueueTodoItem {
  id: string
  title: string
  description?: string
  status: 'completed' | 'pending'
}

export interface ToolStep {
  id: string
  toolName: string
  toolArgs?: Record<string, any>
  status: 'running' | 'complete' | 'error'
  output?: string
  error?: string
}

export type ReasoningStep =
  | { kind: 'text'; id: string; text: string }
  | { kind: 'tool'; id: string; tool: ToolStep }

export interface Message {
  id: string
  type: 'human' | 'ai' | 'tool' | 'system' | 'thinking' | 'stream' | 'reasoning' | 'plan' | 'task' | 'confirmation'
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
  reasoning?: {
    content: string
    isStreaming?: boolean
    duration?: number
    toolSteps?: ToolStep[]
    orderedSteps?: ReasoningStep[]
  }
  plan?: {
    title: string
    description?: string
    steps?: Array<{ label: string; description?: string; status?: 'complete' | 'active' | 'pending' }>
    isStreaming?: boolean
  }
  task?: {
    title: string
    items?: Array<{ label: string; files?: string[] }>
  }
  confirmation?: {
    toolName: string
    toolArgs?: Record<string, any>
    state: 'approval-requested' | 'approval-responded' | 'output-available' | 'output-denied' | 'output-error'
    approved?: boolean
    reason?: string
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
  currentReasoningId: string | null
  showConversationHistory: boolean
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  contextWindow: number
  queuedMessages: QueueMessageItem[]
  queuedTodos: QueueTodoItem[]
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, updates: Partial<Message>) => void
  updateStreamingMessage: (content: string, isComplete?: boolean) => void
  setStreamingMessage: (messageId: string | null) => void
  setCurrentReasoningId: (id: string | null) => void
  stopGeneration: () => void
  setConnectionStatus: (connected: boolean) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
  setConversations: (conversations: Conversation[]) => void
  setCurrentConversation: (conversationId: string | null) => void
  setShowConversationHistory: (show: boolean) => void
  loadConversationMessages: (conversationId: string) => void
  updateReasoningMessage: (id: string, content: string, isStreaming?: boolean) => void
  setTokenUsage: (usage: { inputTokens: number; outputTokens: number; totalTokens: number }) => void
  setContextWindow: (size: number) => void
  addQueuedMessage: (message: QueueMessageItem) => void
  removeQueuedMessage: (id: string) => void
  clearQueuedMessages: () => void
  addQueuedTodo: (todo: QueueTodoItem) => void
  removeQueuedTodo: (id: string) => void
  updateQueuedTodo: (id: string, updates: Partial<QueueTodoItem>) => void
  clearQueuedTodos: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversations: [],
  currentConversationId: null,
  isConnected: false,
  isLoading: false,
  currentStreamingMessageId: null,
  currentReasoningId: null,
  showConversationHistory: true,
  tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  contextWindow: 4096,
  queuedMessages: [],
  queuedTodos: [],
  
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

  setCurrentReasoningId: (id) =>
    set({ currentReasoningId: id }),

  stopGeneration: () => {
    const state = get();
    set({
      isLoading: false,
      currentStreamingMessageId: null,
      currentReasoningId: null,
      messages: state.messages.map((msg) => {
        if (msg.isStreaming || msg.reasoning?.isStreaming) {
          return {
            ...msg,
            isStreaming: false,
            isComplete: true,
            reasoning: msg.reasoning
              ? { ...msg.reasoning, isStreaming: false }
              : msg.reasoning,
          };
        }
        if (msg.type === 'tool' && msg.isRunning) {
          return { ...msg, isRunning: false };
        }
        return msg;
      }),
    });
  },
    
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
    set({ currentConversationId: conversationId, showConversationHistory: false, messages: [] });
  },

  updateReasoningMessage: (id, content, isStreaming) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id
          ? { ...msg, reasoning: { ...msg.reasoning, content, isStreaming } }
          : msg
      ),
    }));
  },

  setTokenUsage: (usage) =>
    set({ tokenUsage: usage }),

  setContextWindow: (size) =>
    set({ contextWindow: size }),

  addQueuedMessage: (message) =>
    set((state) => ({ queuedMessages: [...state.queuedMessages, message] })),

  removeQueuedMessage: (id) =>
    set((state) => ({ queuedMessages: state.queuedMessages.filter((m) => m.id !== id) })),

  clearQueuedMessages: () => set({ queuedMessages: [] }),

  addQueuedTodo: (todo) =>
    set((state) => ({ queuedTodos: [...state.queuedTodos, todo] })),

  removeQueuedTodo: (id) =>
    set((state) => ({ queuedTodos: state.queuedTodos.filter((t) => t.id !== id) })),

  updateQueuedTodo: (id, updates) =>
    set((state) => ({
      queuedTodos: state.queuedTodos.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  clearQueuedTodos: () => set({ queuedTodos: [] }),
}))