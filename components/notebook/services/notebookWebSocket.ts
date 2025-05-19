import { DEFAULT_HOST, DEFAULT_PORT } from '@/lib/config';
import { Cell, CellOutput, NotebookState } from '../store/types';
import { useNotebookStore } from '../store/useNotebookStore';

type WebSocketEventType = 
  | 'connection_established'
  | 'execution_started'
  | 'stream'
  | 'execute_result'
  | 'error'
  | 'execution_complete';

interface WebSocketEvent {
  type: WebSocketEventType;
  cellId: string;
  connection_id?: string;
  timestamp?: number;
  output?: {
    output_type: 'stream' | 'execute_result' | 'error';
    name?: 'stdout' | 'stderr';
    text?: string[];
    execution_count?: number;
    data?: {
      preferred_mime_type?: string;
      data: {
        'text/plain'?: string[];
        'text/html'?: string[];
        'image/png'?: string[];
        'application/javascript'?: string[];
      };
    };
    ename?: string;
    evalue?: string;
    traceback?: string[];
  };
  error?: {
    output_type: 'error';
    ename: string;
    evalue: string;
    traceback: string[];
  };
  executionTime?: number;
  success?: boolean;
}

class NotebookWebSocket {
  private ws: WebSocket | null = null;
  private connectionId: string | null = null;

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${DEFAULT_HOST}:${DEFAULT_PORT}/api/notebook/execute`;
    
    console.log('[WebSocket] Connecting to:', url);
    this.ws = new WebSocket(url);
    
    this.ws.onclose = (event) => {
      console.error('[WebSocket] Connection closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      this.connectionId = null;
    };
    
    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };
    
    this.ws.onmessage = (event) => {
      const data: WebSocketEvent = JSON.parse(event.data);
      console.log('[WebSocket] Received message:', data);
      if (data.type === 'connection_established') {
        this.connectionId = data.connection_id || null;
      }
    };

    return new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject('WebSocket not initialized');
      
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
    });
  }

  async executeCode(cellId: string, source: string[], language: string): Promise<CellOutput[]> {
    console.log('[WebSocket] Executing code:', { cellId, source, language });
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('[WebSocket] Connection not open, attempting to connect...');
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      if (!this.ws) {
        console.error('[WebSocket] No WebSocket instance');
        return reject('WebSocket not connected');
      }
      if (!this.connectionId) {
        console.error('[WebSocket] No connection ID received');
        return reject('No connection ID received');
      }
      
      console.log('[WebSocket] Connection ready, connection ID:', this.connectionId);

      const outputs: CellOutput[] = [];
      const sentTime = Date.now();
      const set = useNotebookStore.setState;

      // Send execution request
      const request = {
        cellId,
        source,
        language,
        metadata: {
          timeout: 30,
          env: {}
        }
      };

      console.log('[WebSocket] Sending request:', request);
      try {
        this.ws.send(JSON.stringify(request));
        console.log('[WebSocket] Request sent successfully');
      } catch (error) {
        console.error('[WebSocket] Failed to send request:', error);
        reject(error);
        return;
      }

      // Update cell metadata with sent time
      set((state: NotebookState) => {
        const cell = state.cells.find((c: Cell) => c.id === cellId);
        if (!cell) return state;
        
        return {
          ...state,
          cells: state.cells.map((c: Cell) => c.id === cellId ? {
            ...c,
            metadata: {
              ...c.metadata,
              custom: {
                ...c.metadata?.custom,
                serverLogs: {
                  sentTime
                }
              }
            }
          } : c)
        };
      });

      const messageHandler = (event: MessageEvent) => {
        console.log('[WebSocket] Handling message:', event.data);
        const data: WebSocketEvent = JSON.parse(event.data);
        
        if (data.cellId !== cellId) {
          console.log('[WebSocket] Ignoring message for different cell:', data.cellId);
          return;
        }

        console.log('[WebSocket] Processing message for cell:', cellId);
        switch (data.type) {
          case 'execution_started':
            console.log('[WebSocket] Execution started for cell:', cellId);
            break;

          case 'stream':
            console.log('[WebSocket] Received stream output:', data.output);
            if (data.output) {
              outputs.push(data.output);
              console.log('[WebSocket] Updated outputs:', outputs);
              // Update cell outputs in real-time
              set((state: NotebookState) => {
                console.log('[WebSocket] Updating cell state with stream output');
                return {
                  ...state,
                  cells: state.cells.map((c: Cell) => c.id === cellId ? {
                    ...c,
                    outputs: [...outputs]
                  } : c)
                };
              });
            }
            break;
            
          case 'execute_result':
            console.log('[WebSocket] Received execution result:', data.output);
            if (data.output) {
              outputs.push(data.output);
              console.log('[WebSocket] Updated outputs:', outputs);
              set((state: NotebookState) => {
                console.log('[WebSocket] Updating cell state with execution result');
                return {
                  ...state,
                  cells: state.cells.map((c: Cell) => c.id === cellId ? {
                    ...c,
                    outputs: [...outputs]
                  } : c)
                };
              });
            }
            break;

          case 'error':
            console.log('[WebSocket] Received error:', data.error);
            if (data.error) {
              outputs.push(data.error);
              console.log('[WebSocket] Updated outputs with error:', outputs);
              set((state: NotebookState) => {
                console.log('[WebSocket] Updating cell state with error');
                return {
                  ...state,
                  cells: state.cells.map((c: Cell) => c.id === cellId ? {
                    ...c,
                    outputs: [...outputs],
                    metadata: {
                      ...c.metadata,
                      custom: {
                        ...c.metadata?.custom,
                        isError: true
                      }
                    }
                  } : c)
                };
              });
            }
            break;

          case 'execution_complete':
            console.log('[WebSocket] Execution complete:', {
              cellId,
              executionTime: data.executionTime,
              success: data.success
            });
            
            if (data.executionTime !== undefined) {
              set((state: NotebookState) => {
                console.log('[WebSocket] Updating cell state with execution time');
                return {
                  ...state,
                  cells: state.cells.map((c: Cell) => c.id === cellId ? {
                    ...c,
                    metadata: {
                      ...c.metadata,
                      custom: {
                        ...c.metadata?.custom,
                        executionTime: data.executionTime,
                        serverLogs: {
                          ...c.metadata?.custom?.serverLogs,
                          receivedTime: Date.now()
                        }
                      }
                    }
                  } : c)
                };
              });
            }
            
            console.log('[WebSocket] Resolving with outputs:', outputs);
            this.ws?.removeEventListener('message', messageHandler);
            resolve(outputs);
            break;

          case 'error':
            if (data.error) {
              outputs.push({
                output_type: 'error',
                ename: data.error.ename,
                evalue: data.error.evalue,
                traceback: data.error.traceback
              });
              this.ws?.removeEventListener('message', messageHandler);
              reject(new Error(data.error.evalue));
            }
            break;
          case 'execution_complete':
            this.ws?.removeEventListener('message', messageHandler);
            resolve(outputs);
            break;
        }
      };

      this.ws.addEventListener('message', messageHandler);

      this.ws.send(JSON.stringify({
        cellId,
        source,
        language,
        metadata: {
          timeout: 30
        }
      }));
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connectionId = null;
    }
  }
}

export const notebookWebSocket = new NotebookWebSocket();
