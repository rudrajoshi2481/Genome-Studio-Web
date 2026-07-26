/**
 * Workflow Manager API Service
 * Handles communication with the new workflow manager backend
 */

import { host, port } from '@/config/server';
import { useAuthStore } from '@/lib/stores/auth-store';
import authService from '@/lib/services/auth-service';

export interface CondaEnv {
  name: string;
  path: string;
  python: string;
  available: boolean;
}

export interface WorkflowExecutionRequest {
  file_path: string;
  execution_mode?: 'sequential' | 'parallel' | 'dependency_based';
  stop_on_error?: boolean;
  timeout_seconds?: number;
  conda_env?: string;
}

export interface SingleNodeExecutionRequest {
  file_path: string;
  node_id: string;
  conda_env?: string;
}

export interface WorkflowExecutionResponse {
  execution_id: string;
  status: string;
  message: string;
}

export interface SingleNodeExecutionResponse {
  status: string;
  execution_id: string;
  node_id: string;
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
  output_html?: Record<string, any>;
  unified_outputs?: Array<{
    type: string;
    content: any;
    order: number;
    var_name?: string;
    traceback?: string;
  }>;
  error_message?: string;
  error_traceback?: string;
}

class WorkflowManagerAPI {
  private baseUrl: string;
  private wsUrl: string;
  selectedCondaEnv: string | null = null;

  constructor() {
    this.baseUrl = `http://${host}:${port}/api/v1/workflow-manager-new`;
    const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.wsUrl = `${wsProtocol}//${host}:${port}/api/v1/workflow-manager-new`;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    let token = useAuthStore.getState().token;
    if (!token) {
      token = authService.getToken();
    }
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
   * Execute single node (async — returns execution_id, stream via WebSocket)
   */
  async executeSingleNode(request: SingleNodeExecutionRequest): Promise<SingleNodeExecutionResponse> {
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
      const error = new Error(`Failed to get execution status: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    // Backend returns { status: "success", execution_status: {...} }
    return data.execution_status || data;
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
   * Get available conda environments
   */
  async getCondaEnvs(): Promise<{ envs: CondaEnv[] }> {
    const response = await fetch(`${this.baseUrl}/conda-envs`, {
      headers: await this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get conda envs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create WebSocket connection for real-time updates
   * Note: Use WorkflowWebSocketService for full real-time streaming support.
   * This method is kept for backward compatibility.
   */
  createWebSocketConnection(workflowId: string): WebSocket {
    const token = useAuthStore.getState().token;
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const wsUrl = `${this.wsUrl}/ws/${clientId}${token ? `?token=${token}` : ''}`;
    console.log('🔌 WorkflowManagerAPI: Creating WebSocket connection with auth token:', token ? 'Token included' : 'No token');
    return new WebSocket(wsUrl);
  }
}

export const workflowManagerAPI = new WorkflowManagerAPI();
