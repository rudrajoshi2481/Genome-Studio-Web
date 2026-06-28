import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UploadedFile {
  id: string
  name: string
  mimeType: string
  size: number
  url?: string
  dataUrl?: string
  previewUrl?: string
  isUploading?: boolean
  progress?: number
}

export interface ChatMentionItem {
  type: 'tool' | 'agent' | 'workflow' | 'database' | 'command'
  name: string
  id?: string
  description?: string
}

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

export interface PendingFile {
  id: string
  file_id: string
  filename: string
  file_path: string
  file_type: string
  size?: number
  toolName?: string
  status: 'pending' | 'accepted' | 'rejected'
  additions?: number
  deletions?: number
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
    steps?: Array<{ label: string; description?: string; status?: 'complete' | 'active' | 'pending'; toolName?: string }>
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
    savedFiles?: Array<{
      file_id: string
      file_path: string
      filename: string
      file_type: string
      size?: number
    }>
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

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  pendingFiles: PendingFile[]
  isTemporary: boolean
}

interface ChatState {
  messages: Message[]
  conversations: Conversation[]
  currentConversationId: string | null
  isNewChat: boolean
  isConnected: boolean
  openSessions: ChatSession[]
  activeSessionId: string | null
  isLoading: boolean
  currentStreamingMessageId: string | null
  currentReasoningId: string | null
  showConversationHistory: boolean
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }
  contextWindow: number
  queuedMessages: QueueMessageItem[]
  queuedTodos: QueueTodoItem[]
  mentions: ChatMentionItem[]
  uploadedFiles: UploadedFile[]
  selectedModel: string
  availableModels: string[]
  pinnedModels: string[]
  promptSuggestions: string[]
  enabledDatabases: string[]
  keepIntermediateFiles: boolean
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
  updateQueuedMessage: (id: string, updates: Partial<QueueMessageItem>) => void
  clearQueuedMessages: () => void
  addQueuedTodo: (todo: QueueTodoItem) => void
  removeQueuedTodo: (id: string) => void
  updateQueuedTodo: (id: string, updates: Partial<QueueTodoItem>) => void
  clearQueuedTodos: () => void
  setMentions: (mentions: ChatMentionItem[]) => void
  addMention: (mention: ChatMentionItem) => void
  removeMention: (mention: ChatMentionItem) => void
  clearMentions: () => void
  addUploadedFile: (file: UploadedFile) => void
  updateUploadedFile: (id: string, updates: Partial<UploadedFile>) => void
  removeUploadedFile: (id: string) => void
  clearUploadedFiles: () => void
  setSelectedModel: (model: string) => void
  setAvailableModels: (models: string[]) => void
  setPinnedModels: (models: string[]) => void
  setPromptSuggestions: (suggestions: string[]) => void
  setEnabledDatabases: (databases: string[]) => void
  toggleDatabase: (databaseId: string) => void
  setKeepIntermediateFiles: (keep: boolean) => void
  pendingFiles: PendingFile[]
  showFilePanel: boolean
  addPendingFile: (file: PendingFile) => void
  addPendingFiles: (files: PendingFile[]) => void
  removePendingFile: (id: string) => void
  clearPendingFiles: () => void
  setShowFilePanel: (show: boolean) => void
  permissionMode: 'default' | 'bypass' | 'always'
  allowedTools: string[]
  setPermissionMode: (mode: 'default' | 'bypass' | 'always') => void
  addAllowedTool: (toolName: string) => void
  resetPermissionMode: () => void
  openSession: (id: string, title: string, messages?: Message[]) => void
  closeSession: (id: string) => void
  switchSession: (id: string) => void
  updateSessionTitle: (id: string, title: string) => void
  cacheCurrentSession: () => void
  getActiveSession: () => ChatSession | null
  isSessionActive: (sessionId: string) => boolean
  addMessageToSession: (sessionId: string, message: Message) => string
  updateMessagesInSession: (sessionId: string, updater: (messages: Message[]) => Message[]) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  messages: [],
  conversations: [],
  currentConversationId: null,
  isNewChat: true,
  isConnected: false,
  isLoading: false,
  currentStreamingMessageId: null,
  currentReasoningId: null,
  showConversationHistory: true,
  tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  contextWindow: 4096,
  queuedMessages: [],
  queuedTodos: [],
  mentions: [],
  uploadedFiles: [],
  selectedModel: '',
  availableModels: [],
  pinnedModels: [],
  promptSuggestions: [],
  enabledDatabases: ['pubmed'],
  keepIntermediateFiles: false,
  permissionMode: 'default' as 'default' | 'bypass' | 'always',
  allowedTools: [] as string[],
  
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
      messages: state.messages
        .filter(msg => msg.type !== 'thinking')
        .map((msg) => {
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
    set({ currentConversationId: conversationId, showConversationHistory: false, isNewChat: conversationId === null }),
    
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

  updateQueuedMessage: (id, updates) =>
    set((state) => ({
      queuedMessages: state.queuedMessages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

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

  setMentions: (mentions) => set({ mentions }),

  addMention: (mention) =>
    set((state) => {
      if (mention.type === 'agent') {
        return { mentions: [...state.mentions.filter((m) => m.type !== 'agent'), mention] };
      }
      if (state.mentions.some((m) => m.name === mention.name && m.type === mention.type)) {
        return state;
      }
      return { mentions: [...state.mentions, mention] };
    }),

  removeMention: (mention) =>
    set((state) => ({
      mentions: state.mentions.filter(
        (m) => !(m.name === mention.name && m.type === mention.type),
      ),
    })),

  clearMentions: () => set({ mentions: [] }),

  addUploadedFile: (file) =>
    set((state) => ({ uploadedFiles: [...state.uploadedFiles, file] })),

  updateUploadedFile: (id, updates) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      ),
    })),

  removeUploadedFile: (id) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id),
    })),

  clearUploadedFiles: () => set({ uploadedFiles: [] }),

  setSelectedModel: (model) => set({ selectedModel: model }),
  setAvailableModels: (models) => set({ availableModels: models }),
  setPinnedModels: (models) => set({ pinnedModels: models }),
  setPromptSuggestions: (suggestions) => set({ promptSuggestions: suggestions }),
  setEnabledDatabases: (databases) => set({ enabledDatabases: databases }),
  toggleDatabase: (databaseId) =>
    set((state) => {
      const isEnabled = state.enabledDatabases.includes(databaseId);
      return {
        enabledDatabases: isEnabled
          ? state.enabledDatabases.filter((d) => d !== databaseId)
          : [...state.enabledDatabases, databaseId],
      };
    }),
  setKeepIntermediateFiles: (keep) => set({ keepIntermediateFiles: keep }),
  pendingFiles: [],
  showFilePanel: false,
  openSessions: [],
  activeSessionId: null,

  openSession: (id, title, msgs) => {
    set((state) => {
      if (state.openSessions.some(s => s.id === id)) {
        return { activeSessionId: id };
      }
      return {
        openSessions: [...state.openSessions, { id, title, messages: msgs || [], pendingFiles: [], isTemporary: id.startsWith('temp-') }],
        activeSessionId: id,
      };
    });
  },

  closeSession: (id) => {
    set((state) => {
      const remaining = state.openSessions.filter(s => s.id !== id);
      let newActiveId = state.activeSessionId;
      if (state.activeSessionId === id) {
        newActiveId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      }
      let newMessages = state.messages;
      if (newActiveId) {
        const session = remaining.find(s => s.id === newActiveId);
        if (session) {
          newMessages = session.messages;
        }
      } else {
        newMessages = [];
      }
      return {
        openSessions: remaining,
        activeSessionId: newActiveId,
        messages: newMessages,
        currentConversationId: newActiveId && !newActiveId.startsWith('temp-') ? newActiveId : null,
        isNewChat: !newActiveId || newActiveId.startsWith('temp-'),
        promptSuggestions: [],
      };
    });
  },

  switchSession: (id) => {
    const state = get();
    const session = state.openSessions.find(s => s.id === id);
    if (!session) return;

    // Cache current messages into the current session
    const updatedSessions = state.openSessions.map(s =>
      s.id === state.activeSessionId
        ? { ...s, messages: state.messages, pendingFiles: state.pendingFiles }
        : s
    );

    const targetSession = updatedSessions.find(s => s.id === id);
    set({
      openSessions: updatedSessions,
      activeSessionId: id,
      messages: targetSession?.messages || [],
      pendingFiles: targetSession?.pendingFiles || [],
      currentConversationId: id.startsWith('temp-') ? null : id,
      isNewChat: id.startsWith('temp-'),
      promptSuggestions: [],
    });
  },

  updateSessionTitle: (id, title) => {
    set((state) => ({
      openSessions: state.openSessions.map(s =>
        s.id === id ? { ...s, title } : s
      ),
    }));
  },

  cacheCurrentSession: () => {
    const state = get();
    if (!state.activeSessionId) return;
    set((s) => ({
      openSessions: s.openSessions.map(sess =>
        sess.id === state.activeSessionId
          ? { ...sess, messages: state.messages, pendingFiles: state.pendingFiles }
          : sess
      ),
    }));
  },

  getActiveSession: () => {
    const state = get();
    return state.openSessions.find(s => s.id === state.activeSessionId) || null;
  },

  isSessionActive: (sessionId: string) => {
    const state = get();
    return state.activeSessionId === sessionId;
  },

  addMessageToSession: (sessionId: string, message: any) => {
    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const fullMessage = {
      ...message,
      id: messageId,
      timestamp: new Date().toISOString(),
    };
    const state = get();
    // If this is the active session, add to messages directly
    if (state.activeSessionId === sessionId) {
      set({ messages: [...state.messages, fullMessage] });
    } else {
      // Otherwise, add to the background session's messages
      set({
        openSessions: state.openSessions.map(s =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, fullMessage] }
            : s
        ),
      });
    }
    return messageId;
  },

  updateMessagesInSession: (sessionId: string, updater: (messages: any[]) => any[]) => {
    const state = get();
    if (state.activeSessionId === sessionId) {
      set({ messages: updater(state.messages) });
    } else {
      set({
        openSessions: state.openSessions.map(s =>
          s.id === sessionId
            ? { ...s, messages: updater(s.messages) }
            : s
        ),
      });
    }
  },

  addPendingFile: (file) =>
    set((state) => {
      const existing = state.pendingFiles.filter((f) => f.filename !== file.filename);
      return {
        pendingFiles: [...existing, file],
        showFilePanel: true,
      };
    }),
  addPendingFiles: (files) =>
    set((state) => {
      const existingMap = new Map(state.pendingFiles.map(f => [f.filename, f]));
      for (const file of files) {
        const existing = existingMap.get(file.filename);
        if (existing) {
          existingMap.set(file.filename, {
            ...file,
            additions: (existing.additions || 0) + (file.additions || 0),
            deletions: (existing.deletions || 0) + (file.deletions || 0),
          });
        } else {
          existingMap.set(file.filename, file);
        }
      }
      return {
        pendingFiles: Array.from(existingMap.values()),
        showFilePanel: files.length > 0 ? true : state.showFilePanel,
      };
    }),
  removePendingFile: (id) =>
    set((state) => {
      const remaining = state.pendingFiles.filter((f) => f.id !== id);
      return {
        pendingFiles: remaining,
        showFilePanel: remaining.length > 0 ? state.showFilePanel : false,
      };
    }),
  clearPendingFiles: () => set({ pendingFiles: [], showFilePanel: false }),
  setShowFilePanel: (show) => set({ showFilePanel: show }),
  setPermissionMode: (mode) => set({ permissionMode: mode }),
  addAllowedTool: (toolName) => set((state) => ({
    allowedTools: state.allowedTools.includes(toolName) ? state.allowedTools : [...state.allowedTools, toolName],
  })),
  resetPermissionMode: () => set({ permissionMode: 'default', allowedTools: [] }),
}),
    {
      name: 'genome-studio-chat-settings',
      partialize: (state) => ({
        enabledDatabases: state.enabledDatabases,
        keepIntermediateFiles: state.keepIntermediateFiles,
        openSessions: state.openSessions,
        activeSessionId: state.activeSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.activeSessionId && state.openSessions.length > 0) {
          const activeSession = state.openSessions.find(s => s.id === state.activeSessionId);
          if (activeSession) {
            state.messages = activeSession.messages;
            state.currentConversationId = state.activeSessionId.startsWith('temp-') ? null : state.activeSessionId;
            state.isNewChat = state.activeSessionId.startsWith('temp-');
          }
        }
      },
    }
  )
)