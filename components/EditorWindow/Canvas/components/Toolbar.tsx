import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, Save, Play } from "lucide-react"
import { Node, Edge } from 'reactflow'
import { convertToPipelineNodes, convertToPipelineEdges } from '../utils/fileParser'
import { updateTabFileContent } from '../hooks/canvashooks'
import { toast } from 'sonner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface ToolbarProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  fileContent?: string | null;
  fileName?: string;
  nodes: Node[];
  edges: Edge[];
  tabId?: string;
  hasUnsavedChanges?: boolean;
  filePath?: string;
  onNodeExecutionUpdate?: (executionResult: any) => void;
  selectedNodes?: Node[];
}

function Toolbar({ onRefresh, isRefreshing = false, fileContent, fileName, nodes, edges, tabId, hasUnsavedChanges = false, filePath, onNodeExecutionUpdate, selectedNodes = [] }: ToolbarProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [showExecutionLogs, setShowExecutionLogs] = useState(false);

  // Helper function to add execution logs
  const addExecutionLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setExecutionLogs(prev => [...prev, logEntry]);
  };

  // Clear execution logs
  const clearExecutionLogs = () => {
    setExecutionLogs([]);
  };

  // Update individual node states based on backend execution results
  const updateIndividualNodeStates = (executionResult: any) => {
    if (!executionResult) return;

    // Handle individual node execution results
    if (executionResult.logs) {
      executionResult.logs.forEach((log: any) => {
        // Look for node-specific execution logs to determine state
        if (log.source === 'node_execution_start' && log.node_id) {
          // Set specific node to running
          const node = nodes.find(n => n.id === log.node_id);
          if (node && node.data?.setNodeRunning) {
            node.data.setNodeRunning();
            addExecutionLog(`🔄 Node ${log.node_id} started execution`);
          }
        } else if (log.source === 'node_execution_complete' && log.node_id) {
          // Set specific node to completed
          const node = nodes.find(n => n.id === log.node_id);
          if (node && node.data?.setNodeCompleted) {
            node.data.setNodeCompleted();
            addExecutionLog(`✅ Node ${log.node_id} completed execution`);
          }
        } else if (log.source === 'node_execution_error' && log.node_id) {
          // Set specific node to error
          const node = nodes.find(n => n.id === log.node_id);
          if (node && node.data?.setNodeError) {
            node.data.setNodeError();
            addExecutionLog(`❌ Node ${log.node_id} failed execution`);
          }
        }
      });
    }

    // Handle execution variables to determine completed nodes
    if (executionResult.variables) {
      Object.keys(executionResult.variables).forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (node && node.data?.setNodeCompleted) {
          node.data.setNodeCompleted();
          addExecutionLog(`✅ Node ${nodeId} completed with output`);
        }
      });
    }

    // Handle error logs to mark failed nodes
    if (executionResult.error_log) {
      Object.keys(executionResult.error_log).forEach(errorKey => {
        // Extract node ID from error key (e.g., "execute_bash_node_123" -> "node_123")
        const nodeIdMatch = errorKey.match(/node_[a-zA-Z0-9_]+/);
        if (nodeIdMatch) {
          const nodeId = nodeIdMatch[0];
          const node = nodes.find(n => n.id === nodeId);
          if (node && node.data?.setNodeError) {
            node.data.setNodeError();
            addExecutionLog(`❌ Node ${nodeId} failed with error`);
          }
        }
      });
    }
  };

  // Handle saving the current flow to the server
  const handleSave = async () => {
    if (!tabId) {
      toast.error("Cannot save: No active tab");
      return;
    }

    try {
      setIsSaving(true);
      
      // Generate the most up-to-date flow content from current nodes and edges
      let flowData: any = {};
      
      if (fileContent) {
        try {
          const parsedContent = JSON.parse(fileContent);
          // Keep the metadata and configuration
          flowData = {
            id: parsedContent.id || `flow_${Date.now()}`,
            name: parsedContent.name || (fileName?.replace('.flow', '') || 'Flow'),
            description: parsedContent.description || 'Flow diagram',
            version: parsedContent.version || '1.0.0',
            created: parsedContent.created || new Date().toISOString(),
            modified: new Date().toISOString(),
            author: parsedContent.author || 'User',
            config: parsedContent.config || {},
            global_variables: parsedContent.global_variables || {},
            shared_imports: parsedContent.shared_imports || [],
            execution_history: parsedContent.execution_history || []
          };
        } catch (error) {
          console.error('Error parsing file content:', error);
          // Create a basic structure if parsing fails
          flowData = {
            id: `flow_${Date.now()}`,
            name: fileName?.replace('.flow', '') || 'Flow',
            description: 'Flow diagram',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            author: 'User',
            config: {},
            global_variables: {},
            shared_imports: [],
            execution_history: []
          };
        }
      } else {
        // Create a basic structure if no file content
        flowData = {
          id: `flow_${Date.now()}`,
          name: fileName?.replace('.flow', '') || 'Flow',
          description: 'Flow diagram',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          author: 'User',
          config: {},
          global_variables: {},
          shared_imports: [],
          execution_history: []
        };
      }
      
      // ALWAYS use the current ReactFlow state for nodes and edges
      console.log(`Save - Current nodes: ${nodes.length}, Current edges: ${edges.length}`);
      
      // Convert the current nodes to pipeline format
      flowData.nodes = convertToPipelineNodes(nodes);
      
      // Explicitly convert current edges with proper handling of handles
      flowData.edges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle || null,
        target: edge.target,
        targetHandle: edge.targetHandle || null,
        type: edge.type || 'default'
      }));
      
      // Create the updated flow content
      const updatedContent = JSON.stringify(flowData, null, 2);
      
      // Save the content to the server
      const success = await updateTabFileContent(tabId, updatedContent);
      
      if (success) {
        toast.success("Flow saved successfully");
        // Refresh the canvas after successful save
        setTimeout(() => {
          onRefresh();
        }, 500); // Small delay to ensure save is complete
      } else {
        toast.error("Failed to save flow");
      }
    } catch (error) {
      console.error('Error saving flow:', error);
      toast.error("Error saving flow");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle running all nodes in the workflow
  const handleRunAll = () => {
    if (!filePath || !fileName?.endsWith('.flow')) {
      console.warn('🚫 Run All: Not available for non-.flow files', { filePath, fileName });
      toast.error("Run All is only available for .flow files");
      return;
    }

    const sessionId = `session_${Date.now()}`;
    const startTime = Date.now();

    // Set running state immediately for UI feedback
    setIsRunningAll(true);
    
    // Set all nodes to queued/pending status initially
    nodes.forEach(node => {
      if (node.data?.setNodePending) {
        node.data.setNodePending();
      }
    });
    
    // Clear previous logs and show log panel
    clearExecutionLogs();
    setShowExecutionLogs(true);
    
    // Add initial execution logs
    addExecutionLog('🚀 Starting workflow execution...');
    addExecutionLog(`📁 File: ${fileName}`);
    addExecutionLog(`🎯 Executing all blocks (${nodes.length} nodes)`);
    addExecutionLog(`🔧 Session ID: ${sessionId}`);
    addExecutionLog('⏳ All nodes set to pending status...');
    
    // Enhanced console logging for execution start
    console.group('🚀 WORKFLOW EXECUTION STARTING');
    console.log('📁 File Path:', filePath);
    console.log('📄 File Name:', fileName);
    console.log('🎯 Block ID:', 'all');
    console.log('🔧 Session ID:', sessionId);
    console.log('⏰ Start Time:', new Date().toISOString());
    console.log('🌐 API Endpoint:', '/api/v1/workflow-manager/execute/execute-workflow');
    console.groupEnd();
    
    toast.info("Starting workflow execution...");
    
    const requestPayload = {
      file_path: filePath,
      block_id: "all",
      session_id: sessionId
    };
    
    console.log('📤 Request Payload:', requestPayload);
    addExecutionLog('📤 Sending execution request to backend...');
    
    // Get authentication token from localStorage or store
    const token = localStorage.getItem('token');
    
    // Debug token retrieval
    console.log('🔑 Token Status:', {
      tokenExists: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token found'
    });
    
    // Prepare headers with proper authentication
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    console.log('📋 Final Request Headers:', headers);
    
    // Call the backend execution endpoint with block_id: "all"
    const backendUrl = 'http://localhost:8000/api/v1/workflow-manager/execute/execute-workflow';
    console.log('🌐 Full Backend URL:', backendUrl);
    
    // Execute workflow asynchronously without blocking UI
    executeWorkflowAsync(backendUrl, headers, requestPayload, sessionId, startTime);
  };

  // Separate async function to handle workflow execution without blocking UI
  const executeWorkflowAsync = async (
    backendUrl: string, 
    headers: any, 
    requestPayload: any, 
    sessionId: string, 
    startTime: number
  ) => {
    try {
      addExecutionLog('⚡ Executing workflow in background...');
      
      // Individual nodes will be set to running status as they are executed by the backend
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload)
      });
      
      const executionTime = Date.now() - startTime;
      console.log(`⏱️ Network Response Time: ${executionTime}ms`);
      addExecutionLog(`⏱️ Backend response received in ${executionTime}ms`);
      
      const result = await response.json();

      if (response.ok && result.status === 'success') {
        // Add success logs to UI
        addExecutionLog('✅ Workflow execution completed successfully!');
        addExecutionLog(`📊 Status: ${result.status}`);
        addExecutionLog(`💬 Message: ${result.message}`);
        addExecutionLog(`🆔 File ID: ${result.file_id}`);
        addExecutionLog(`🔢 Variables Count: ${result.variables ? Object.keys(result.variables).length : 0}`);
        addExecutionLog(`⏱️ Total Execution Time: ${executionTime}ms`);
        
        // Enhanced console logging for execution results
        console.group('✅ WORKFLOW EXECUTION SUCCESSFUL');
        console.log('📊 Status:', result.status);
        console.log('💬 Message:', result.message);
        console.log('🆔 File ID:', result.file_id);
        console.log('📈 Execution Result:', result.result);
        console.log('🔢 Variables Count:', result.variables ? Object.keys(result.variables).length : 0);
        
        if (result.variables && Object.keys(result.variables).length > 0) {
          console.group('📝 Variables After Execution');
          Object.entries(result.variables).forEach(([key, value]) => {
            const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
            const truncatedValue = valueStr.length > 200 ? valueStr.substring(0, 200) + '...' : valueStr;
            console.log(`${key}:`, truncatedValue);
          });
          console.groupEnd();
        }
        
        if (result.error_log && Object.keys(result.error_log).length > 0) {
          console.log('📋 Error Log:', result.error_log);
          addExecutionLog('📋 Error log available (check console for details)');
        }
        
        console.log(`⏱️ Total Execution Time: ${executionTime}ms`);
        console.log('🏁 Completed At:', new Date().toISOString());
        console.groupEnd();
        
        // Show execution logs from backend if available
        if (result.result && result.result.logs) {
          addExecutionLog('📝 Backend execution logs:');
          result.result.logs.forEach((log: any) => {
            const logLevel = log.level === 'ERROR' ? '❌' : log.level === 'SUCCESS' ? '✅' : 'ℹ️';
            addExecutionLog(`${logLevel} ${log.message}`);
          });
        }
        
        toast.success(`Workflow executed successfully!`, {
          description: `Executed ${result.message || 'all blocks'} in ${executionTime}ms`
        });
        
        // Update individual nodes with execution results if available
        if (result.result && onNodeExecutionUpdate) {
          console.log('🔄 Updating nodes with execution results...');
          addExecutionLog('🔄 Updating individual nodes with execution results...');
          
          // Update individual node states based on execution results
          updateIndividualNodeStates(result.result);
          
          onNodeExecutionUpdate(result.result);
        }
        
      } else {
        // Add error logs to UI
        addExecutionLog('❌ Workflow execution failed!');
        
        // Individual node error states will be set based on specific execution results
        if (result.result) {
          updateIndividualNodeStates(result.result);
        }
        addExecutionLog(`🔴 HTTP Status: ${response.status}`);
        addExecutionLog(`📊 Response Status: ${result.status}`);
        
        const errorMsg = result.error || result.detail || 'Unknown error occurred';
        addExecutionLog(`⚠️ Error: ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`);
        addExecutionLog(`⏱️ Failed after: ${executionTime}ms`);
        
        // Enhanced console error logging
        console.group('❌ WORKFLOW EXECUTION FAILED');
        console.log('🔴 HTTP Status:', response.status);
        console.log('📊 Response Status:', result.status);
        console.log('💥 Error Details:', result);
        console.log('⚠️ Error Message:', errorMsg);
        
        if (result.error_log) {
          console.log('📋 Error Log:', result.error_log);
          addExecutionLog('📋 Error log available (check console for details)');
        }
        
        console.log(`⏱️ Failed After: ${executionTime}ms`);
        console.groupEnd();
        
        toast.error('Workflow execution failed', {
          description: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)
        });
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Add network error logs to UI
      addExecutionLog('🌐 Network/Client error occurred!');
      addExecutionLog('💥 Network error - individual node states preserved');
      addExecutionLog(`💥 Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      addExecutionLog(`📝 Error Message: ${error instanceof Error ? error.message : String(error)}`);
      addExecutionLog(`⏱️ Failed after: ${executionTime}ms`);
      
      // Enhanced network error logging
      console.group('🌐 NETWORK/CLIENT ERROR');
      console.error('💥 Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('📝 Error Message:', error instanceof Error ? error.message : String(error));
      console.error('📍 Stack Trace:', error instanceof Error ? error.stack : 'No stack trace available');
      console.error('🔍 Full Error Object:', error);
      console.log('📁 File Path:', filePath);
      console.log('🔧 Session ID:', sessionId);
      console.log(`⏱️ Failed After: ${executionTime}ms`);
      console.log('🌐 Request URL:', 'http://localhost:8000/api/v1/workflow-manager/execute/execute-workflow');
      console.log('📤 Request Method:', 'POST');
      console.log('📋 Request Headers:', { 'Content-Type': 'application/json' });
      console.groupEnd();
      
      toast.error('Failed to execute workflow', {
        description: 'Network or server error occurred'
      });
    } finally {
      setIsRunningAll(false);
      addExecutionLog('🔄 Execution completed - Run All button reset');
      
      // Clear node execution states after a delay to allow users to see the final status
      setTimeout(() => {
        nodes.forEach(node => {
          if (node.data?.clearExecutionState) {
            node.data.clearExecutionState();
          }
        });
        addExecutionLog('🧹 Node execution states cleared');
      }, 5000); // Clear after 5 seconds
      
      console.log('🔄 Run All button state reset');
    }
  };

  const handleDownload = () => {
    // Generate the most up-to-date flow content from current nodes and edges
    try {
      // Parse the original file content to get the base structure (metadata only)
      let flowData: any = {};
      
      if (fileContent) {
        try {
          const parsedContent = JSON.parse(fileContent);
          // Only keep the metadata and configuration, not nodes or edges
          flowData = {
            id: parsedContent.id || `flow_${Date.now()}`,
            name: parsedContent.name || (fileName?.replace('.flow', '') || 'Flow'),
            description: parsedContent.description || 'Flow diagram',
            version: parsedContent.version || '1.0.0',
            created: parsedContent.created || new Date().toISOString(),
            modified: new Date().toISOString(),
            author: parsedContent.author || 'User',
            config: parsedContent.config || {},
            global_variables: parsedContent.global_variables || {},
            shared_imports: parsedContent.shared_imports || [],
            execution_history: parsedContent.execution_history || []
          };
        } catch (error) {
          console.error('Error parsing file content:', error);
          // Create a basic structure if parsing fails
          flowData = {
            id: `flow_${Date.now()}`,
            name: fileName?.replace('.flow', '') || 'Flow',
            description: 'Flow diagram',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            author: 'User',
            config: {},
            global_variables: {},
            shared_imports: [],
            execution_history: []
          };
        }
      } else {
        // Create a basic structure if no file content
        flowData = {
          id: `flow_${Date.now()}`,
          name: fileName?.replace('.flow', '') || 'Flow',
          description: 'Flow diagram',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          author: 'User',
          config: {},
          global_variables: {},
          shared_imports: [],
          execution_history: []
        };
      }
      
      // ALWAYS use the current ReactFlow state for nodes and edges
      // This ensures we're using what's actually on the canvas
      console.log(`Download - Current nodes: ${nodes.length}, Current edges: ${edges.length}`);
      
      // Convert the current nodes to pipeline format
      flowData.nodes = convertToPipelineNodes(nodes);
      
      // Explicitly convert current edges with proper handling of handles
      flowData.edges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle || null,
        target: edge.target,
        targetHandle: edge.targetHandle || null,
        type: edge.type || 'default'
      }));
      
      // Create the updated flow content
      const updatedContent = JSON.stringify(flowData, null, 2);
      
      // Create a blob from the updated content
      const blob = new Blob([updatedContent], { type: 'application/json' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Use the fileName if provided, otherwise use a default name
      const downloadName = fileName ? 
        (fileName.endsWith('.flow') ? fileName : `${fileName}.flow`) : 
        `flow_${new Date().getTime()}.flow`;
      
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } catch (error) {
      console.error('Error generating flow content for download:', error);
      alert('Failed to download flow file. See console for details.');
    }
  };
  
  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="flex gap-2 mb-2">
        <Button 
          onClick={onRefresh} 
          disabled={isRefreshing}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          size="sm"
          variant="outline"
          className={hasUnsavedChanges ? 'bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200' : ''}
        >
          <Save className={`h-4 w-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
          Save
        </Button>
        
        <Button 
          onClick={handleDownload} 
          size="sm"
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>

        {fileName?.endsWith('.flow') && (
          <Button 
            onClick={handleRunAll} 
            disabled={isRunningAll}
            size="sm"
            variant="outline"
            className="bg-green-50 border-green-400 text-green-800 hover:bg-green-100"
          >
            <Play className={`h-4 w-4 mr-2 ${isRunningAll ? 'animate-spin' : ''}`} />
            {isRunningAll ? 'Running...' : 'Run All'}
          </Button>
        )}

        {showExecutionLogs && (
          <Button 
            onClick={() => setShowExecutionLogs(false)} 
            size="sm"
            variant="outline"
            className="bg-blue-50 border-blue-400 text-blue-800 hover:bg-blue-100"
          >
            Hide Logs
          </Button>
        )}
      </div>

      {/* Inspector Panel - Fixed 30vh Height with Scrolling */}
      {(showExecutionLogs || selectedNodes.length > 0) && (
        <div className="bg-white border border-gray-300 rounded shadow p-2 
                        w-64 min-w-[200px] max-w-[800px] 
                        h-[30vh] overflow-y-auto
                        resize-x">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-700">
              Inspector {selectedNodes.length > 0 && `(${selectedNodes.length})`}
            </h3>
            <Button 
              onClick={() => setShowExecutionLogs(false)} 
              size="sm"
              variant="outline"
              className="text-xs px-1 py-0.5 h-5"
            >
              ✕
            </Button>
          </div>

          <Accordion type="single" collapsible className="w-full" defaultValue={selectedNodes.length > 0 ? "node-properties" : "execution-logs"}>
            {/* Execution Logs Accordion */}
            {showExecutionLogs && (
              <AccordionItem value="execution-logs" className="border-b border-gray-200">
                <AccordionTrigger className="text-xs hover:no-underline py-2">
                  <div className="flex items-center gap-1.5">
                    Logs ({executionLogs.length})
                    {isRunningAll && (
                      <div className="animate-spin rounded-full h-2 w-2 border-b border-blue-600"></div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="flex justify-end mb-1">
                    <Button onClick={clearExecutionLogs} size="sm" variant="outline" className="text-xs px-1 py-0.5 h-4">
                      Clear
                    </Button>
                  </div>
                  <div className="text-[10px] font-mono space-y-0.5">
                    {executionLogs.length === 0 ? (
                      <div className="text-gray-500 italic">No logs</div>
                    ) : (
                      executionLogs.map((log, index) => (
                        <div key={index} className={`p-1 rounded text-[10px] ${
                          log.includes('❌') ? 'bg-red-50 text-red-700' :
                          log.includes('✅') ? 'bg-green-50 text-green-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                  {isRunningAll && (
                    <div className="mt-1 text-[10px] text-blue-600 flex items-center">
                      <div className="animate-spin rounded-full h-2 w-2 border-b border-blue-600 mr-1"></div>
                      Running...
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Node Properties Accordion */}
            {selectedNodes.length > 0 && (
              <AccordionItem value="node-properties" className="border-b border-gray-200">
                <AccordionTrigger className="text-xs hover:no-underline py-2">
                  <div className="flex items-center gap-1.5">
                    Selected ({selectedNodes.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1">
                    {selectedNodes.slice(0, 5).map((node, index) => (
                      <div key={node.id} className="border rounded p-1.5 bg-gray-50 text-[10px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{node.data?.title || `Node ${index + 1}`}</span>
                          {node.data?.executionStatus && (
                            <span className={`px-1 py-0.5 rounded text-[9px] ${
                              node.data.executionStatus === 'success' ? 'bg-green-100 text-green-800' :
                              node.data.executionStatus === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {node.data.executionStatus}
                            </span>
                          )}
                        </div>
                        
                        {node.data?.language && (
                          <div className="text-gray-600 mb-1">
                            Language: {node.data.language}
                          </div>
                        )}
                        
                        {(node.data?.sourceCode || node.data?.source_code) && (
                          <pre className="bg-gray-900 text-green-400 rounded p-1 text-[9px] font-mono">
                            {(node.data.sourceCode || node.data.source_code).slice(0, 200)}
                            {(node.data.sourceCode || node.data.source_code).length > 200 && '...'}
                          </pre>
                        )}
                      </div>
                    ))}
                    
                    {selectedNodes.length > 5 && (
                      <div className="text-center text-gray-500 text-[9px] py-1">
                        +{selectedNodes.length - 5} more nodes
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      )}
    </div>
  );
}

export default Toolbar