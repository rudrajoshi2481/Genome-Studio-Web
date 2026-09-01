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
  type: 'tool' | 'agent' | 'workflow' | 'database' | 'command' | 'file' | 'skill'
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
  status: 'completed' | 'active' | 'pending'
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
  type: 'human' | 'ai' | 'tool' | 'tool_code' | 'system' | 'thinking' | 'stream' | 'reasoning' | 'plan' | 'task' | 'confirmation' | 'separator' | 'error' | 'retry'
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
  // Error message metadata (type === 'error')
  errorKind?: 'rate_limit' | 'timeout' | 'context_length' | 'auth' | 'connection' | 'generic'
  errorTitle?: string
  errorDetail?: string
  errorCode?: string
  canRetry?: boolean
  // Retry message metadata (type === 'retry')
  retryAttempt?: number
  retryMaxAttempts?: number
  retryDelay?: number
  // errorCode is shared with error messages (declared above)
  reasoning?: {
    content: string
    isStreaming?: boolean
    duration?: number
    startedAt?: number
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
  code?: string
  codeLanguage?: string
  outputLines?: string[]
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
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }
  contextWindow: number
  contextTokens: number
  isLoading: boolean
  queuedMessages: QueueMessageItem[]
  queuedTodos: QueueTodoItem[]
  mentions: ChatMentionItem[]
  uploadedFiles: UploadedFile[]
  promptSuggestions: string[]
  permissionMode: 'default' | 'bypass' | 'always'
  allowedTools: string[]
  currentStreamingMessageId: string | null
  currentReasoningId: string | null
  showFilePanel: boolean
  currentConversationId: string | null
  isNewChat: boolean
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
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }
  contextWindow: number
  contextTokens: number
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
  setTokenUsage: (usage: { inputTokens: number; outputTokens: number; totalTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }) => void
  setContextWindow: (size: number) => void
  setContextTokens: (tokens: number) => void
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
  tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  contextWindow: 0,
  contextTokens: 0,
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
  permissionMode: 'bypass' as 'default' | 'bypass' | 'always',
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
        if (msg.type === 'tool_code' && msg.isRunning) {
          return { ...msg, isRunning: false };
        }
        return msg;
      }),
      openSessions: state.openSessions.map(s =>
        ({ ...s, isLoading: false, currentStreamingMessageId: null, currentReasoningId: null })
      ),
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

  setContextTokens: (tokens) =>
    set({ contextTokens: tokens }),

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
      const existing = state.openSessions.find(s => s.id === id);
      if (existing) {
        return {
          activeSessionId: id,
          messages: existing.messages,
          pendingFiles: existing.pendingFiles || [],
          tokenUsage: existing.tokenUsage || { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
          contextWindow: existing.contextWindow || 0,
          contextTokens: existing.contextTokens || 0,
          isLoading: existing.isLoading || false,
          queuedMessages: existing.queuedMessages || [],
          queuedTodos: existing.queuedTodos || [],
          mentions: existing.mentions || [],
          uploadedFiles: existing.uploadedFiles || [],
          promptSuggestions: existing.promptSuggestions || [],
          permissionMode: existing.permissionMode || 'bypass',
          allowedTools: existing.allowedTools || [],
          currentStreamingMessageId: existing.currentStreamingMessageId || null,
          currentReasoningId: existing.currentReasoningId || null,
          showFilePanel: existing.showFilePanel || false,
          currentConversationId: existing.currentConversationId ?? (id.startsWith('temp-') ? null : id),
          isNewChat: existing.isNewChat ?? id.startsWith('temp-'),
        };
      }
      const newSession: ChatSession = {
        id, title, messages: msgs || [], pendingFiles: [], isTemporary: id.startsWith('temp-'),
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, contextWindow: 0, contextTokens: 0, isLoading: false,
        queuedMessages: [], queuedTodos: [], mentions: [], uploadedFiles: [], promptSuggestions: [],
        permissionMode: 'bypass' as 'default' | 'bypass' | 'always', allowedTools: [],
        currentStreamingMessageId: null, currentReasoningId: null, showFilePanel: false,
        currentConversationId: id.startsWith('temp-') ? null : id, isNewChat: id.startsWith('temp-'),
      };
      return {
        openSessions: [...state.openSessions, newSession],
        activeSessionId: id,
        messages: msgs || [],
        pendingFiles: [],
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        contextWindow: 4096,
        contextTokens: 0,
        isLoading: false,
        queuedMessages: [],
        queuedTodos: [],
        mentions: [],
        uploadedFiles: [],
        promptSuggestions: [],
        permissionMode: 'bypass' as 'default' | 'bypass' | 'always',
        allowedTools: [],
        currentStreamingMessageId: null,
        currentReasoningId: null,
        showFilePanel: false,
        currentConversationId: id.startsWith('temp-') ? null : id,
        isNewChat: id.startsWith('temp-'),
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
      if (newActiveId) {
        const session = remaining.find(s => s.id === newActiveId);
        if (session) {
          return {
            openSessions: remaining,
            activeSessionId: newActiveId,
            messages: session.messages,
            pendingFiles: session.pendingFiles || [],
            tokenUsage: session.tokenUsage || { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
            contextWindow: session.contextWindow || 0,
            contextTokens: session.contextTokens || 0,
            isLoading: session.isLoading || false,
            queuedMessages: session.queuedMessages || [],
            queuedTodos: session.queuedTodos || [],
            mentions: session.mentions || [],
            uploadedFiles: session.uploadedFiles || [],
            promptSuggestions: session.promptSuggestions || [],
            permissionMode: session.permissionMode || 'bypass',
            allowedTools: session.allowedTools || [],
            currentStreamingMessageId: session.currentStreamingMessageId || null,
            currentReasoningId: session.currentReasoningId || null,
            showFilePanel: session.showFilePanel || false,
            currentConversationId: session.currentConversationId ?? (newActiveId.startsWith('temp-') ? null : newActiveId),
            isNewChat: session.isNewChat ?? newActiveId.startsWith('temp-'),
          };
        }
      }
      return {
        openSessions: remaining,
        activeSessionId: null as string | null,
        messages: [] as Message[],
        pendingFiles: [] as PendingFile[],
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        contextWindow: 0,
        contextTokens: 0,
        isLoading: false,
        queuedMessages: [] as QueueMessageItem[],
        queuedTodos: [] as QueueTodoItem[],
        mentions: [] as ChatMentionItem[],
        uploadedFiles: [] as UploadedFile[],
        promptSuggestions: [] as string[],
        permissionMode: 'bypass' as 'default' | 'bypass' | 'always',
        allowedTools: [] as string[],
        currentStreamingMessageId: null,
        currentReasoningId: null,
        showFilePanel: false,
        currentConversationId: null,
        isNewChat: true,
      };
    });
  },

  switchSession: (id) => {
    const state = get();
    const session = state.openSessions.find(s => s.id === id);
    if (!session) return;

    // Cache ALL current state into the outgoing session
    const updatedSessions = state.openSessions.map(s =>
      s.id === state.activeSessionId
        ? {
            ...s,
            messages: state.messages,
            pendingFiles: state.pendingFiles,
            tokenUsage: state.tokenUsage,
            contextWindow: state.contextWindow,
            contextTokens: state.contextTokens,
            isLoading: state.isLoading,
            queuedMessages: state.queuedMessages,
            queuedTodos: state.queuedTodos,
            mentions: state.mentions,
            uploadedFiles: state.uploadedFiles,
            promptSuggestions: state.promptSuggestions,
            permissionMode: state.permissionMode,
            allowedTools: state.allowedTools,
            currentStreamingMessageId: state.currentStreamingMessageId,
            currentReasoningId: state.currentReasoningId,
            showFilePanel: state.showFilePanel,
            currentConversationId: state.currentConversationId,
            isNewChat: state.isNewChat,
          }
        : s
    );

    const targetSession = updatedSessions.find(s => s.id === id);
    set({
      openSessions: updatedSessions,
      activeSessionId: id,
      messages: targetSession?.messages || [],
      pendingFiles: targetSession?.pendingFiles || [],
      tokenUsage: targetSession?.tokenUsage || { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      contextWindow: targetSession?.contextWindow || 0,
      contextTokens: targetSession?.contextTokens || 0,
      isLoading: targetSession?.isLoading || false,
      queuedMessages: targetSession?.queuedMessages || [],
      queuedTodos: targetSession?.queuedTodos || [],
      mentions: targetSession?.mentions || [],
      uploadedFiles: targetSession?.uploadedFiles || [],
      promptSuggestions: targetSession?.promptSuggestions || [],
      permissionMode: targetSession?.permissionMode || 'bypass',
      allowedTools: targetSession?.allowedTools || [],
      currentStreamingMessageId: targetSession?.currentStreamingMessageId || null,
      currentReasoningId: targetSession?.currentReasoningId || null,
      showFilePanel: targetSession?.showFilePanel || false,
      currentConversationId: targetSession?.currentConversationId ?? (id.startsWith('temp-') ? null : id),
      isNewChat: targetSession?.isNewChat ?? id.startsWith('temp-'),
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
          ? {
              ...sess,
              messages: state.messages,
              pendingFiles: state.pendingFiles,
              tokenUsage: state.tokenUsage,
              contextWindow: state.contextWindow,
              contextTokens: state.contextTokens,
              isLoading: state.isLoading,
              queuedMessages: state.queuedMessages,
              queuedTodos: state.queuedTodos,
              mentions: state.mentions,
              uploadedFiles: state.uploadedFiles,
              promptSuggestions: state.promptSuggestions,
              permissionMode: state.permissionMode,
              allowedTools: state.allowedTools,
              currentStreamingMessageId: state.currentStreamingMessageId,
              currentReasoningId: state.currentReasoningId,
              showFilePanel: state.showFilePanel,
              currentConversationId: state.currentConversationId,
              isNewChat: state.isNewChat,
            }
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
    set((state) => {
      if (state.activeSessionId === sessionId) {
        return { messages: updater(state.messages) };
      }
      return {
        openSessions: state.openSessions.map(s =>
          s.id === sessionId
            ? { ...s, messages: updater(s.messages) }
            : s
        ),
      };
    });
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
  setPermissionMode: (mode) => set((state) => {
    const updates: Partial<ChatState> = { permissionMode: mode };
    if (state.activeSessionId) {
      updates.openSessions = state.openSessions.map(s =>
        s.id === state.activeSessionId ? { ...s, permissionMode: mode } : s
      );
    }
    return updates;
  }),
  addAllowedTool: (toolName) => set((state) => {
    const newAllowed = state.allowedTools.includes(toolName) ? state.allowedTools : [...state.allowedTools, toolName];
    const updates: Partial<ChatState> = { allowedTools: newAllowed };
    if (state.activeSessionId) {
      updates.openSessions = state.openSessions.map(s =>
        s.id === state.activeSessionId ? { ...s, allowedTools: newAllowed } : s
      );
    }
    return updates;
  }),
  resetPermissionMode: () => set((state) => {
    const updates: Partial<ChatState> = { permissionMode: 'bypass', allowedTools: [] };
    if (state.activeSessionId) {
      updates.openSessions = state.openSessions.map(s =>
        s.id === state.activeSessionId ? { ...s, permissionMode: 'bypass' as const, allowedTools: [] } : s
      );
    }
    return updates;
  }),
}),
    {
      name: 'bioinformatics-studio-chat-settings',
      partialize: (state) => ({
        enabledDatabases: state.enabledDatabases,
        keepIntermediateFiles: state.keepIntermediateFiles,
        // Cap persisted messages per session to avoid bloating localStorage.
        // The last 100 messages are kept; older ones are discarded on reload.
        openSessions: state.openSessions.map(s => ({
          ...s,
          messages: s.messages.slice(-100),
        })),
        activeSessionId: state.activeSessionId,
        selectedModel: state.selectedModel,
        pinnedModels: state.pinnedModels,
        permissionMode: state.permissionMode,
        allowedTools: state.allowedTools,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.openSessions.length > 0) {
          // Clean up stale empty temp sessions (no messages, no conversation)
          state.openSessions = state.openSessions.filter(s => {
            if (s.id.startsWith('temp-') && (!s.messages || s.messages.length === 0)) {
              return false;
            }
            return true;
          });
          // If active session was removed, pick the last remaining one
          if (state.activeSessionId && !state.openSessions.find(s => s.id === state.activeSessionId)) {
            state.activeSessionId = state.openSessions.length > 0
              ? state.openSessions[state.openSessions.length - 1].id
              : null;
          }
          // If no sessions remain, create a fresh "New Chat"
          if (state.openSessions.length === 0) {
            const tempId = `temp-${Date.now()}`;
            state.openSessions = [{
              id: tempId, title: 'New Chat', messages: [], pendingFiles: [], isTemporary: true,
              tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
              contextWindow: 0, contextTokens: 0, isLoading: false,
              queuedMessages: [], queuedTodos: [], mentions: [], uploadedFiles: [], promptSuggestions: [],
              permissionMode: 'bypass' as 'default' | 'bypass' | 'always', allowedTools: [],
              currentStreamingMessageId: null, currentReasoningId: null, showFilePanel: false,
              currentConversationId: null, isNewChat: true,
            }];
            state.activeSessionId = tempId;
          }
        }
        if (state && state.activeSessionId && state.openSessions.length > 0) {
          const activeSession = state.openSessions.find(s => s.id === state.activeSessionId);
          if (activeSession) {
            state.messages = activeSession.messages;
            state.tokenUsage = activeSession.tokenUsage || { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
            state.contextWindow = activeSession.contextWindow || 0;
            state.contextTokens = activeSession.contextTokens || 0;
            state.isLoading = false;
            state.currentConversationId = activeSession.currentConversationId ?? (state.activeSessionId.startsWith('temp-') ? null : state.activeSessionId);
            state.isNewChat = activeSession.isNewChat ?? state.activeSessionId.startsWith('temp-');
            state.queuedMessages = activeSession.queuedMessages || [];
            state.queuedTodos = activeSession.queuedTodos || [];
            state.mentions = activeSession.mentions || [];
            state.uploadedFiles = activeSession.uploadedFiles || [];
            state.promptSuggestions = activeSession.promptSuggestions || [];
            // Prefer top-level persisted permissionMode (global setting) over session's
            state.permissionMode = state.permissionMode || activeSession.permissionMode || 'default';
            state.allowedTools = state.allowedTools || activeSession.allowedTools || [];
            state.currentStreamingMessageId = null;
            state.currentReasoningId = null;
            state.showFilePanel = activeSession.showFilePanel || false;
          }
        }
      },
    }
  )
)