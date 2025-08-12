"use client"

import React, { useMemo, useLayoutEffect, useRef, useState, useCallback, MouseEvent } from 'react';
import { Handle, Position, NodeProps, NodeResizer, useUpdateNodeInternals } from 'reactflow';
import { NodeExecutionService } from './services/nodeExecutionService';

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

// Define the shape of the node data
export interface NodeData extends Record<string, any> {
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
  // Add execution logs (persisted from backend)
  execution_logs?: LogEntry[];
  last_executed?: string;
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

interface DynamicCustomNodeProps extends NodeProps {
  filePath?: string;
}

const DynamicCustomNode = ({ id, data, selected }: NodeProps) => {
  // Ensure data is properly typed
  const nodeData: NodeData = data as NodeData;
  
  // Get filePath from node data (passed from Canvas)
  const filePath = (data as any)?.filePath;
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ 
    width: 280, 
    height: 100 
  });
  const [logsOpen, setLogsOpen] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<Array<{
    timestamp: string;
    level: string;
    message: string;
    source: string;
  }>>(nodeData.execution_logs || []);

  // Sync execution logs when node data changes (when file is reloaded)
  React.useEffect(() => {
    if (nodeData.execution_logs) {
      setExecutionLogs(nodeData.execution_logs);
    }
  }, [nodeData.execution_logs]);

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
    const logsButtonHeight = nodeData.logs?.length ? 30 : 0; // Logs accordion button if logs exist
    
    // Calculate height for logs content when expanded
    const logsContentHeight = logsOpen && nodeData.logs?.length ? 
      // Base height (accordion header) + content height (based on number of logs, max 200px)
      30 + Math.min(200, nodeData.logs.length * 20) : 0;
    
    // Calculate base height from component parts
    const baseHeight = headerHeight + contentPadding + descriptionHeight + 
                      functionNameHeight + runButtonHeight + logsButtonHeight + 
                      logsContentHeight;
    
    // Calculate height for input and output ports
    const inputsHeight = (nodeData.inputs?.length || 0) * 32; // 32px per input port
    const outputsHeight = (nodeData.outputs?.length || 0) * 32; // 32px per output port
    
    // Add divider height if both inputs and outputs exist
    const dividerHeight = (nodeData.inputs?.length && nodeData.outputs?.length) ? 1 : 0;
    
    // Minimum reasonable height for the node
    const minimumHeight = 180;
    
    return Math.max(minimumHeight, baseHeight + inputsHeight + outputsHeight + dividerHeight);
  }, [nodeData.inputs?.length, nodeData.outputs?.length, nodeData.description, nodeData.logs?.length, logsOpen]);

  return (
    <div
      ref={nodeRef}
      className={` shadow-md ${selected ? 'ring-2 ring-zinc-700' : ''} bg-white overflow-visible dark:bg-zinc-950 dark:border dark:border-zinc-800`}
      style={{ 
        width: dimensions.width, 
        height: Math.max(dimensions.height, minHeight) + 20,
        position: 'relative'
      }}
    >
      {/* Node resizer */}
{/* Node resizer */}
{/* Node resizer */}
<NodeResizer
  minWidth={209}
  minHeight={240}
  isVisible={selected}
  handleStyle={{
    width: 12,
    height: 12,
    backgroundColor: '#000000',
    border: '2px solid #ffffff',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
    cursor: 'nw-resize',
    zIndex: 1000,
    opacity: selected ? 1 : 0,
    transition: 'all 0.2s ease-in-out'
  }}
  lineStyle={{
    borderWidth: 2,
    borderColor: '#000000',
    borderStyle: 'dotted',
    opacity: 0.8
  }}
  onResize={(_, params) => {
    setDimensions({ width: params.width, height: params.height });
    updateNodeInternals(id);
  }}
/>


      
      {/* Node header with title */}
      <div className="bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 px-4 py-2 flex items-center justify-between">
        <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{nodeData.title || 'Untitled Node'}</div>
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-zinc-700 rounded-full text-gray-700 dark:text-gray-300">
            {nodeData.language || 'python'}
          </div>
          <button 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              // Use the onNodeDelete function to remove this node
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
      <div className="p-3 select-text">
      {/* shadow-[0_-2px_4px_rgba(0,0,0,0.1)] */}
        {/* Description */}
        {nodeData.description && (
          <div 
            className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 select-text" 
            onMouseDown={(e) => e.stopPropagation()}
          >
            {nodeData.description}
          </div>
        )}
        
        {/* Floating status badges */}
        {(nodeData.executionStatus || nodeData.status || (nodeData as any).lastExecution?.status) && (
          <div className="absolute -top-7 right-1 flex items-center gap-1 z-10">
            {/* Duration badge */}
            {nodeData.execution_timing?.duration !== undefined && (
              <div className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {formatDuration(nodeData.execution_timing.duration)}
              </div>
            )}
            
            {/* Main execution status badge */}
            {(() => {
              // Check for local pending/running state first (takes priority)
              const localExecutionState = (nodeData as any).currentExecutionState;
              
              // Determine the current execution status from multiple possible sources
              const currentStatus = localExecutionState?.status ||
                                   nodeData.executionStatus || 
                                   nodeData.status || 
                                   (nodeData as any).lastExecution?.status ||
                                   (nodeData as any).execution_status;
              
              // Check if node is in detached mode
              const isDetached = (nodeData as any).detached || 
                               (nodeData as any).lastExecution?.detached ||
                               executionLogs.some(log => log.source === 'detached_start');
              
              // Determine status styling and icon
              let statusConfig = {
                bg: 'bg-gray-100 text-gray-800 border-gray-200',
                darkBg: 'dark:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-600',
                icon: null as any,
                animate: false,
                label: currentStatus || 'idle'
              };

              switch (currentStatus) {
                case 'success':
                case 'completed':
                  statusConfig = {
                    bg: 'bg-green-100 text-green-800 border-green-200',
                    darkBg: 'dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
                    animate: false,
                    label: 'done',
                    icon: (
                      <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    )
                  };
                  break;
                case 'running':
                  statusConfig = {
                    bg: 'bg-blue-100 text-blue-800 border-blue-200',
                    darkBg: 'dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
                    animate: true,
                    label: isDetached ? 'running (detached)' : 'running',
                    icon: (
                      <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                      </svg>
                    )
                  };
                  break;
                case 'error':
                case 'failed':
                  statusConfig = {
                    bg: 'bg-red-100 text-red-800 border-red-200',
                    darkBg: 'dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
                    animate: false,
                    label: 'error',
                    icon: (
                      <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                    )
                  };
                  break;
                case 'pending':
                case 'queued':
                  statusConfig = {
                    bg: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    darkBg: 'dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
                    animate: true,
                    label: 'pending',
                    icon: (
                      <svg className="h-3 w-3 animate-pulse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    )
                  };
                  break;
                default:
                  if (currentStatus) {
                    statusConfig.label = currentStatus;
                    statusConfig.icon = <div className="h-2 w-2 rounded-full bg-gray-500"></div>;
                  }
              }

              return currentStatus ? (
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm border ${statusConfig.bg} ${statusConfig.darkBg} ${statusConfig.animate ? 'animate-pulse' : ''}`}>
                  {statusConfig.icon}
                  <span className="capitalize">{statusConfig.label}</span>
                  {isDetached && (
                    <svg className="h-3 w-3 ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  )}
                  {nodeData.execution_count !== undefined && (
                    <span className="ml-1 opacity-75">#{nodeData.execution_count}</span>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        )}
        
        {/* Node metadata */}
        <div className="flex justify-end text-xs text-gray-500 dark:text-gray-400 mt-2 mb-2">
          <div 
            className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-sm border border-gray-200 dark:border-zinc-700 select-text"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {nodeData.function_name || 'function'}
          </div>
        </div>
      </div>
      
      {/* Ports section */}
      <div className="border-t border-gray-200 dark:border-zinc-800">
        {/* Input ports */}
        {nodeData.inputs && nodeData.inputs.length > 0 && (
          <div className="py-1">
            {nodeData.inputs.map((input, idx) => (
              <div key={`port-${input.id || idx}`} className="relative h-8 flex items-center px-3">
                {/* Input handle */}
                <Handle
                  id={`input-${input.id || idx}`}
                  type="target"
                  position={Position.Left}
                  style={{ 
                    left: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#000000', // Black color for inputs
                    width: 10,
                    height: 10,
                    border: '2px solid white',
                    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
                    zIndex: 10
                  }}
                />
                {/* Input label */}
                <div 
                  className="text-xs font-medium text-gray-700 dark:text-gray-300 ml-2 select-text"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {input.name}
                  <span className="text-gray-400 dark:text-gray-500 ml-1">{input.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Output ports */}
        {nodeData.outputs && nodeData.outputs.length > 0 && (
          <div className="py-1 border-t border-gray-200 dark:border-zinc-800">
            {nodeData.outputs.map((output, idx) => (
              <div key={`port-${output.id || idx}`} className="relative h-8 flex items-center justify-end px-3">
                {/* Output label */}
                <div 
                  className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-2 text-right select-text"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {output.name}
                  <span className="text-gray-400 dark:text-gray-500 ml-1">{output.type}</span>
                </div>
                {/* Output handle */}
                <Handle
                  id={`output-${output.id || idx}`}
                  type="source"
                  position={Position.Right}
                  style={{ 
                    right: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#000000', // Black color for outputs
                    width: 10,
                    height: 10,
                    border: '2px solid white',
                    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
                    zIndex: 10
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Run button at bottom */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-zinc-800">
        <button 
          className={`w-full text-white text-sm py-1 px-3 rounded flex items-center justify-center transition-colors ${
            isExecuting 
              ? 'bg-orange-600 hover:bg-orange-700 cursor-not-allowed' 
              : 'bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700'
          }`}
          disabled={isExecuting}
          onClick={async () => {
            // Check if we have a file path
            if (!filePath) {
              console.error('❌ No file path available for node execution');
              setExecutionError('No file path available');
              return;
            }

            // Log the execution attempt
            console.log('==================================');
            console.log(`🚀 EXECUTING NODE: ${id}`);
            console.log(`📁 File Path: ${filePath}`);
            console.log(`📝 Node Title: ${nodeData.title || 'Untitled Node'}`);
            console.log(`🔤 Language: ${nodeData.language}`);
            console.log('==================================');
            
            setIsExecuting(true);
            setExecutionError(null);
            
            try {
              const result = await NodeExecutionService.executeNode({
                file_path: filePath,
                block_id: id
              });
              
              if (result.status === 'success') {
                console.log('✅ Node execution completed successfully:', result);
                setExecutionError(null);
      
                // Update execution logs if available
                if (result.result?.logs) {
                  setExecutionLogs(result.result.logs);
                }
                
                // Note: Logs are now automatically saved to the .flow file by the backend
                // The logs will be loaded from the file when the workflow is reopened
                console.log('📝 Execution logs have been saved to the .flow file');
              } else {
                console.error('❌ Node execution failed:', result.error);
                setExecutionError(result.error || 'Execution failed');
                
                // Update execution logs even for errors
                if (result.result?.logs) {
                  setExecutionLogs(result.result.logs);
                }
              }
            } catch (error) {
              console.error('❌ Node execution error:', error);
              setExecutionError(error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setIsExecuting(false);
            }
          }}
        >
          {isExecuting ? (
            <svg className="h-3 w-3 mr-1 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          ) : (
            <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
          {isExecuting ? 'Running...' : 'Run'}
        </button>
        
        {/* Error display */}
        {executionError && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
            <div className="text-red-600 dark:text-red-400 font-medium">Execution Error:</div>
            <div className="text-red-700 dark:text-red-300 mt-1">{executionError}</div>
          </div>
        )}
        
        {/* Logs section */}
        {nodeData.logs && nodeData.logs.length > 0 && (
          <div className="mt-2">
            <div 
              className="w-full text-xs font-medium text-gray-600 dark:text-gray-400 py-1 px-0 flex items-center gap-1 cursor-pointer"
              onClick={() => {
                setLogsOpen(!logsOpen);
                // Give time for the animation to complete before resizing
                setTimeout(() => updateNodeInternals(id), 300);
              }}
            >
              <svg 
                className={`h-3 w-3 transition-transform ${logsOpen ? 'rotate-90' : ''}`} 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>Logs ({nodeData.logs.length})</span>
            </div>
            
            {logsOpen && (
              <div 
                className="font-mono text-xs rounded-md overflow-hidden bg-gray-50 dark:bg-zinc-900 select-text" 
                style={{ maxHeight: '200px', overflowY: 'auto' }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {nodeData.logs.map((log, index) => (
                  <pre 
                    key={index} 
                    className="text-sm p-1 border-b border-gray-100 dark:border-zinc-800 select-text"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {log.message}
                  </pre>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Execution Logs Section */}
        {executionLogs.length > 0 && (
          <div className="mt-2 border-t border-gray-200 dark:border-zinc-700 pt-2">
            <div 
              className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-zinc-400 cursor-pointer hover:text-gray-800 dark:hover:text-zinc-200 mb-1"
              onClick={() => setLogsOpen(!logsOpen)}
            >
              <svg 
                className={`w-3 h-3 transition-transform ${logsOpen ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span>Execution Logs ({executionLogs.length})</span>
            </div>
            
            {logsOpen && (
              <div 
                className="text-sm bg-gray-50 dark:bg-zinc-900 p-3 rounded-md overflow-hidden select-text border border-gray-200 dark:border-zinc-700" 
                style={{ maxHeight: '200px', overflowY: 'auto' }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {executionLogs
                  .filter(log => log.source === 'stdout' || log.source === 'stderr' || log.level === 'ERROR')
                  .map((log, index) => (
                    <div 
                      key={index} 
                      className="mb-2 last:mb-0"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 dark:text-zinc-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre 
                        className={`whitespace-pre-wrap text-sm leading-relaxed font-mono ${
                          log.level === 'ERROR' || log.source === 'stderr' 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-gray-800 dark:text-zinc-200'
                        }`}
                      >
                        {log.message}
                      </pre>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicCustomNode;
