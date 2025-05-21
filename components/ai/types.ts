export type AIEventType = 'start' | 'token' | 'action' | 'end' | 'error';

export interface AIEvent {
  event_type: AIEventType;
  data: any;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  error?: string;
}

export interface AIContext {
  file?: string;
  // Add other context properties as needed
}

export interface AIRequest {
  query: string;
  context?: AIContext;
  stream?: boolean;
}
