/**
 * Workflow Manager API Service
 * Handles communication with the new workflow manager backend
 */

import { host, port } from '@/config/server';
import { useAuthStore } from '@/lib/stores/auth-store';

export interface WorkflowExecutionRequest {
  file_path: string;
  execution_mode?: 'sequential' | 'parallel' | 'dependency_based';
  stop_on_error?: boolean;
  timeout_seconds?: number;
}

export interface SingleNodeExecutionRequest {
  file_path: string;
  node_id: string;
}

export interface WorkflowExecutionResponse {
  execution_id: string;
  status: string;
  message: string;
}

export interface WorkflowValidationResult {
  is_valid: boolean;
  errors: string[];
  message?: string;
}

export interface WorkflowExecutionStatus {
  execution_id: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  current_node?: string;
  progress: number;
  completed_nodes: string[];
  failed_nodes: string[];
  total_nodes: number;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  error_message?: string;
}

export interface NodeExecutionResult {
  node_id: string;
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    source: string;
  }>;
  output_variables: Record<string, any>;
  error_message?: string;
}

class WorkflowManagerAPI {
  private baseUrl: string;
  private wsUrl: string;

  constructor() {
    this.baseUrl = `http://${host}:${port}/api/v1/workflow-manager-new`;
    this.wsUrl = `ws://${host}:${port}/api/v1/workflow-manager-new`;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = useAuthStore.getState().token;
    console.log('🔑 WorkflowManagerAPI: Auth token check:', token ? 'Token found' : 'No token found');
    console.log('🔑 WorkflowManagerAPI: Token length:', token ? token.length : 0);
    console.log('🔑 WorkflowManagerAPI: Auth state:', {
      isAuthenticated: useAuthStore.getState().isAuthenticated,
      hasUser: !!useAuthStore.getState().user,
      tokenExpiry: useAuthStore.getState().tokenExpiry
    });
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    console.log('🔑 WorkflowManagerAPI: Final headers:', headers);
    return headers;
  }

  /**
   * Execute entire workflow
   */
  async executeWorkflow(request: WorkflowExecutionRequest): Promise<WorkflowExecutionResponse> {
    console.log('🌐 WorkflowManagerAPI: executeWorkflow called');
    console.log('📤 WorkflowManagerAPI: Request payload:', JSON.stringify(request, null, 2));
    console.log('🔗 WorkflowManagerAPI: Request URL:', `${this.baseUrl}/execute`);
    
    const headers = await this.getAuthHeaders();
    console.log('📋 WorkflowManagerAPI: Request headers:', headers);

    const response = await fetch(`${this.baseUrl}/execute`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(request)
    });

    console.log('📥 WorkflowManagerAPI: Response status:', response.status);
    console.log('📥 WorkflowManagerAPI: Response statusText:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WorkflowManagerAPI: Error response body:', errorText);
      throw new Error(`Failed to execute workflow: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📥 WorkflowManagerAPI: Response data:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Execute single node
   */
  async executeSingleNode(request: SingleNodeExecutionRequest): Promise<NodeExecutionResult> {
    console.log('🌐 WorkflowManagerAPI: executeSingleNode called');
    console.log('📤 WorkflowManagerAPI: Request payload:', JSON.stringify(request, null, 2));
    console.log('🔗 WorkflowManagerAPI: Request URL:', `${this.baseUrl}/execute-single-node`);
    
    const headers = await this.getAuthHeaders();
    console.log('📋 WorkflowManagerAPI: Request headers:', headers);

    const response = await fetch(`${this.baseUrl}/execute-single-node`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(request)
    });

    console.log('📥 WorkflowManagerAPI: Response status:', response.status);
    console.log('📥 WorkflowManagerAPI: Response statusText:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WorkflowManagerAPI: Error response body:', errorText);
      throw new Error(`Failed to execute node: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📥 WorkflowManagerAPI: Response data:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecutionStatus> {
    const response = await fetch(`${this.baseUrl}/status/${executionId}`, {
      headers: await this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get execution status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validate workflow structure
   */
  async validateWorkflow(filePath: string): Promise<WorkflowValidationResult> {
    console.log('🌐 WorkflowManagerAPI: validateWorkflow called');
    console.log('📤 WorkflowManagerAPI: File path:', filePath);
    console.log('🔗 WorkflowManagerAPI: Request URL:', `${this.baseUrl}/validate`);
    
    const requestPayload = { file_path: filePath };
    console.log('📤 WorkflowManagerAPI: Request payload:', JSON.stringify(requestPayload, null, 2));
    
    const headers = await this.getAuthHeaders();
    console.log('📋 WorkflowManagerAPI: Request headers:', headers);

    const response = await fetch(`${this.baseUrl}/validate`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestPayload)
    });

    console.log('📥 WorkflowManagerAPI: Response status:', response.status);
    console.log('📥 WorkflowManagerAPI: Response statusText:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WorkflowManagerAPI: Error response body:', errorText);
      throw new Error(`Failed to validate workflow: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📥 WorkflowManagerAPI: Response data:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Stop workflow execution
   */
  async stopExecution(executionId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/stop/${executionId}`, {
      method: 'POST',
      headers: await this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to stop execution: ${response.statusText}`);
    }

    return response.json();
  }


  /**
   * Create WebSocket connection for real-time updates
   */
  createWebSocketConnection(workflowId: string): WebSocket {
    const token = useAuthStore.getState().token;
    const wsUrl = `${this.wsUrl}/ws/workflow-execution/${workflowId}${token ? `?token=${token}` : ''}`;
    console.log('🔌 WorkflowManagerAPI: Creating WebSocket connection with auth token:', token ? 'Token included' : 'No token');
    return new WebSocket(wsUrl);
  }
}

export const workflowManagerAPI = new WorkflowManagerAPI();
