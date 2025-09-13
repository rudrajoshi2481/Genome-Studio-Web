import React, { useState } from 'react';
import { Download, Save, Play, Square, RotateCcw, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Node, Edge, useReactFlow } from 'reactflow';
import { serializeFlowData, convertToFlowNodes, convertToFlowEdges } from './utils/file-parser';
import { workflowManagerAPI, WorkflowExecutionStatus } from '@/services/WorkflowManagerAPI';

interface ToolbarProps {
  nodes: Node[];
  edges: Edge[];
  onSave?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onRefresh?: () => void;
  filePath?: string;
  fileName?: string;
  onExecutionStatusChange?: (status: WorkflowExecutionStatus | null) => void;
}

function Toolbar({
  nodes,
  edges,
  onSave,
  onRun,
  onStop,
  onReset,
  onRefresh = () => {},
  filePath,
  fileName = 'workflow',
  onExecutionStatusChange
}: ToolbarProps) {
  const reactFlowInstance = useReactFlow();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<WorkflowExecutionStatus | null>(null);

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

      toast.success(`Downloaded ${fileName}.flow`);
    } catch (error) {
      console.error('Error downloading flow:', error);
      toast.error('Failed to download flow file');
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      toast.info('Save functionality not implemented');
    }
  };

  const handleRun = async () => {
    if (!filePath) {
      toast.error('No file path specified for execution');
      return;
    }

    try {
      setIsExecuting(true);
      toast.info('Starting workflow execution...');

      const validation = await workflowManagerAPI.validateWorkflow(filePath);
      if (!validation.is_valid) {
        toast.error(`Workflow validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      const requestPayload = {
        file_path: filePath,
        execution_mode: 'dependency_based' as const,
        stop_on_error: true,
        timeout_seconds: 300
      };

      const result = await workflowManagerAPI.executeWorkflow(requestPayload);
      setExecutionId(result.execution_id);
      toast.success('Workflow execution started!');

      pollExecutionStatus(result.execution_id);

      if (onRun) {
        onRun();
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      toast.error(`Failed to start workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsExecuting(false);
    }
  };

  const handleStop = async () => {
    if (!executionId) {
      toast.error('No active execution to stop');
      return;
    }

    try {
      await workflowManagerAPI.stopExecution(executionId);
      toast.success('Workflow execution stopped');
      setIsExecuting(false);
      setExecutionId(null);
      setExecutionStatus(null);

      if (onExecutionStatusChange) {
        onExecutionStatusChange(null);
      }

      if (onStop) {
        onStop();
      }
    } catch (error) {
      console.error('Error stopping workflow:', error);
      toast.error(`Failed to stop workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const pollExecutionStatus = async (execId: string) => {
    try {
      const status = await workflowManagerAPI.getExecutionStatus(execId);
      setExecutionStatus(status);

      if (onExecutionStatusChange) {
        onExecutionStatusChange(status);
      }

      if (status.status === 'running') {
        setTimeout(() => pollExecutionStatus(execId), 1000);
      } else {
        setIsExecuting(false);
        if (status.status === 'completed') {
          toast.success(`Workflow completed successfully in ${status.duration_seconds?.toFixed(2)}s`);
        } else if (status.status === 'failed') {
          toast.error(`Workflow failed: ${status.error_message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error polling execution status:', error);
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      toast.info('Reset functionality not implemented');
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center px-4 py-2 bg-background border-b border-border shadow-sm">
        {/* File Operations (Left) */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
              >
                <Save className="h-5 w-5" />
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
              >
                <Download className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download Workflow</TooltipContent>
          </Tooltip>
        </div>

        {/* Execution Controls (Center) */}
        <div className="flex-1 flex justify-center items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={handleRun}
                disabled={isExecuting}
                className="gap-1"
              >
                <Play className="h-4 w-4" />
                {isExecuting ? 'Running' : 'Run'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Run Workflow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStop}
                disabled={!isExecuting}
                className="gap-1"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop Workflow</TooltipContent>
          </Tooltip>

          {executionStatus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {executionStatus.status === 'running' && (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  <span>
                    {executionStatus.completed_nodes.length}/{executionStatus.total_nodes} nodes
                  </span>
                </>
              )}
              {executionStatus.status === 'completed' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Completed</span>
                </>
              )}
              {executionStatus.status === 'failed' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>Failed</span>
                </>
              )}
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
              >
                <RotateCcw className="h-5 w-5" />
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
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh File</TooltipContent>
          </Tooltip>
        </div>

        {/* Flow Info (Right) */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{nodes.length} nodes</span>
          <Separator orientation="vertical" className="h-4" />
          <span>{edges.length} connections</span>
          {filePath && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span className="font-mono text-xs truncate max-w-xs">{filePath}</span>
            </>
          )}
        </div>
      </div>
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