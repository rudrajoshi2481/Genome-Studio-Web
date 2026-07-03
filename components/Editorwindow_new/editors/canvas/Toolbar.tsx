import React, { useState, useRef, useEffect } from 'react';
import { Download, Save, Play, Square, RotateCcw, CheckCircle, AlertCircle, RefreshCw, Network, GitBranch, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Node, Edge, useReactFlow } from 'reactflow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { serializeFlowData, convertToFlowNodes, convertToFlowEdges } from './utils/file-parser';
import { workflowManagerAPI, WorkflowExecutionStatus } from '@/services/WorkflowManagerAPI';
import { workflowWebSocket, LogStreamMessage, OutputStreamMessage, StatusUpdateMessage, ProgressUpdateMessage } from '@/services/WorkflowWebSocket';
import { useTabStore } from '@/components/FileTabs/useTabStore';

export interface RealtimeLogUpdate {
  nodeId: string;
  log: { timestamp: string; level: string; message: string; source: string };
}

export interface RealtimeOutputUpdate {
  nodeId: string;
  output: { type: string; html?: string; text?: string; order?: number; mime_type?: string };
}

export interface RealtimeStatusUpdate {
  nodeId?: string;
  status: string;
  errorMessage?: string;
  errorTraceback?: string;
}

export interface RealtimeProgressUpdate {
  progressPercentage: number;
  nodesCompleted: number;
  totalNodes: number;
}

interface ToolbarProps {
  nodes: Node[];
  edges: Edge[];
  onSave?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onRefresh?: () => void;
  onFullRunStart?: () => void;
  filePath?: string;
  fileName?: string;
  tabId?: string;
  showMinimap?: boolean;
  onToggleMinimap?: (show: boolean) => void;
  onExecutionStatusChange?: (status: WorkflowExecutionStatus | null) => void;
  onRealtimeLog?: (update: RealtimeLogUpdate) => void;
  onRealtimeOutput?: (update: RealtimeOutputUpdate) => void;
  onRealtimeStatus?: (update: RealtimeStatusUpdate) => void;
  onRealtimeProgress?: (update: RealtimeProgressUpdate) => void;
}

