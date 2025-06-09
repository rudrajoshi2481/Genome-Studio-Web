import { useAuthToken } from '@/lib/stores/auth-store';
import { websocketUrls } from '@/lib/utils/api-config';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Helper function to get auth token
export const getAuthToken = (): string | null => {
  if (!isBrowser) return null;
  return useAuthToken();
};

// WebSocket URL for file explorer - using direct URL that's confirmed working
export const WS_URL = 'ws://150.250.96.50:8000/api/v1/file-explorer/watch';

// Create WebSocket URL with authentication
export const createWebSocketUrl = (path: string): string => {
  const token = getAuthToken();
  let wsUrl = `${WS_URL}?directory=${encodeURIComponent(path)}`;
  
  if (token) {
    wsUrl += `&token=${encodeURIComponent(token)}`;
  }
  
  return wsUrl;
};
