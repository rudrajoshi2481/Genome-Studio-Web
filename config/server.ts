

/**
 * Server Configuration
 * 
 * This file contains configuration settings for connecting to the backend server.
 * Values can be overridden by environment variables.
 */

// --- Lazy host/port resolution ---
// In Electron packaged mode, the backend serves the frontend on a dynamic port,
// so window.location.port IS the backend port. In dev mode, the frontend runs on
// port 3000 and the backend on a separate port (from env).
// We detect Electron via TWO methods (belt-and-suspenders):
//   1. window.electronAPI?.isElectron — injected by preload script
//   2. navigator.userAgent.includes('Electron') — always present in Electron
// IMPORTANT: These are evaluated at CALL TIME, not at module load time, so they
// work correctly even in new windows opened after initial load.
function _isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  // Method 1: preload-injected flag
  const hasElectronAPI = !!window.electronAPI?.isElectron;
  // Method 2: user agent check (always works in Electron, even if preload fails)
  const uaHasElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
  const result = hasElectronAPI || uaHasElectron;
  if (typeof console !== 'undefined') {
    console.log('[config/server] _isElectron:', { hasElectronAPI, uaHasElectron, result, ua: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 80) : 'no-navigator', locPort: window.location?.port });
  }
  return result;
}

export function getHost(): string {
  if (_isElectron()) {
    return window.location.hostname || process.env.NEXT_PUBLIC_API_HOST || '127.0.0.1';
  }
  return process.env.NEXT_PUBLIC_API_HOST || '127.0.0.1';
}

export function getPort(): string {
  if (_isElectron()) {
    // In Electron packaged mode, the backend serves the frontend, so
    // window.location.port IS the backend port (e.g. 63023).
    const locPort = window.location.port;
    if (locPort) return locPort;
    // Fallback to env var if port is empty (shouldn't happen with http URLs)
    return process.env.NEXT_PUBLIC_API_PORT || '8000';
  }
  return process.env.NEXT_PUBLIC_API_PORT || '8000';
}

/** Returns `http://host:port` (without /api/v1) — evaluated at call time */
export function getServerOrigin(): string {
  return `${getProtocol()}://${getHost()}:${getPort()}`;
}

/** Returns the protocol (http or https) — evaluated at call time */
export function getProtocol(): string {
  if (_isElectron() && typeof window !== 'undefined') {
    return window.location.protocol.replace(':', '') || 'http';
  }
  return process.env.NEXT_PUBLIC_API_PROTOCOL || 'http';
}

// Keep backward-compatible const exports for code that hasn't been migrated yet.
// These are evaluated once at module load time and may be stale in dynamic-port scenarios.
export const host = getHost();
export const port = getPort();




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
    host: host,
    port: parseInt(port, 10),
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
    version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
  },
  websocket: {
    protocol: process.env.NEXT_PUBLIC_WS_PROTOCOL || 'ws',
    host: host,
    port: parseInt(port, 10),
    path: process.env.NEXT_PUBLIC_WS_PATH || '/ws',
  },
  auth: {
    tokenStorageKey: 'bioinformatics_studio_token',
    refreshTokenStorageKey: 'bioinformatics_studio_refresh_token',
    tokenExpiryKey: 'bioinformatics_studio_token_expiry',
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
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
  return `${getServerOrigin()}${baseUrl}`;
}

/**
 * Get the WebSocket URL (including protocol, host, port, and path)
 */
export function getWebsocketUrl(endpoint: string = ''): string {
  const path = process.env.NEXT_PUBLIC_WS_PATH || '/ws';
  const wsProtocol = getProtocol() === 'https' ? 'wss' : 'ws';
  return `${wsProtocol}://${getHost()}:${getPort()}${path}${endpoint}`;
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
