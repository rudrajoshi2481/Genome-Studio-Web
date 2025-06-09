/**
 * Server Configuration
 * 
 * This file contains configuration settings for connecting to the backend server.
 * Values can be overridden by environment variables.
 */

interface ServerConfig {
  // Backend API connection details
  api: {
    protocol: string;
    host: string;
    port: number;
    baseUrl: string;
    timeout: number;
    version: string;
  };
  
  // WebSocket connection details
  websocket: {
    protocol: string;
    host: string;
    port: number;
    path: string;
  };
  
  // Authentication settings
  auth: {
    tokenStorageKey: string;
    refreshTokenStorageKey: string;
    tokenExpiryKey: string;
  };
}

// Default configuration values
const defaultConfig: ServerConfig = {
  api: {
    protocol: process.env.NEXT_PUBLIC_API_PROTOCOL || 'http',
    host: process.env.NEXT_PUBLIC_API_HOST || 'localhost',
    port: parseInt(process.env.NEXT_PUBLIC_API_PORT || '8000', 10),
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
    version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
  },
  websocket: {
    protocol: process.env.NEXT_PUBLIC_WS_PROTOCOL || 'ws',
    host: process.env.NEXT_PUBLIC_WS_HOST || 'localhost',
    port: parseInt(process.env.NEXT_PUBLIC_WS_PORT || '8000', 10),
    path: process.env.NEXT_PUBLIC_WS_PATH || '/ws',
  },
  auth: {
    tokenStorageKey: 'genome_studio_token',
    refreshTokenStorageKey: 'genome_studio_refresh_token',
    tokenExpiryKey: 'genome_studio_token_expiry',
  },
};

/**
 * Get the complete server configuration
 */
export function getServerConfig(): ServerConfig {
  return defaultConfig;
}

/**
 * Get the API base URL (including protocol, host, port, and base path)
 */
export function getApiBaseUrl(): string {
  const { protocol, host, port, baseUrl } = defaultConfig.api;
  return `${protocol}://${host}:${port}${baseUrl}`;
}

/**
 * Get the WebSocket URL (including protocol, host, port, and path)
 */
export function getWebsocketUrl(endpoint: string = ''): string {
  const { protocol, host, port, path } = defaultConfig.websocket;
  return `${protocol}://${host}:${port}${path}${endpoint}`;
}

/**
 * Get the workflow manager WebSocket URL
 */
export function getWorkflowManagerWebsocketUrl(): string {
  return getWebsocketUrl('/workflow-manager');
}

/**
 * Get the workflow execution WebSocket URL
 */
export function getWorkflowExecuteWebsocketUrl(): string {
  return getWebsocketUrl('/workflow-manager/execute');
}

export default defaultConfig;
