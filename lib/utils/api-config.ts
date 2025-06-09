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
 */
export const endpoints = {
  auth: {
    login: apiEndpoint('/token'),
    refresh: apiEndpoint('/token/refresh'),
    user: apiEndpoint('/me'),
  },
  workflowManager: {
    base: apiEndpoint('/workflow-manager'),
    workflows: apiEndpoint('/workflow-manager/workflows'),
    execute: apiEndpoint('/workflow-manager/execute'),
    variables: apiEndpoint('/workflow-manager/execute/variables'),
    functions: apiEndpoint('/workflow-manager/execute/functions'),
  },
  terminal: {
    base: apiEndpoint('/terminal'),
  },
  fileExplorer: {
    base: apiEndpoint('/file-explorer'),
    list: apiEndpoint('/file-explorer/list'),
    content: apiEndpoint('/file-explorer/content'),
  },
};

export default {
  apiEndpoint,
  websocketUrls,
  endpoints,
};
