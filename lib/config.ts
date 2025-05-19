export const DEFAULT_HOST = '150.250.96.50';
export const DEFAULT_PORT = '8000';
const DEFAULT_API_VERSION = 'v1';

const getBaseUrl = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST || DEFAULT_HOST;
  const port = process.env.NEXT_PUBLIC_API_PORT || DEFAULT_PORT;
  return `${host}:${port}`;
};

export const config = {
  // Base configuration
  host: process.env.NEXT_PUBLIC_API_HOST || DEFAULT_HOST,
  port: process.env.NEXT_PUBLIC_API_PORT || DEFAULT_PORT,
  apiVersion: process.env.NEXT_PUBLIC_API_VERSION || DEFAULT_API_VERSION,
  
  // WebSocket endpoints
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || getBaseUrl(),
  wsFileWatchEndpoint: '/api/files/watch',
  wsTerminalEndpoint: '/api/terminal',
  
  // HTTP endpoints
  httpUrl: process.env.NEXT_PUBLIC_HTTP_URL || `http://${getBaseUrl()}`,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || `http://${getBaseUrl()}`,
  
  // File explorer endpoints
  fileExplorerEndpoint: '/api/files',
  fileUploadEndpoint: '/api/files/upload',
  fileDownloadEndpoint: '/api/files/download',
  
  // Authentication endpoints (if needed in the future)
  authEndpoint: '/api/auth',
  loginEndpoint: '/api/auth/login',
  logoutEndpoint: '/api/auth/logout',
} as const;

// Helper function to get full URLs
export const getUrls = {
  
  ws: (path: string = '') => `ws://${config.wsUrl}${path}`,
  http: (path: string = '') => `${config.httpUrl}${path}`,
  api: (path: string = '') => `${config.apiUrl}${path}`,
  fileExplorer: (query: string = '') => `${config.apiUrl}/api/files${query}`,
  wsFileWatch: (path: string = '/app') => 
    `ws://${config.wsUrl}/api/files/watch?path=${encodeURIComponent(path)}`,
} as const;
