"use client"

import React, { useMemo, useLayoutEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer, useUpdateNodeInternals, useReactFlow } from 'reactflow';
import { cn } from "@/lib/utils" // Import cn from shadcn utils if available, or define it
import { workflowManagerAPI } from '@/services/WorkflowManagerAPI';
import { toast } from 'sonner';
import TerminalOutput from '@/components/Sidebar/Nodebar/CustomNode/TerminalOutput';
import { RichOutputViewer } from './RichOutputViewer';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Focus, Trash2, Copy, Save, Eye, Code, Lock, Unlock } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { createCustomNode } from '@/lib/services/custom-node-service';

// Define NodeIO interface
export interface NodeIO {
  id?: string;
  name: string;
  type: string;
  description?: string;
}

// Define log entry interface
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

// Define execution status type
export type NodeExecutionStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

// Define unified output type
export interface UnifiedOutput {
  type: 'text' | 'rich' | 'error';
  content: unknown;
  order: number;
  var_name?: string;
  traceback?: string;
}

// Define the shape of the node data
export interface NodeData extends Record<string, unknown> {
  title: string;
  description: string;
  inputs: NodeIO[];
  outputs: NodeIO[];
  language: string;
  function_name: string;
  source_code: string;
  node_id?: string;
  is_public?: boolean;
  tags?: string[];
  instance_id?: string;
  onNodeDelete?: (nodeId: string) => void;
  // Execution information
  status?: string;
  execution_count?: number;
  execution_timing?: {
    start_time?: string;
    end_time?: string;
    duration?: number;
    queued_time?: string;
  };
  // Add logs
  logs?: LogEntry[];
  // Execution status
  executionStatus?: NodeExecutionStatus;
  // File path for execution
  filePath?: string;
  // Node dimensions
  width?: number;
  height?: number;
  // Unified outputs
  unified_outputs?: UnifiedOutput[];
  // Output HTML
  output_html?: Record<string, unknown>;
  // Last execution data
  lastExecution?: {
    logs?: LogEntry[];
    output_html?: Record<string, unknown>;
    status?: string;
    error_message?: string;
    error_traceback?: string;
    duration_seconds?: number;
  };
  // Error information
  error_message?: string;
  error_traceback?: string;
  duration_seconds?: number;
}

// Format duration in milliseconds to a compact string (e.g., "2.5s" or "1.2m")
const formatDuration = (ms: number): string => {
  const seconds = ms / 1000;
  
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    return `${(seconds / 60).toFixed(1)}m`;
  } else {
    return `${(seconds / 3600).toFixed(1)}h`;
  }
};

interface CustomNodeProps extends NodeProps {
  onExecutionComplete?: () => void;
}

