import { getApiBaseUrl, getWebsocketUrl, getWorkflowManagerWebsocketUrl, getWorkflowExecuteWebsocketUrl } from '@/config/server';

/**
 * API Configuration Utility
 * 
 * This file provides utility functions for working with API endpoints
 * and WebSocket connections based on the server configuration.
 */

/**
 * Constructs a complete API endpoint URL
 * @param endpoint - The API endpoint path (without leading slash)
 * @returns The complete URL including protocol, host, port, and path
 */
export function apiEndpoint(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${normalizedEndpoint}`;
}

/**
 * Get WebSocket connection URLs
 */
export const websocketUrls = {
  /**
   * Get the base WebSocket URL
   * @param endpoint - Optional endpoint path
   */
  base: (endpoint: string = '') => getWebsocketUrl(endpoint),
  
  /**
   * Get the workflow manager WebSocket URL
   */
  workflowManager: () => getWorkflowManagerWebsocketUrl(),
  
  /**
   * Get the workflow execution WebSocket URL
   */
  workflowExecution: () => getWorkflowExecuteWebsocketUrl(),
};

/**
 * Common API endpoints used throughout the application
 * Uses getters so URLs are evaluated at access time (not module load time),
 * ensuring the correct dynamic port is used in Electron mode.
 */
export const endpoints = {
  auth: {
    get login() { return apiEndpoint('/token'); },
    get refresh() { return apiEndpoint('/token/refresh'); },
    get user() { return apiEndpoint('/me'); },
  },
  workflowManager: {
    get base() { return apiEndpoint('/workflow-manager'); },
    get workflows() { return apiEndpoint('/workflow-manager/workflows'); },
    get execute() { return apiEndpoint('/workflow-manager/execute'); },
    get variables() { return apiEndpoint('/workflow-manager/execute/variables'); },
    get functions() { return apiEndpoint('/workflow-manager/execute/functions'); },
  },
  terminal: {
    get base() { return apiEndpoint('/terminal'); },
  },
  fileExplorer: {
    get base() { return apiEndpoint('/file-explorer'); },
    get list() { return apiEndpoint('/file-explorer/list'); },
    get content() { return apiEndpoint('/file-explorer/content'); },
  },
};

const apiConfig = {
  apiEndpoint,
  websocketUrls,
  endpoints,
};

export default apiConfig;
