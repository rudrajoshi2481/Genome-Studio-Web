/**
 * Node Execution Service
 * Handles API calls for executing workflow nodes
 */

export interface NodeExecutionRequest {
  file_path: string;
  block_id: string;
}

export interface NodeExecutionResponse {
  status: 'success' | 'error';
  message: string;
  file_id: string;
  result?: any;
  variables?: Record<string, any>;
  error_log?: Record<string, any>;
  block_id?: string;
  error?: string;
}

export class NodeExecutionService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  private static readonly EXECUTE_ENDPOINT = '/api/v1/workflow-manager/execute/execute-workflow';

  /**
   * Execute a single node in the workflow
   */
  static async executeNode(request: NodeExecutionRequest): Promise<NodeExecutionResponse> {
    try {
      console.log('🚀 Executing node:', request.block_id);
      console.log('📁 File path:', request.file_path);
      
      const response = await fetch(`${this.BASE_URL}${this.EXECUTE_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Node execution successful:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Node execution failed:', error);
      
      return {
        status: 'error',
        message: 'Failed to execute node',
        file_id: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        block_id: request.block_id
      };
    }
  }

  /**
   * Execute the entire workflow
   */
  static async executeWorkflow(filePath: string): Promise<NodeExecutionResponse> {
    return this.executeNode({
      file_path: filePath,
      block_id: 'all'
    });
  }
}