function Toolbar({
  nodes,
  edges,
  onSave,
  onRun,
  onStop,
  onReset,
  onRefresh = () => {},
  onFullRunStart,
  filePath,
  fileName = 'workflow',
  tabId,
  showMinimap = true,
  onToggleMinimap,
  onExecutionStatusChange,
  onRealtimeLog,
  onRealtimeOutput,
  onRealtimeStatus,
  onRealtimeProgress
}: ToolbarProps) {
  const reactFlowInstance = useReactFlow();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const { updateTab } = useTabStore();
  const [executionStatus, setExecutionStatus] = useState<WorkflowExecutionStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localMinimap, setLocalMinimap] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('canvas_show_minimap');
      if (stored !== null) return stored === 'true';
    }
    return showMinimap;
  });

  useEffect(() => {
    onToggleMinimap?.(localMinimap);
    if (typeof window !== 'undefined') {
      localStorage.setItem('canvas_show_minimap', String(localMinimap));
    }
  }, [localMinimap]);

  const updateExecutingState = (executing: boolean) => {
    setIsExecuting(executing);
    if (tabId) {
      updateTab(tabId, { isExecuting: executing });
    }
  };
  const wsConnectedRef = useRef(false);
  const hasFinishedRef = useRef(false);
  const [progress, setProgress] = useState<{ percentage: number; completed: number; total: number } | null>(null);
  const onRealtimeLogRef = useRef(onRealtimeLog);
  const onRealtimeOutputRef = useRef(onRealtimeOutput);
  const onRealtimeStatusRef = useRef(onRealtimeStatus);
  const onRealtimeProgressRef = useRef(onRealtimeProgress);
  const onExecutionStatusChangeRef = useRef(onExecutionStatusChange);
  const onRefreshRef = useRef(onRefresh);
  const onFullRunStartRef = useRef(onFullRunStart);

  // Keep refs in sync with latest props without re-creating WebSocket handlers
  onRealtimeLogRef.current = onRealtimeLog;
  onRealtimeOutputRef.current = onRealtimeOutput;
  onRealtimeStatusRef.current = onRealtimeStatus;
  onRealtimeProgressRef.current = onRealtimeProgress;
  onExecutionStatusChangeRef.current = onExecutionStatusChange;
  onRefreshRef.current = onRefresh;
  onFullRunStartRef.current = onFullRunStart;

  const handleDownload = () => {
    try {
      const flowNodes = convertToFlowNodes(nodes);
      const flowEdges = convertToFlowEdges(edges);
      const viewport = reactFlowInstance.getViewport();
      const flowData = {
        id: `flow_${Date.now()}`,
        name: fileName,
        description: `Workflow created on ${new Date().toLocaleDateString()}`,
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        author: '',
        config: {
          auto_layout: false,
          execution_mode: 'sequential',
          default_language: 'python',
          environment: 'default',
          viewport: viewport
        },
        nodes: flowNodes,
        edges: flowEdges,
        global_variables: {},
        shared_imports: [],
        execution_history: []
      };

      const jsonContent = serializeFlowData(flowData);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.flow`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading flow:', error);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  const handleRun = async () => {
    if (!filePath) {
      return;
    }

    try {
      updateExecutingState(true);
      hasFinishedRef.current = false;
      setProgress(null);

      const validation = await workflowManagerAPI.validateWorkflow(filePath);
      if (!validation.is_valid) {
        // toast.error(`Workflow validation failed: ${validation.errors.join(', ')}`);
        updateExecutingState(false);
        return;
      }

      const requestPayload = {
        file_path: filePath,
        execution_mode: 'dependency_based' as const,
        stop_on_error: true,
        timeout_seconds: 86400
      };

      // Clear all node execution state in the UI for a fresh full run
      onFullRunStartRef.current?.();

      const result = await workflowManagerAPI.executeWorkflow(requestPayload);
      setExecutionId(result.execution_id);

      // Subscribe to execution updates via WebSocket (per-execution handlers)
      workflowWebSocket.subscribeToExecution(result.execution_id, {
        onConnect: () => {
          console.log('✅ Toolbar: WebSocket connected for execution', result.execution_id);
          wsConnectedRef.current = true;
        },
        onDisconnect: () => {
          console.log('Toolbar: WebSocket disconnected', result.execution_id);
          wsConnectedRef.current = false;
        },
        onLog: (msg: LogStreamMessage) => {
          onRealtimeLogRef.current?.({
            nodeId: msg.node_id,
            log: msg.log
          });
        },
        onOutput: (msg: OutputStreamMessage) => {
          onRealtimeOutputRef.current?.({
            nodeId: msg.node_id,
            output: msg.output
          });
        },
        onStatus: (msg: StatusUpdateMessage) => {
          onRealtimeStatusRef.current?.({
            nodeId: msg.node_id,
            status: msg.status,
            errorMessage: msg.error_message,
            errorTraceback: msg.error_traceback,
          });

          // Handle terminal statuses (deduplicate with polling)
          if (msg.status === 'completed' && !msg.node_id) {
            if (hasFinishedRef.current) return;
            hasFinishedRef.current = true;
            updateExecutingState(false);
            setProgress(null);
            // Unsubscribe after completion
            workflowWebSocket.unsubscribeFromExecution(result.execution_id);
          } else if (msg.status === 'failed' && !msg.node_id) {
            if (hasFinishedRef.current) return;
            hasFinishedRef.current = true;
            updateExecutingState(false);
            setProgress(null);
            const errMsg = msg.error_message ? `: ${msg.error_message}` : '';
            // toast.error(`Workflow execution failed${errMsg}`);
            // Unsubscribe after failure
            workflowWebSocket.unsubscribeFromExecution(result.execution_id);
          }
        },
        onProgress: (msg: ProgressUpdateMessage) => {
          setProgress({
            percentage: msg.progress_percentage,
            completed: msg.nodes_completed,
            total: msg.total_nodes,
          });
          onRealtimeProgressRef.current?.({
            progressPercentage: msg.progress_percentage,
            nodesCompleted: msg.nodes_completed,
            totalNodes: msg.total_nodes
          });
        },
        onError: (error: Event) => {
          console.error('Toolbar: WebSocket error:', error);
        }
      });

      // Wait for WebSocket to connect (up to 2s)
      const startTime = Date.now();
      while (!wsConnectedRef.current && Date.now() - startTime < 2000) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('Toolbar: WebSocket ready:', wsConnectedRef.current);

      // Fallback: also poll status (in case WebSocket fails)
      pollExecutionStatus(result.execution_id);

      if (onRun) {
        onRun();
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      // toast.error(`Failed to start workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      updateExecutingState(false);
    }
  };

  const handleStop = async () => {
    if (!executionId) {
      return;
    }

    try {
      await workflowManagerAPI.stopExecution(executionId);
      updateExecutingState(false);
      setExecutionId(null);
      setExecutionStatus(null);

      // Unsubscribe from this execution's WebSocket updates
      workflowWebSocket.unsubscribeFromExecution(executionId);
      wsConnectedRef.current = false;

      if (onExecutionStatusChangeRef.current) {
        onExecutionStatusChangeRef.current(null);
      }

      if (onStop) {
        onStop();
      }
    } catch (error) {
      console.error('Error stopping workflow:', error);
      // toast.error(`Failed to stop workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const pollExecutionStatus = async (execId: string) => {
    try {
      const status = await workflowManagerAPI.getExecutionStatus(execId);
      setExecutionStatus(status);

      if (onExecutionStatusChangeRef.current) {
        onExecutionStatusChangeRef.current(status);
      }
      
      // Continue polling while idle (not started yet) or running
      // Only stop on terminal statuses: completed, failed, cancelled
      if (status.status === 'running' || status.status === 'idle') {
        setTimeout(() => pollExecutionStatus(execId), 2000);
      } else {
        // Don't duplicate terminal handling if WebSocket already handled it
        if (hasFinishedRef.current) return;
        hasFinishedRef.current = true;
        updateExecutingState(false);
        setProgress(null);
        if (status.status === 'failed') {
          // toast.error(`Workflow execution failed: ${status.error_message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error polling execution status:', error);
      // If execution not found (404), stop polling — executor was cleaned up
      if ((error as any).status === 404) {
        if (!hasFinishedRef.current) {
          hasFinishedRef.current = true;
          updateExecutingState(false);
          setProgress(null);
        }
        return;
      }
      // Don't stop executing on poll error - WebSocket might still be working
      // Retry after a longer delay
      setTimeout(() => pollExecutionStatus(execId), 3000);
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  // Cleanup WebSocket subscription on unmount
  const executionIdRef = useRef(executionId);
  executionIdRef.current = executionId;
  useEffect(() => {
    return () => {
      if (executionIdRef.current) {
        workflowWebSocket.unsubscribeFromExecution(executionIdRef.current);
      }
    };
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 px-3 py-2 bg-background border-b border-border shadow-sm">
        {/* File Operations (Left) */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                className="h-8 w-8"
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save Workflow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-8 w-8"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download Workflow</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Execution Controls (Center) */}
        <div className="flex-1 flex justify-center items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={handleRun}
                disabled={isExecuting}
                className="gap-1.5 h-8 px-3"
              >
                {isExecuting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                {isExecuting ? 'Running...' : 'Run'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Run Workflow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
                disabled={!isExecuting}
                className="gap-1.5 h-8 px-3"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop Workflow</TooltipContent>
          </Tooltip>

          {executionStatus && (
            <>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <div className="flex items-center gap-1.5">
                {executionStatus.status === 'running' && (
                  <Badge variant="outline" className="gap-1.5 bg-blue-500/5 text-blue-700 border-blue-500/20">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {executionStatus.completed_nodes.length}/{executionStatus.total_nodes} nodes
                  </Badge>
                )}
                {executionStatus.status === 'completed' && (
                  <Badge variant="outline" className="gap-1.5 bg-green-500/5 text-green-700 border-green-500/20">
                    <CheckCircle className="h-3 w-3" />
                    Completed
                  </Badge>
                )}
                {executionStatus.status === 'failed' && (
                  <Badge variant="outline" className="gap-1.5 bg-destructive/5 text-destructive border-destructive/20">
                    <AlertCircle className="h-3 w-3" />
                    Failed
                  </Badge>
                )}
              </div>
            </>
          )}

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="h-8 w-8"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset Workflow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh File</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Flow Info (Right) */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1.5 cursor-default">
                <Network className="h-3 w-3" />
                {nodes.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{nodes.length} nodes</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1.5 cursor-default">
                <GitBranch className="h-3 w-3" />
                {edges.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{edges.length} connections</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Node Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure canvas settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[55vh] overflow-y-auto">
            {/* General Settings */}
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <h4 className="text-sm font-medium">General Settings</h4>
              <div className="flex items-center justify-between">
                <label htmlFor="show-minimap" className="text-xs cursor-pointer">
                  Show Minimap
                </label>
                <Switch
                  id="show-minimap"
                  checked={localMinimap}
                  onCheckedChange={setLocalMinimap}
                />
              </div>
            </div>

          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export default Toolbar;

// import React, { useState } from 'react';
// import { Download, Save, Play, Square, RotateCcw, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Separator } from '@/components/ui/separator';
// import { toast } from 'sonner';
// import { Node, Edge, useReactFlow } from 'reactflow';
// import { serializeFlowData, convertToFlowNodes, convertToFlowEdges } from './utils/file-parser';
// import { workflowManagerAPI, WorkflowExecutionStatus } from '@/services/WorkflowManagerAPI';

// interface ToolbarProps {
//   nodes: Node[];
//   edges: Edge[];
//   onSave?: () => void;
//   onRun?: () => void;
//   onStop?: () => void;
//   onReset?: () => void;
//   onRefresh?: () => void;
//   filePath?: string;
//   fileName?: string;
//   onExecutionStatusChange?: (status: WorkflowExecutionStatus | null) => void;
// }

// function Toolbar({ 
//   nodes, 
//   edges, 
//   onSave, 
//   onRun, 
//   onStop, 
//   onReset,
//   onRefresh,
//   filePath,
//   fileName = 'workflow',
//   onExecutionStatusChange
// }: ToolbarProps) {
//   const reactFlowInstance = useReactFlow();
//   const [isExecuting, setIsExecuting] = useState(false);
//   const [executionId, setExecutionId] = useState<string | null>(null);
//   const [executionStatus, setExecutionStatus] = useState<WorkflowExecutionStatus | null>(null);

//   const handleDownload = () => {
//     try {
//       // Convert ReactFlow nodes and edges to flow format
//       const flowNodes = convertToFlowNodes(nodes);
//       const flowEdges = convertToFlowEdges(edges);
      
//       // Get current viewport
//       const viewport = reactFlowInstance.getViewport();
      
//       // Create flow data structure
//       const flowData = {
//         id: `flow_${Date.now()}`,
//         name: fileName,
//         description: `Workflow created on ${new Date().toLocaleDateString()}`,
//         version: '1.0.0',
//         created: new Date().toISOString(),
//         modified: new Date().toISOString(),
//         author: '',
//         config: {
//           auto_layout: false,
//           execution_mode: 'sequential',
//           default_language: 'python',
//           environment: 'default',
//           viewport: viewport
//         },
//         nodes: flowNodes,
//         edges: flowEdges,
//         global_variables: {},
//         shared_imports: [],
//         execution_history: []
//       };

//       // Serialize to JSON
//       const jsonContent = serializeFlowData(flowData);
      
//       // Create and download file
//       const blob = new Blob([jsonContent], { type: 'application/json' });
//       const url = URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = `${fileName}.flow`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(url);
      
//       toast.success(`Downloaded ${fileName}.flow`);
//     } catch (error) {
//       console.error('Error downloading flow:', error);
//       toast.error('Failed to download flow file');
//     }
//   };

//   const handleSave = () => {
//     if (onSave) {
//       onSave();
//     } else {
//       toast.info('Save functionality not implemented');
//     }
//   };

//   const handleRun = async () => {
//     console.log('🚀 Toolbar: Starting workflow execution');
//     console.log('📋 Toolbar: File path:', filePath);
//     console.log('📊 Toolbar: Nodes count:', nodes.length);
//     console.log('🔗 Toolbar: Edges count:', edges.length);
    
//     if (!filePath) {
//       console.error('❌ Toolbar: No file path specified for execution');
//       toast.error('No file path specified for execution');
//       return;
//     }

//     try {
//       setIsExecuting(true);
//       console.log('🎯 Toolbar: Setting execution state to running');
//       toast.info('Starting workflow execution...');

//       // First validate the workflow
//       console.log('🔍 Toolbar: Validating workflow...');
//       const validation = await workflowManagerAPI.validateWorkflow(filePath);
//       console.log('📥 Toolbar: Validation result:', JSON.stringify(validation, null, 2));
      
//       if (!validation.is_valid) {
//         console.error('❌ Toolbar: Workflow validation failed:', validation.errors);
//         toast.error(`Workflow validation failed: ${validation.errors.join(', ')}`);
//         return;
//       }

//       // Execute the workflow
//       const requestPayload = {
//         file_path: filePath,
//         execution_mode: 'dependency_based' as const,
//         stop_on_error: true,
//         timeout_seconds: 300
//       };
      
//       console.log('📤 Toolbar: Sending workflow execution request:', JSON.stringify(requestPayload, null, 2));
//       const result = await workflowManagerAPI.executeWorkflow(requestPayload);
//       console.log('📥 Toolbar: Received workflow execution response:', JSON.stringify(result, null, 2));

//       setExecutionId(result.execution_id);
//       console.log('🆔 Toolbar: Set execution ID:', result.execution_id);
//       toast.success('Workflow execution started!');

//       // Start polling for status updates
//       console.log('🔄 Toolbar: Starting status polling');
//       pollExecutionStatus(result.execution_id);

//       if (onRun) {
//         onRun();
//       }
//     } catch (error) {
//       console.error('💥 Toolbar: Error starting workflow:', error);
//       console.error('🔍 Toolbar: Error details:', {
//         message: error instanceof Error ? error.message : 'Unknown error',
//         stack: error instanceof Error ? error.stack : undefined,
//         filePath: filePath,
//         nodesCount: nodes.length,
//         edgesCount: edges.length
//       });
//       toast.error(`Failed to start workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       setIsExecuting(false);
//     }
//   };

//   const handleStop = async () => {
//     if (!executionId) {
//       toast.error('No active execution to stop');
//       return;
//     }

//     try {
//       await workflowManagerAPI.stopExecution(executionId);
//       toast.success('Workflow execution stopped');
//       setIsExecuting(false);
//       setExecutionId(null);
//       setExecutionStatus(null);
      
//       if (onExecutionStatusChange) {
//         onExecutionStatusChange(null);
//       }

//       if (onStop) {
//         onStop();
//       }
//     } catch (error) {
//       console.error('Error stopping workflow:', error);
//       toast.error(`Failed to stop workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
//     }
//   };

//   const pollExecutionStatus = async (execId: string) => {
//     try {
//       const status = await workflowManagerAPI.getExecutionStatus(execId);
//       setExecutionStatus(status);
      
//       if (onExecutionStatusChange) {
//         onExecutionStatusChange(status);
//       }

//       // Continue polling if still running
//       if (status.status === 'running') {
//         setTimeout(() => pollExecutionStatus(execId), 1000);
//       } else {
//         // Execution finished
//         setIsExecuting(false);
//         if (status.status === 'completed') {
//           toast.success(`Workflow completed successfully in ${status.duration_seconds?.toFixed(2)}s`);
//         } else if (status.status === 'failed') {
//           toast.error(`Workflow failed: ${status.error_message || 'Unknown error'}`);
//         }
//       }
//     } catch (error) {
//       console.error('Error polling execution status:', error);
//       setIsExecuting(false);
//     }
//   };

//   const handleReset = () => {
//     if (onReset) {
//       onReset();
//     } else {
//       toast.info('Reset functionality not implemented');
//     }
//   };

//   return (
//     <div className="flex items-center gap-2 p-2 bg-background border-b border-border">
//       {/* File Operations */}
//       <div className="flex items-center gap-1">
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={handleSave}
//           className="flex items-center gap-1"
//         >
//           <Save className="h-4 w-4" />
//           Save
//         </Button>
        
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={handleDownload}
//           className="flex items-center gap-1"
//         >
//           <Download className="h-4 w-4" />
//           Download
//         </Button>
//       </div>

//       <Separator orientation="vertical" className="h-6" />

//       {/* Execution Controls */}
//       <div className="flex items-center gap-1">
//         <Button
//           variant="default"
//           size="sm"
//           onClick={handleRun}
//           disabled={isExecuting}
//           className="flex items-center gap-1"
//         >
//           <Play className="h-4 w-4" />
//           {isExecuting ? 'Running...' : 'Run'}
//         </Button>
        
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={handleStop}
//           disabled={!isExecuting}
//           className="flex items-center gap-1"
//         >
//           <Square className="h-4 w-4" />
//           Stop
//         </Button>
        
//         {executionStatus && (
//           <div className="flex items-center gap-1 ml-2 text-sm">
//             {executionStatus.status === 'running' && (
//               <>
//                 <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
//                 <span className="text-blue-600">
//                   {executionStatus.completed_nodes.length}/{executionStatus.total_nodes} nodes
//                 </span>
//               </>
//             )}
//             {executionStatus.status === 'completed' && (
//               <>
//                 <CheckCircle className="h-4 w-4 text-green-600" />
//                 <span className="text-green-600">Completed</span>
//               </>
//             )}
//             {executionStatus.status === 'failed' && (
//               <>
//                 <AlertCircle className="h-4 w-4 text-red-600" />
//                 <span className="text-red-600">Failed</span>
//               </>
//             )}
//           </div>
//         )}
        
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={handleReset}
//           className="flex items-center gap-1"
//         >
//           <RotateCcw className="h-4 w-4" />
//           Reset
//         </Button>
        
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={onRefresh}
//           className="flex items-center gap-1"
//           title="Refresh file content"
//         >
//           <RefreshCw className="h-4 w-4" />
//           Refresh
//         </Button>
//       </div>

//       <Separator orientation="vertical" className="h-6" />

//       {/* Flow Info */}
//       <div className="flex items-center gap-2 text-sm text-muted-foreground">
//         <span>{nodes.length} nodes</span>
//         <span>•</span>
//         <span>{edges.length} connections</span>
//         {filePath && (
//           <>
//             <span>•</span>
//             <span className="font-mono text-xs">{filePath}</span>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// export default Toolbar;