export const CustomNode = ({ id, data, selected, onExecutionComplete }: CustomNodeProps) => {
  // Ensure data is properly typed
  const nodeData: NodeData = data as NodeData;
  const updateNodeInternals = useUpdateNodeInternals();
  const { fitView, getNode, setNodes } = useReactFlow();
  const { token } = useAuthStore();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ 
    width: nodeData.width || 280, 
    height: nodeData.height || 100 
  });
  const [outputsOpen, setOutputsOpen] = useState(true); // Outputs open by default
  const [isExecuting, setIsExecuting] = useState(false);
  const [unifiedOutputs, setUnifiedOutputs] = useState<UnifiedOutput[]>([]);
  const [isLocked, setIsLocked] = useState(false); // Lock state: false = draggable, true = locked (no drag)
  
  // Extract unified outputs from node data (combines logs + rich outputs + errors in execution order)
  useLayoutEffect(() => {
    console.log(`[CustomNode ${id}] Loading unified outputs from nodeData:`, nodeData);
    
    let outputsToLoad: UnifiedOutput[] = [];
    
    // Primary location: node.unified_outputs (new format)
    if (nodeData.unified_outputs && Array.isArray(nodeData.unified_outputs)) {
      console.log(`[CustomNode ${id}] Found unified_outputs in nodeData:`, nodeData.unified_outputs);
      outputsToLoad = nodeData.unified_outputs;
    }
    // Fallback: combine logs and output_html manually for backward compatibility
    else {
      console.log(`[CustomNode ${id}] No unified_outputs, falling back to separate logs + output_html`);
      const logs = nodeData.logs || nodeData.lastExecution?.logs || [];
      const richOutputs = nodeData.output_html || nodeData.lastExecution?.output_html || {};
      
      // Add logs as text outputs
      logs.forEach((log: { message: string }, index: number) => {
        outputsToLoad.push({
          type: 'text',
          content: log.message,
          order: index
        });
      });
      
      // Add rich outputs
      Object.entries(richOutputs).forEach(([varName, output], index) => {
        outputsToLoad.push({
          type: 'rich',
          var_name: varName,
          content: output,
          order: logs.length + index
        });
      });
    }
    
    // Add error message to outputs if node failed
    if ((nodeData.status === 'failed' || nodeData.lastExecution?.status === 'error') && 
        (nodeData.error_message || nodeData.lastExecution?.error_message)) {
      const errorMessage = nodeData.error_message || nodeData.lastExecution?.error_message;
      const errorTraceback = nodeData.error_traceback || nodeData.lastExecution?.error_traceback;
      
      outputsToLoad.push({
        type: 'error',
        content: errorMessage,
        traceback: errorTraceback,
        order: outputsToLoad.length
      });
    }
    
    if (outputsToLoad.length > 0) {
      console.log(`[CustomNode ${id}] Setting unified outputs:`, outputsToLoad);
      setUnifiedOutputs(outputsToLoad);
    } else {
      console.log(`[CustomNode ${id}] No outputs to load`);
      setUnifiedOutputs([]);
    }
  }, [nodeData, id]);

  // Calculate node dimensions for proper handle spacing
  useLayoutEffect(() => {
    if (nodeRef.current) {
      const { offsetWidth, offsetHeight } = nodeRef.current;
      setDimensions({
        width: offsetWidth,
        height: offsetHeight
      });
      updateNodeInternals(id);
    }
  }, [id, nodeData.inputs?.length, nodeData.outputs?.length, updateNodeInternals]);

  // Handle single node execution
  const handleRunNode = async () => {
    console.log('🚀 CustomNode: Starting node execution');
    console.log('📋 CustomNode: Node data:', JSON.stringify(nodeData, null, 2));
    console.log('🔍 CustomNode: File path check:', nodeData.filePath);
    
    if (!nodeData.filePath) {
      console.error('❌ CustomNode: No file path found in node data');
      console.log('📊 CustomNode: Available node data keys:', Object.keys(nodeData));
      toast.error('No file path specified for node execution');
      return;
    }

    try {
      setIsExecuting(true);
      console.log(`🎯 CustomNode: Executing node "${nodeData.title}" (ID: ${id})`);
      toast.info(`Executing node: ${nodeData.title}`);

      const requestPayload = {
        file_path: nodeData.filePath,
        node_id: id
      };
      
      console.log('📤 CustomNode: Sending request to backend:', JSON.stringify(requestPayload, null, 2));

      const result = await workflowManagerAPI.executeSingleNode(requestPayload);

      console.log('📥 CustomNode: Received response from backend:', JSON.stringify(result, null, 2));

      // Logs are now part of unified_outputs, no need to set them separately
      console.log(`📝 CustomNode: Execution complete, outputs will be loaded from file`);
      
      if (result.status === 'completed') {
        console.log('✅ CustomNode: Node execution completed successfully');
        toast.success(`Node "${nodeData.title}" completed successfully`);
        
        // Trigger file refetch to get updated execution results
        console.log('🔄 CustomNode: Triggering file refetch to get updated execution data');
        if (onExecutionComplete) {
          onExecutionComplete();
        }
      } else if (result.status === 'failed') {
        console.error('❌ CustomNode: Node execution failed:', result.error_message);
        toast.error(`Node "${nodeData.title}" failed: ${result.error_message}`);
      } else {
        console.warn('⚠️ CustomNode: Unexpected execution status:', result.status);
      }

    } catch (error) {
      console.error('💥 CustomNode: Error executing node:', error);
      console.error('🔍 CustomNode: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        nodeId: id,
        filePath: nodeData.filePath
      });
      toast.error(`Failed to execute node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
      console.log('🏁 CustomNode: Node execution finished');
    }
  };
  // Context menu handlers
  const handleFocusNode = () => {
    // Focus on this node by centering it in the viewport
    const node = getNode(id);
    if (node) {
      fitView({
        nodes: [node],
        duration: 500,
        padding: 0.5,
        minZoom: 1,
        maxZoom: 1.5,
      });
      toast.success(`Focused on "${nodeData.title}"`);
    }
  };

  const handleDeleteNode = () => {
    if (typeof nodeData.onNodeDelete === 'function') {
      nodeData.onNodeDelete(id);
      toast.success(`Deleted node "${nodeData.title}"`);
    }
  };

  const handleDuplicateNode = () => {
    // Generate a unique ID for the duplicate
    const duplicateId = `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // Get the current node to duplicate
    const currentNode = getNode(id);
    if (!currentNode) {
      toast.error('Could not find node to duplicate');
      return;
    }
    
    // Create a duplicate node with offset position
    const duplicateNode = {
      ...currentNode,
      id: duplicateId,
      position: {
        x: currentNode.position.x + 50,
        y: currentNode.position.y + 50,
      },
      data: {
        ...currentNode.data,
        title: `${nodeData.title} (Copy)`,
      },
      selected: false,
    };
    
    // Add the duplicate to the canvas
    setNodes((nds) => [...nds, duplicateNode]);
    
    toast.success(`Duplicated "${nodeData.title}"`);
  };

  const handleToggleLock = () => {
    setIsLocked(!isLocked);
    toast.info(isLocked ? '🔓 Unlocked - Node is draggable' : '🔒 Locked - Text selection enabled');
  };

  const handleSaveToNodebar = async () => {
    try {
      if (!token) {
        toast.error('Please log in to save nodes');
        return;
      }

      // Prepare node data for saving
      const nodeToSave = {
        title: nodeData.title,
        description: nodeData.description || '',
        function_name: nodeData.function_name,
        language: nodeData.language || 'python',
        source: nodeData.source_code || '',
        inputs: nodeData.inputs || [],
        outputs: nodeData.outputs || [],
      };

      console.log('Saving node to nodebar:', nodeToSave);
      
      // Call API to create custom node
      const savedNode = await createCustomNode(token, nodeToSave as Partial<import('@/lib/services/custom-node-service').CustomNodeData>);
      
      console.log('Node saved successfully:', savedNode);
      toast.success(`Saved "${nodeData.title}" to Nodebar!`);
    } catch (error) {
      console.error('Error saving node to nodebar:', error);
      toast.error(`Failed to save node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleViewCode = () => {
    // TODO: Implement view code logic
    toast.info(`Viewing code for "${nodeData.title}"`);
  };

  // Calculate handle position based on index and total count
  const calculateHandlePosition = (index: number, total: number) => {
    // Fixed header height + padding
    const headerHeight = 40;
    
    // Start positioning handles after the header
    const startY = headerHeight + 10; // Header height + some padding
    
    // Fixed spacing between handles
    const spacing = 30;
    return startY + (spacing * index);
  };
  
  // Determine the minimum height based on component content dynamically
  const minHeight = useMemo(() => {
    // Component parts with their respective heights
    const headerHeight = 40;  // Header section
    const contentPadding = 24; // Padding around content
    const descriptionHeight = nodeData.description ? Math.min(60, nodeData.description.length / 2) : 0; // Dynamic based on description length
    const functionNameHeight = 30; // Function name section
    const runButtonHeight = 45; // Run button section
    const outputsButtonHeight = unifiedOutputs.length ? 30 : 0; // Outputs accordion button if outputs exist
    
    // Calculate height for outputs content when expanded
    // All languages now use terminal view with min-height of 200px
    let outputsContentHeight = 0;
    if (outputsOpen && unifiedOutputs.length > 0) {
      // Terminal view has min-height of 200px
      outputsContentHeight = 220; // 200px + padding
    }
    
    // Calculate base height from component parts
    const baseHeight = headerHeight + contentPadding + descriptionHeight + 
                      functionNameHeight + runButtonHeight + outputsButtonHeight + 
                      outputsContentHeight;
    
    // Calculate height for input and output ports
    const inputsHeight = (nodeData.inputs?.length || 0) * 32; // 32px per input port
    const outputsHeight = (nodeData.outputs?.length || 0) * 32; // 32px per output port
    
    // Add divider height if both inputs and outputs exist
    const dividerHeight = (nodeData.inputs?.length && nodeData.outputs?.length) ? 1 : 0;
    
    // Minimum reasonable height for the node
    const minimumHeight = 180;
    
    return Math.max(minimumHeight, baseHeight + inputsHeight + outputsHeight + dividerHeight);
  }, [nodeData.inputs?.length, nodeData.outputs?.length, nodeData.description, unifiedOutputs.length, outputsOpen]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={nodeRef}
          className={cn(
            "shadow-md rounded-md overflow-visible",
            selected && "ring-2 ring-primary",
            "bg-background",
            isLocked && "noDrag"  // Add noDrag when locked
          )}
          style={{ 
            width: dimensions.width, 
            minHeight: minHeight,
            position: 'relative'
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsLocked(!isLocked);
            toast.info(isLocked ? '🔓 Unlocked - Node is draggable' : '🔒 Locked - Text selection enabled');
          }}
          title={isLocked ? "Double-click to unlock (enable dragging)" : "Double-click to lock (enable text selection)"}
        >
      {/* Node resizer */}
      <NodeResizer
        minWidth={209}
        minHeight={240}
        isVisible={selected}
        onResize={(event, params) => {
          // Update local dimensions state
          setDimensions({
            width: params.width,
            height: params.height
          });
          // Update node data with new dimensions
          if (nodeData) {
            nodeData.width = params.width;
            nodeData.height = params.height;
          }
          // Update handle positions
          updateNodeInternals(id);
        }}
        handleStyle={{
          width: 12,
          height: 12,
          backgroundColor: "#f1f1f1",
          borderRadius: "50%",
          cursor: "nw-resize",
          zIndex: 1000,
          opacity: selected ? 1 : 0,
          transition: "all 0.2s ease-in-out",
        }}
        lineStyle={{
          borderColor: "#f1f1f1",
          opacity: 0.8,
        }}
      />

      {/* Node header with title */}
      <div className="bg-muted border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="font-medium text-sm text-foreground">{nodeData.title || 'Untitled Node'}</div>
        {/* <div className="font-medium text-sm text-foreground">{nodeData.function_name || 'Untitled Node'}</div> */}
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-0.5 bg-background rounded-full text-muted-foreground">
            {nodeData.language || 'python'}
          </div>
          <button 
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              if (typeof nodeData.onNodeDelete === 'function') {
                nodeData.onNodeDelete(id);
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18"></path>
              <path d="M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Node content */}
      <div className="p-3 select-text" onMouseDown={(e) => {
        // Allow text selection by stopping propagation when selecting text
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          e.stopPropagation();
        }
      }}>
        {/* Description */}
        {nodeData.description && (
          <div 
            className="text-xs text-muted-foreground mb-3 line-clamp-2 select-text" 
            onMouseDown={(e) => e.stopPropagation()}
          >
            {nodeData.description}
          </div>
        )}
        
        {/* Floating status badges */}
        <div className="absolute -top-7 right-1 flex items-center gap-1 z-10">
          {/* Lock indicator badge */}
          {isLocked && (
            <div className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm border border-blue-600">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Locked
            </div>
          )}
          
          {/* Execution order badge */}
          {nodeData.execution_order && (
            <div className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium flex items-center gap-1 shadow-sm border border-blue-200">
              <span className="text-xs">#</span>
              {nodeData.execution_order}
            </div>
          )}
          
          {/* Status badge */}
          {(nodeData.status || nodeData.lastExecution?.status || isExecuting) && (
            <div className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm border",
              {
                'bg-green-100 text-green-800 border-green-200': (nodeData.status === 'completed' || nodeData.lastExecution?.status === 'success'),
                'bg-red-100 text-red-800 border-red-200': (nodeData.status === 'failed' || nodeData.lastExecution?.status === 'error'),
                'bg-yellow-100 text-yellow-800 border-yellow-200': (nodeData.status === 'running' || isExecuting),
                'bg-gray-100 text-gray-800 border-gray-200': (nodeData.status === 'idle' || nodeData.status === 'queued' || (!nodeData.status && !nodeData.lastExecution?.status && !isExecuting)),
                'bg-blue-100 text-blue-800 border-blue-200': isExecuting
              }
            )}>
              {/* Status icon */}
              {(nodeData.status === 'completed' || nodeData.lastExecution?.status === 'success') && (
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
              {(nodeData.status === 'failed' || nodeData.lastExecution?.status === 'error') && (
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              )}
              {(nodeData.status === 'running' || isExecuting) && (
                <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                </svg>
              )}
              {(nodeData.status === 'idle' || nodeData.status === 'queued') && (
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
              {isExecuting ? 'Running' : (() => {
                const status = nodeData.status || nodeData.lastExecution?.status || 'idle';
                // Handle special case for 'error' status from lastExecution
                const displayStatus = status === 'error' ? 'failed' : status;
                return displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);
              })()}
            </div>
          )}
          
          {/* Duration badge */}
          {(nodeData.execution_timing?.duration !== undefined || nodeData.lastExecution?.duration_seconds) && (
            <div className="px-2 py-0.5 rounded-full bg-muted text-foreground text-xs font-medium flex items-center gap-1 shadow-sm border border-border">
              <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {nodeData.execution_timing?.duration !== undefined 
                ? formatDuration(nodeData.execution_timing.duration)
                : `${nodeData.lastExecution?.duration_seconds?.toFixed(1)}s`
              }
            </div>
          )}
        </div>
        
        {/* Node metadata */}
        <div className="flex justify-end text-xs text-muted-foreground mt-2 mb-2">
          <div 
            className="px-2 py-0.5 bg-muted rounded-sm border border-border select-text"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {nodeData.function_name || 'function'}
          </div>
        </div>
      </div>
      
      {/* Ports section */}
      <div className="border-t border-border">
        {/* Input ports */}
        {nodeData.inputs && nodeData.inputs.length > 0 && (
          <div className="py-1">
            {nodeData.inputs.map((input, idx) => (
              <div key={`port-${input.id || idx}`} className="relative h-8 flex items-center px-3">
                {/* Input handle */}
                <div 
                  className="noDrag" 
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)', zIndex: 100 }}
                >
                  <Handle
                    id={`input-${input.id || idx}`}
                    type="target"
                    position={Position.Left}
                    style={{ 
                      position: 'relative',
                      left: 0,
                      top: 0,
                      transform: 'none',
                      background: '#5D688A',
                      width: 10,
                      height: 10,
                      border: '2px solid hsl(var(--background))',
                      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
                      cursor: 'crosshair'
                    }}
                  />
                </div>
                {/* Input label */}
                <div 
                  className="text-xs font-medium text-foreground ml-2 select-text"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {input.name}
                  <span className="text-muted-foreground ml-1">{input.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Output ports */}
        {nodeData.outputs && nodeData.outputs.length > 0 && (
          <div className="py-1 border-t border-border ">
            {nodeData.outputs.map((output, idx) => (
              <div key={`port-${output.id || idx}`} className="relative h-8 flex items-center justify-end px-3">
                {/* Output label */}
                <div 
                  className="text-xs font-medium text-foreground mr-2 text-right select-text"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {output.name}
                  <span className="text-muted-foreground ml-1">{output.type}</span>
                </div>
                {/* Output handle */}
                <div 
                  className="noDrag" 
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', zIndex: 100 }}
                >
                  <Handle
                    id={`output-${output.id || idx}`}
                    type="source"
                    position={Position.Right}
                    style={{ 
                      position: 'relative',
                      left: 0,
                      top: 0,
                      transform: 'none',
                      background: '#5D688A',
                      width: 10,
                      height: 10,
                      border: '2px solid hsl(var(--background))',
                      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
                      cursor: 'crosshair'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Run button at bottom */}
      <div className="px-3 py-2 border-t border-border">
        <button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-1 px-3 rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleRunNode}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground mr-1"></div>
              Running...
            </>
          ) : (
            <>
              <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Run
            </>
          )}
        </button>
        
        {/* Unified Output section - Shows logs, rich outputs, and errors in execution order */}
        {unifiedOutputs && unifiedOutputs.length > 0 && (() => {
          // Filter outputs to count only what will be displayed
          const internalVars = ['plt', 'np', 'pd', 'idx', 'fig_name', 'rich_output', 'sys', 'os', 'math', 'random'];
          const displayCount = unifiedOutputs.filter(output => {
            if (output.type === 'text') return true;
            if (output.type === 'error') return true;
            if (output.type === 'rich') {
              if (output.var_name && internalVars.includes(output.var_name)) return false;
              if (output.content?.text && output.content.text.includes('module') && output.content.text.includes('from')) return false;
              return true;
            }
            return false;
          }).length;
          
          return (
            <div className="mt-2">
              <div 
                className="w-full text-xs font-semibold text-foreground py-1 px-0 flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                onClick={() => {
                  setOutputsOpen(!outputsOpen);
                  // Update node internals immediately and after animation
                  updateNodeInternals(id);
                  setTimeout(() => updateNodeInternals(id), 50);
                }}
              >
                <svg 
                  className={cn(
                    "h-3 w-3 transition-transform",
                    outputsOpen ? "rotate-90" : ""
                  )}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Output ({displayCount})
              </div>
            
            {outputsOpen && (
              <div className="mt-2 noDrag">
                {/* Use unified terminal view for all languages */}
                <TerminalOutput 
                  outputs={unifiedOutputs}
                  isRunning={isExecuting}
                />
              </div>
            )}
          </div>
        );
        })()}
      </div>
    </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleFocusNode}>
          <Focus className="mr-2 h-4 w-4" />
          <span>Focus Node</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleViewCode}>
          <Code className="mr-2 h-4 w-4" />
          <span>View Code</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleToggleLock}>
          {isLocked ? (
            <>
              <Unlock className="mr-2 h-4 w-4" />
              <span>Unlock Node</span>
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              <span>Lock Node</span>
            </>
          )}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDuplicateNode}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Duplicate</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSaveToNodebar}>
          <Save className="mr-2 h-4 w-4" />
          <span>Save to Nodebar</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDeleteNode} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};


// "use client"

// import React, { useMemo, useLayoutEffect, useRef, useState, useCallback, MouseEvent } from 'react';
// import { Handle, Position, NodeProps, NodeResizer, useUpdateNodeInternals } from 'reactflow';

// // Define NodeIO interface
// export interface NodeIO {
//   id?: string;
//   name: string;
//   type: string;
//   description?: string;
// }

// // Define log entry interface
// export interface LogEntry {
//   timestamp: string;
//   level: string;
//   message: string;
//   source: string;
// }

// // Define the shape of the node data
// export interface NodeData extends Record<string, any> {
//   title: string;
//   description: string;
//   inputs: NodeIO[];
//   outputs: NodeIO[];
//   language: string;
//   function_name: string;
//   source_code: string;
//   node_id?: string;
//   is_public?: boolean;
//   tags?: string[];
//   instance_id?: string;
//   onNodeDelete?: (nodeId: string) => void;
//   // Execution information
//   status?: string;
//   execution_count?: number;
//   execution_timing?: {
//     start_time?: string;
//     end_time?: string;
//     duration?: number;
//     queued_time?: string;
//   };
//   // Add logs
//   logs?: LogEntry[];
// }

// // Format duration in milliseconds to a compact string (e.g., "2.5s" or "1.2m")
// const formatDuration = (ms: number): string => {
//   const seconds = ms / 1000;
  
//   if (seconds < 60) {
//     return `${seconds.toFixed(1)}s`;
//   } else if (seconds < 3600) {
//     return `${(seconds / 60).toFixed(1)}m`;
//   } else {
//     return `${(seconds / 3600).toFixed(1)}h`;
//   }
// };

// export const CustomNode = ({ id, data, selected }: NodeProps) => {
//   // Ensure data is properly typed
//   const nodeData: NodeData = data as NodeData;
//   const updateNodeInternals = useUpdateNodeInternals();
//   const nodeRef = useRef<HTMLDivElement>(null);
//   const [dimensions, setDimensions] = useState({ 
//     width: 280, 
//     height: 100 
//   });
//   const [logsOpen, setLogsOpen] = useState(true);

//   // Calculate node dimensions for proper handle spacing
//   useLayoutEffect(() => {
//     if (nodeRef.current) {
//       const { offsetWidth, offsetHeight } = nodeRef.current;
//       setDimensions({
//         width: offsetWidth,
//         height: offsetHeight
//       });
//       updateNodeInternals(id);
//     }
//   }, [id, nodeData.inputs?.length, nodeData.outputs?.length, updateNodeInternals]);
  
//   // Calculate handle position based on index and total count
//   const calculateHandlePosition = (index: number, total: number) => {
//     // Fixed header height + padding
//     const headerHeight = 40;
    
//     // Start positioning handles after the header
//     const startY = headerHeight + 10; // Header height + some padding
    
//     // Fixed spacing between handles
//     const spacing = 30;
//     return startY + (spacing * index);
//   };
  
//   // Determine the minimum height based on component content dynamically
//   const minHeight = useMemo(() => {
//     // Component parts with their respective heights
//     const headerHeight = 40;  // Header section
//     const contentPadding = 24; // Padding around content
//     const descriptionHeight = nodeData.description ? Math.min(60, nodeData.description.length / 2) : 0; // Dynamic based on description length
//     const functionNameHeight = 30; // Function name section
//     const runButtonHeight = 45; // Run button section
//     const logsButtonHeight = nodeData.logs?.length ? 30 : 0; // Logs accordion button if logs exist
    
//     // Calculate height for logs content when expanded
//     const logsContentHeight = logsOpen && nodeData.logs?.length ? 
//       // Base height (accordion header) + content height (based on number of logs, max 200px)
//       30 + Math.min(200, nodeData.logs.length * 20) : 0;
    
//     // Calculate base height from component parts
//     const baseHeight = headerHeight + contentPadding + descriptionHeight + 
//                       functionNameHeight + runButtonHeight + logsButtonHeight + 
//                       logsContentHeight;
    
//     // Calculate height for input and output ports
//     const inputsHeight = (nodeData.inputs?.length || 0) * 32; // 32px per input port
//     const outputsHeight = (nodeData.outputs?.length || 0) * 32; // 32px per output port
    
//     // Add divider height if both inputs and outputs exist
//     const dividerHeight = (nodeData.inputs?.length && nodeData.outputs?.length) ? 1 : 0;
    
//     // Minimum reasonable height for the node
//     const minimumHeight = 180;
    
//     return Math.max(minimumHeight, baseHeight + inputsHeight + outputsHeight + dividerHeight);
//   }, [nodeData.inputs?.length, nodeData.outputs?.length, nodeData.description, nodeData.logs?.length, logsOpen]);

//   return (
//     <div
//       ref={nodeRef}
//       className={` shadow-md ${selected ? 'ring-2 ring-zinc-700' : ''} bg-white overflow-visible dark:bg-zinc-950 dark:border dark:border-zinc-800`}
//       style={{ 
//         width: dimensions.width, 
//         height: Math.max(dimensions.height, minHeight) + 20,
//         position: 'relative'
//       }}
//     >
//       {/* Node resizer */}
// {/* Node resizer */}
// {/* Node resizer */}
// <NodeResizer
//   minWidth={209}
//   minHeight={240}
//   isVisible={selected}
//   handleStyle={{
//     width: 12,
//     height: 12,
//     backgroundColor: "#000000",
//     // border: "1px solid #ffffff",
//     borderRadius: "50%",
//     // boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
//     cursor: "nw-resize",
//     zIndex: 1000,
//     opacity: selected ? 1 : 0,
//     transition: "all 0.2s ease-in-out",
//   }}
//   lineStyle={{
//     // borderWidth: 0.5,
//     borderColor: "#ffffff",
//     // borderStyle: "dotted",
//     opacity: 0.8,
//   }}
//   onResize={(_, params) => {
//     setDimensions({ width: params.width, height: params.height });
//     updateNodeInternals(id);
//   }}
// />



      
//       {/* Node header with title */}
//       <div className="bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 px-4 py-2 flex items-center justify-between">
//         <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{nodeData.title || 'Untitled Node'}</div>
//         <div className="flex items-center gap-2">
//           <div className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-zinc-700 rounded-full text-gray-700 dark:text-gray-300">
//             {nodeData.language || 'python'}
//           </div>
//           <button 
//             className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
//             onClick={(event) => {
//               event.stopPropagation();
//               // Use the onNodeDelete function to remove this node
//               if (typeof nodeData.onNodeDelete === 'function') {
//                 nodeData.onNodeDelete(id);
//               }
//             }}
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <path d="M18 6L6 18"></path>
//               <path d="M6 6l12 12"></path>
//             </svg>
//           </button>
//         </div>
//       </div>
      
//       {/* Node content */}
//       <div className="p-3 select-text">
//       {/* shadow-[0_-2px_4px_rgba(0,0,0,0.1)] */}
//         {/* Description */}
//         {nodeData.description && (
//           <div 
//             className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 select-text" 
//             onMouseDown={(e) => e.stopPropagation()}
//           >
//             {nodeData.description}
//           </div>
//         )}
        
//         {/* Floating status badge */}
//         {nodeData.status && (
//           <div className="absolute -top-7 right-1 flex items-center gap-1 z-10">
//             {/* Duration badge */}
//             {nodeData.execution_timing?.duration !== undefined && (
//               <div className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1 shadow-sm border border-zinc-200 dark:border-zinc-700">
//                 <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                   <circle cx="12" cy="12" r="10"></circle>
//                   <polyline points="12 6 12 12 16 14"></polyline>
//                 </svg>
//                 {formatDuration(nodeData.execution_timing.duration)}
//               </div>
//             )}
//             {/* Status indicator */}
//             <div className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm ${nodeData.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' : nodeData.status === 'running' ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
//               {nodeData.status === 'completed' ? (
//                 <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                   <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
//                   <polyline points="22 4 12 14.01 9 11.01"></polyline>
//                 </svg>
//               ) : nodeData.status === 'running' ? (
//                 <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                   <line x1="12" y1="2" x2="12" y2="6"></line>
//                   <line x1="12" y1="18" x2="12" y2="22"></line>
//                   <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
//                   <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
//                   <line x1="2" y1="12" x2="6" y2="12"></line>
//                   <line x1="18" y1="12" x2="22" y2="12"></line>
//                   <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
//                   <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
//                 </svg>
//               ) : (
//                 <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
//               )}
//               <span className="capitalize">{nodeData.status}</span>
//               {nodeData.execution_count !== undefined && (
//                 <span className="ml-1 opacity-75">#{nodeData.execution_count}</span>
//               )}
//             </div>
//           </div>
//         )}
        
//         {/* Node metadata */}
//         <div className="flex justify-end text-xs text-gray-500 dark:text-gray-400 mt-2 mb-2">
//           <div 
//             className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-sm border border-gray-200 dark:border-zinc-700 select-text"
//             onMouseDown={(e) => e.stopPropagation()}
//           >
//             {nodeData.function_name || 'function'}
//           </div>
//         </div>
//       </div>
      
//       {/* Ports section */}
//       <div className="border-t border-gray-200 dark:border-zinc-800">
//         {/* Input ports */}
//         {nodeData.inputs && nodeData.inputs.length > 0 && (
//           <div className="py-1">
//             {nodeData.inputs.map((input, idx) => (
//               <div key={`port-${input.id || idx}`} className="relative h-8 flex items-center px-3">
//                 {/* Input handle */}
//                 <Handle
//                   id={`input-${input.id || idx}`}
//                   type="target"
//                   position={Position.Left}
//                   style={{ 
//                     left: -5,
//                     top: '50%',
//                     transform: 'translateY(-50%)',
//                     background: '#000000', // Black color for inputs
//                     width: 10,
//                     height: 10,
//                     border: '2px solid white',
//                     boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
//                     zIndex: 10
//                   }}
//                 />
//                 {/* Input label */}
//                 <div 
//                   className="text-xs font-medium text-gray-700 dark:text-gray-300 ml-2 select-text"
//                   onMouseDown={(e) => e.stopPropagation()}
//                 >
//                   {input.name}
//                   <span className="text-gray-400 dark:text-gray-500 ml-1">{input.type}</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
        
//         {/* Output ports */}
//         {nodeData.outputs && nodeData.outputs.length > 0 && (
//           <div className="py-1 border-t border-gray-200 dark:border-zinc-800">
//             {nodeData.outputs.map((output, idx) => (
//               <div key={`port-${output.id || idx}`} className="relative h-8 flex items-center justify-end px-3">
//                 {/* Output label */}
//                 <div 
//                   className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-2 text-right select-text"
//                   onMouseDown={(e) => e.stopPropagation()}
//                 >
//                   {output.name}
//                   <span className="text-gray-400 dark:text-gray-500 ml-1">{output.type}</span>
//                 </div>
//                 {/* Output handle */}
//                 <Handle
//                   id={`output-${output.id || idx}`}
//                   type="source"
//                   position={Position.Right}
//                   style={{ 
//                     right: -5,
//                     top: '50%',
//                     transform: 'translateY(-50%)',
//                     background: '#000000', // Black color for outputs
//                     width: 10,
//                     height: 10,
//                     border: '2px solid white',
//                     boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
//                     zIndex: 10
//                   }}
//                 />
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
      
//       {/* Run button at bottom */}
//       <div className="px-3 py-2 border-t border-gray-200 dark:border-zinc-800">
//         <button 
//           className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white text-sm py-1 px-3 rounded flex items-center justify-center"
//           onClick={() => {
//             // Log the node ID prominently
//             console.log('==================================');
//             console.log(`NODE ID: ${id}`);
//             console.log('==================================');
            
//             // console.log(`Running node: ${nodeData.title || 'Untitled Node'}`);
            
//             // // Log node_id from data if available
//             // if (nodeData.node_id) {
//             //   console.log('Internal node_id:', nodeData.node_id);
//             // }
            
//             // // Log all node data
//             // console.log('Complete Node Data:', nodeData);
            
//             // // Log specific properties for easier access
//             // console.log('Title:', nodeData.title);
//             // console.log('Description:', nodeData.description);
//             // console.log('Function Name:', nodeData.function_name);
//             // console.log('Language:', nodeData.language);
//             // console.log('Source Code:', nodeData.source_code);
//             // console.log('Inputs:', nodeData.inputs);
//             // console.log('Outputs:', nodeData.outputs);
//             // console.log('Status:', nodeData.status);
//             // console.log('Execution Count:', nodeData.execution_count);
//             // console.log('Execution Timing:', nodeData.execution_timing);
//             // console.log('Logs:', nodeData.logs);
//           }}
//         >
//           <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//             <polygon points="5 3 19 12 5 21 5 3"></polygon>
//           </svg>
//           Run
//         </button>
        
//         {/* Logs section */}
//         {nodeData.logs && nodeData.logs.length > 0 && (
//           <div className="mt-2">
//             <div 
//               className="w-full text-xs font-medium text-gray-600 dark:text-gray-400 py-1 px-0 flex items-center gap-1 cursor-pointer"
//               onClick={() => {
//                 setLogsOpen(!logsOpen);
//                 // Give time for the animation to complete before resizing
//                 setTimeout(() => updateNodeInternals(id), 300);
//               }}
//             >
//               <svg 
//                 className={`h-3 w-3 transition-transform ${logsOpen ? 'rotate-90' : ''}`} 
//                 xmlns="http://www.w3.org/2000/svg" 
//                 viewBox="0 0 24 24" 
//                 fill="none" 
//                 stroke="currentColor" 
//                 strokeWidth="2" 
//                 strokeLinecap="round" 
//                 strokeLinejoin="round"
//               >
//                 <polyline points="9 18 15 12 9 6"></polyline>
//               </svg>
//               <span>Logs ({nodeData.logs.length})</span>
//             </div>
            
//             {logsOpen && (
//               <div 
//                 className="font-mono text-xs rounded-md overflow-hidden bg-gray-50 dark:bg-zinc-900 select-text" 
//                 style={{ maxHeight: '200px', overflowY: 'auto' }}
//                 onMouseDown={(e) => e.stopPropagation()}
//               >
//                 {nodeData.logs.map((log, index) => (
//                   <pre 
//                     key={index} 
//                     className="text-sm p-1 border-b border-gray-100 dark:border-zinc-800 select-text"
//                     onMouseDown={(e) => e.stopPropagation()}
//                   >
//                     {log.message}
//                   </pre>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

