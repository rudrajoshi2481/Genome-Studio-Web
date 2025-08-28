import { create } from 'zustand'

export interface BaseMessage {
  id: string
  timestamp: Date
  content: string
}

export interface HumanMessage extends BaseMessage {
  type: 'human'
  role: 'user'
}

export interface AIMessage extends BaseMessage {
  type: 'ai'
  role: 'assistant'
  model?: string
}

export interface SystemMessage extends BaseMessage {
  type: 'system'
  role: 'system'
}

export interface ToolMessage extends BaseMessage {
  type: 'tool'
  role: 'tool'
  toolName: string
  toolResult?: any
}

export type Message = HumanMessage | AIMessage | SystemMessage | ToolMessage

interface ChatStore {
  messages: Message[]
  isLoading: boolean
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  
  addMessage: (messageData) => {
    const message: Message = {
      ...messageData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    } as Message
    
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  clearMessages: () => set({ messages: [] }),
}))