import { useAuthStore } from '@/components/auth/store/auth-store';
import { config } from './config';

// Get token from store or cookie
const getToken = (): string | null => {
  const token = useAuthStore.getState().token;
  if (token) return token;
  
  // Fallback to cookie
  if (typeof document === 'undefined') return null;
  
  const match = document.cookie.match(/auth_token=([^;]+)/);
  return match ? match[1] : null;
};

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${config.apiUrl}${endpoint}`;
  const token = getToken();
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  console.log(`[API] ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('[API] Error:', error);
    throw error;
  }
}

/**
 * Create an authenticated WebSocket connection
 */
export function createAuthenticatedWebSocket(
  endpoint: string, 
  params: Record<string, string> = {}
): WebSocket {
  const token = getToken();
  const queryParams = new URLSearchParams(params);
  
  if (token) {
    queryParams.append('token', token);
  }
  
  // Make sure we don't duplicate the host in the URL
  // Check if endpoint already contains the host
  let wsUrl;
  if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
    // Endpoint already has protocol, use it directly
    wsUrl = `${endpoint}?${queryParams}`;
  } else if (config.wsUrl.endsWith('/') && endpoint.startsWith('/')) {
    // Both have slashes, remove one
    wsUrl = `${config.wsUrl}${endpoint.substring(1)}?${queryParams}`;
  } else if (!config.wsUrl.endsWith('/') && !endpoint.startsWith('/')) {
    // Neither has slash, add one
    wsUrl = `${config.wsUrl}/${endpoint}?${queryParams}`;
  } else {
    // One has slash, we're good
    wsUrl = `${config.wsUrl}${endpoint}?${queryParams}`;
  }
  
  console.log(`[WebSocket] Connecting to ${wsUrl}`);
  
  const socket = new WebSocket(wsUrl);
  
  socket.onopen = () => console.log('[WebSocket] Connected');
  socket.onerror = (error) => console.error('[WebSocket] Error:', error);
  socket.onclose = (event) => console.log(`[WebSocket] Closed: ${event.code}`);
  
  return socket;
}
