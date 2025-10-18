"use client"

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection, 
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useEditorContext } from '../../context/EditorContext';
import { useTabStore } from '@/components/FileTabs/useTabStore';
import { editorAPI } from '../../services/EditorAPI';
import { nodeTypes } from './nodeTypes';
import { useCanvasHandlers } from './hooks';
import Toolbar from './Toolbar';
import { WorkflowExecutionStatus } from '@/services/WorkflowManagerAPI';
import { 
  parseFlowData, 
  convertFlowNodesToReactFlow, 
  convertToReactFlowEdges,
  convertToFlowNodes,
  convertToFlowEdges,
  serializeFlowData,
  createEmptyFlow,
  isValidFlowFormat
} from './utils/file-parser';

interface CanvasProps {
  tabId: string;
  filePath: string;
}

// Canvas content component
const CanvasContent: React.FC<CanvasProps> = ({ tabId, filePath }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<WorkflowExecutionStatus | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Flag to prevent dirty on initial load
  
  const { updateContent, setDirty, setSaved, registerSaveCallback, unregisterSaveCallback } = useEditorContext();
  const { updateTab } = useTabStore();
  const reactFlowInstance = useReactFlow();

  // Load file content
  const loadFileContent = useCallback(async () => {
    if (!filePath) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const timestamp = new Date().toISOString();
      console.log(`📂 Canvas [${timestamp}]: Loading file content for:`, filePath);
      const fileContent = await editorAPI.getFileContent(filePath);
      console.log(`📂 Canvas [${timestamp}]: File content received, length:`, fileContent.content?.length);
      
      // Parse workflow content using the new file parser
      if (fileContent.content) {
        const validationResult = isValidFlowFormat(fileContent.content);
        
        console.log('📋 Canvas: Flow validation result:', validationResult);
        
        if (validationResult.isValid && validationResult.parsedData) {
          // Convert flow format to ReactFlow format
          const reactFlowNodes = convertFlowNodesToReactFlow(validationResult.parsedData.nodes);
          const reactFlowEdges = convertToReactFlowEdges(validationResult.parsedData.edges);
          
          // Add filePath to node data for execution
          const nodesWithFilePath = reactFlowNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              filePath: filePath
            }
          }));
          
          console.log('✅ Canvas: Loaded flow format - nodes:', nodesWithFilePath.length, 'edges:', reactFlowEdges.length);
          
          // Log execution status of nodes
          nodesWithFilePath.forEach(node => {
            if (node.data.status || node.data.unified_outputs) {
              console.log(`  📊 Node ${node.id}: status=${node.data.status}, outputs=${node.data.unified_outputs?.length || 0}`);
            }
          });
          
          setNodes(nodesWithFilePath);
          setEdges(reactFlowEdges);
        } else {
          console.log('⚠️ Canvas: Flow validation failed, trying legacy format. Missing props:', validationResult.missingProps);
          // Try to parse as legacy format or create empty flow
          try {
            const legacyData = JSON.parse(fileContent.content);
            if (legacyData.nodes && legacyData.edges) {
              console.log('✅ Canvas: Loaded legacy format - nodes:', legacyData.nodes.length, 'edges:', legacyData.edges.length);
              setNodes(legacyData.nodes);
              setEdges(legacyData.edges);
            } else {
              console.log('⚠️ Canvas: No nodes/edges found, creating empty flow');
              setNodes([]);
              setEdges([]);
            }
          } catch (parseError) {
            console.warn('⚠️ Canvas: Could not parse workflow, creating empty flow');
            setNodes([]);
            setEdges([]);
          }
        }
      } else {
        // Empty file, create empty flow
        setNodes([]);
        setEdges([]);
      }
      
      // Update context
      updateContent(tabId, fileContent.content, fileContent.version);
      setSaved(tabId, fileContent.version || 1);
      
      // Clear dirty flag after loading (in case ReactFlow triggers changes)
      setDirty(tabId, false);
      updateTab(tabId, { isDirty: false });
      
      // Mark that initial load is complete after a short delay
      // This allows ReactFlow to finish its initialization
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 100);
      
      console.log('✅ Canvas: File content loaded successfully');
    } catch (error) {
      console.error('❌ Canvas: Error loading file content:', error);
      setError(error instanceof Error ? error.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  }, [filePath, tabId, updateContent, setSaved, setDirty, updateTab]);

  // Handle edge connections
  const onConnect = useCallback((params: Connection) => {
    console.log('🔗 Canvas: Connecting nodes', params);
    const newEdge = {
      ...params,
      id: `edge-${params.source}-${params.target}-${Date.now()}`,
      animated: true,
      style: { 
        stroke: '#555',
        strokeDasharray: '5,5'
      }
    };
    setEdges((eds) => addEdge(newEdge, eds));
    
    // Only set dirty if not during initial load
    if (!isInitialLoad) {
      setDirty(tabId, true);
      updateTab(tabId, { isDirty: true });
    }
  }, [setEdges, setDirty, tabId, updateTab, isInitialLoad]);

  // Save file content using proper flow format
  const saveFileContent = useCallback(async () => {
    if (!filePath) return;

    try {
      console.log('💾 Canvas: Saving file content for:', filePath);
      
      // Convert ReactFlow nodes and edges to flow format
      const flowNodes = convertToFlowNodes(nodes);
      const flowEdges = convertToFlowEdges(edges);
      
      // Get current viewport
      const viewport = reactFlowInstance.getViewport();
      
      // Create flow data structure
      const fileName = filePath.split('/').pop()?.replace('.flow', '') || 'workflow';
      const flowData = {
        id: `flow_${Date.now()}`,
        name: fileName,
        description: `Workflow saved on ${new Date().toLocaleDateString()}`,
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

      // Serialize to JSON
      const content = serializeFlowData(flowData);
      
      // Save using API
      await editorAPI.updateFileContent(filePath, content);
      
      // Update context
      updateContent(tabId, content);
      setSaved(tabId, 1);
      setDirty(tabId, false);
      updateTab(tabId, { isDirty: false });
      
      toast.success('Workflow saved successfully');
      console.log('✅ Canvas: File saved successfully');
      
      // Auto-refresh canvas after save to reload any updated data
      setIsInitialLoad(true); // Prevent dirty flag during refresh
      await loadFileContent();
    } catch (error) {
      console.error('❌ Canvas: Error saving file:', error);
      setError('Failed to save file');
    }
  }, [filePath, tabId, nodes, edges, reactFlowInstance, updateContent, setSaved, setDirty, updateTab, loadFileContent]);

  // Use canvas handlers hook
  const {
    handleNodesChange,
    handleEdgesChange,
    handleNodeDelete,
    onDragOver,
    onDrop: onDropHandler,
    handleKeyDown
  } = useCanvasHandlers(
    tabId,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    saveFileContent,
    isInitialLoad
  );

  // Wrap the onDrop handler to provide ReactFlow instance
  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    onDropHandler(event, reactFlowInstance);
  }, [onDropHandler, reactFlowInstance]);

  // Handle execution completion callback
  const handleExecutionComplete = useCallback(() => {
    console.log('🔄 Canvas: Node execution completed, refetching file content');
    loadFileContent();
  }, [loadFileContent]);

  // Add node deletion handler and execution callback to node data
  const nodesWithDeleteHandler = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        filePath: filePath, // Ensure filePath is always present
        onNodeDelete: handleNodeDelete,
        onExecutionComplete: handleExecutionComplete,
        // Add dirty flag setters for DataTypeNode and other nodes that need to mark changes
        setDirty: setDirty,
        updateTab: updateTab,
        tabId: tabId
      }
    }));
  }, [nodes, filePath, handleNodeDelete, handleExecutionComplete, setDirty, updateTab, tabId]);

  // Load file content on mount
  useEffect(() => {
    loadFileContent();
  }, [loadFileContent]);

  // Register save callback
  useEffect(() => {
    console.log('📝 Canvas: Registering save callback for tabId:', tabId);
    registerSaveCallback(tabId, saveFileContent);
    
    return () => {
      console.log('📝 Canvas: Unregistering save callback for tabId:', tabId);
      unregisterSaveCallback(tabId);
    };
  }, [tabId, registerSaveCallback, unregisterSaveCallback, saveFileContent]);

  // Workflow execution handlers - moved before early returns to maintain hook order
  const handleRun = useCallback(() => {
    console.log('▶️ Canvas: Running workflow - delegating to Toolbar');
    // The actual execution logic is in Toolbar component
    // This is just a placeholder - Toolbar handles the real execution
  }, []);

  const handleStop = useCallback(() => {
    console.log('⏹️ Canvas: Stopping workflow');
    toast.info('Stopping workflow...');
  }, []);

  const handleReset = useCallback(async () => {
    console.log('🔄 Canvas: Resetting workflow - clearing all execution data');
    toast.info('Resetting workflow...');

    try {
      // Clear execution data from all nodes
      const resetNodes = nodes.map(node => {
        const cleanedData = { ...node.data };
        
        // Remove execution-related properties
        delete cleanedData.logs;
        delete cleanedData.execution_result;
        delete cleanedData.lastExecution;
        delete cleanedData.status;
        delete cleanedData.execution_count;
        delete cleanedData.execution_timing;
        delete cleanedData.executionStatus;
        delete cleanedData.output_html;           // Clear rich HTML outputs
        delete cleanedData.unified_outputs;       // Clear unified output stream
        delete cleanedData.execution_order;       // Clear execution order number
        delete cleanedData.error_message;         // Clear error messages
        delete cleanedData.error_traceback;       // Clear error tracebacks

        return {
          ...node,
          data: cleanedData,
          // Reset node status
          status: undefined
        };
      });

      console.log(`✅ Canvas: Cleared execution data from ${resetNodes.length} nodes`);
      
      // Update nodes state
      setNodes(resetNodes);
      
      // Clear execution status
      setExecutionStatus(null);
      
      // Save the file with cleared data
      console.log('💾 Canvas: Saving reset workflow to file');
      
      // Convert to flow format and save
      const flowNodes = convertToFlowNodes(resetNodes);
      const flowEdges = convertToFlowEdges(edges);
      const viewport = reactFlowInstance.getViewport();
      
      const fileName = filePath.split('/').pop()?.replace('.flow', '') || 'workflow';
      const flowData = {
        id: `flow_${Date.now()}`,
        name: fileName,
        description: `Workflow reset on ${new Date().toLocaleDateString()}`,
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
        execution_history: [], // Clear execution history
        current_status: undefined,
        current_execution_id: undefined
      };

      const content = serializeFlowData(flowData);
      await editorAPI.updateFileContent(filePath, content);
      
      // Update context
      updateContent(tabId, content);
      setSaved(tabId, 1);
      setDirty(tabId, false);
      updateTab(tabId, { isDirty: false });
      
      toast.success('Workflow reset successfully - all logs and execution data cleared');
      console.log('✅ Canvas: Workflow reset and saved successfully');
      
    } catch (error) {
      console.error('❌ Canvas: Error resetting workflow:', error);
      toast.error('Failed to reset workflow');
    }
  }, [nodes, edges, filePath, reactFlowInstance, setNodes, setExecutionStatus, updateContent, setSaved, setDirty, updateTab, tabId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading workflow...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p className="mb-2">Error loading workflow</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        nodes={nodesWithDeleteHandler}
        edges={edges}
        onSave={saveFileContent}
        onRun={handleRun}
        onStop={handleStop}
        onReset={handleReset}
        onRefresh={loadFileContent}
        filePath={filePath}
        fileName={filePath?.split('/').pop() || 'workflow'}
        onExecutionStatusChange={setExecutionStatus}
      />
      
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithDeleteHandler}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
          proOptions={{ hideAttribution: false }}
          noDragClassName="noDrag"
          noWheelClassName="noDrag"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

// Main Canvas component with ReactFlow provider
const Canvas: React.FC<CanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasContent {...props} />
    </ReactFlowProvider>
  );
};

export default Canvas;
