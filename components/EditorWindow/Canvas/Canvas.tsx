"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  useReactFlow
} from 'reactflow';
import { toast } from 'sonner';
import { useTabStore } from '@/components/FileTabs/useTabStore';
import { fetchTabFilePath, fetchTabFileContent } from './hooks/canvashooks';
import { isValidFlowFormat, convertToFlowEdges, convertToFlowNodes, convertFlowNodesToReactFlow } from './hooks/fileParser';
import Toolbar from './components/Toolbar';
import DynamicCustomNode from './DynamicCustomNode';
import useRealtimeFileSync from '@/hooks/useRealtimeFileSync';
import { useAtomicFileSync } from '@/hooks/useAtomicFileSync';

// Import styles for ReactFlow
import 'reactflow/dist/style.css';

// Define props for the Canvas component
interface CanvasProps {
  tabId: string;
}

// Canvas content component
interface CanvasContentProps {
  tabId?: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
  nodes: Node<any, string | undefined>[];
  edges: Edge<any>[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, reactFlowInstance: any) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onSelectionChange?: (selection: { nodes: Node[]; edges: Edge[] }) => void;
  fileContent?: string | null;
  filePath?: string;
}

// Define node types mapping
const nodeTypes: NodeTypes = {
  dynamicNode: DynamicCustomNode
};

const CanvasContent: React.FC<CanvasContentProps> = (props) => {
  const { 
    tabId, 
    onRefresh, 
    isRefreshing, 
    nodes, 
    edges, 
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDrop,
    onDragOver,
    onSelectionChange,
    fileContent,
    filePath
  } = props;

  const reactFlowInstance = useReactFlow();
  
  // Extract filename from path if available
  const fileName = filePath && typeof filePath === 'string' ? 
    filePath.split('/').pop() : undefined;
 
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onSelectionChange={onSelectionChange}
      nodeTypes={nodeTypes}
      onDrop={(event) => onDrop(event, reactFlowInstance)}
      onDragOver={onDragOver}
      fitView
    >
      <Toolbar 
        onRefresh={onRefresh} 
        isRefreshing={isRefreshing} 
        fileContent={fileContent} 
        fileName={fileName} 
        nodes={nodes}
        edges={edges}
        tabId={tabId}
        filePath={filePath}
      />
      <Controls />
      <MiniMap nodeStrokeWidth={3} zoomable pannable />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
};

// Main Canvas component with ReactFlowProvider
export const Canvas: React.FC<CanvasProps> = ({ tabId }) => {
  // State to store file path and content
  const [filePath, setFilePath] = React.useState<string | undefined>();
  const [fileContent, setFileContent] = React.useState<string | null>(null);
  
  // Log the entire file content whenever it changes
  React.useEffect(() => {
    if (fileContent) {
      // console.log('File content updated:');
      // console.log(fileContent);
    }
  }, [fileContent]);
  // State to track refreshing state
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  // Ref to track if validation toast has been shown
  const validationToastShown = React.useRef<boolean>(false);
  
  // Auto-save state tracking
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState<boolean>(false);
  const [lastSavedContent, setLastSavedContent] = React.useState<string>('');
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Tab store for dirty state management
  const { setTabDirty } = useTabStore();
  
  // State for ReactFlow nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // State for selected nodes
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [nodeExecutionStates, setNodeExecutionStates] = useState<Record<string, {
    status: 'pending' | 'running' | 'completed' | 'error';
    timestamp: number;
  }>>({});

  // Functions to manage node execution states
  const setNodePending = useCallback((nodeId: string) => {
    setNodeExecutionStates(prev => ({
      ...prev,
      [nodeId]: { status: 'pending', timestamp: Date.now() }
    }));
  }, []);

  const setNodeRunning = useCallback((nodeId: string) => {
    setNodeExecutionStates(prev => ({
      ...prev,
      [nodeId]: { status: 'running', timestamp: Date.now() }
    }));
  }, []);

  const setNodeCompleted = useCallback((nodeId: string) => {
    setNodeExecutionStates(prev => ({
      ...prev,
      [nodeId]: { status: 'completed', timestamp: Date.now() }
    }));
  }, []);

  const setNodeError = useCallback((nodeId: string) => {
    setNodeExecutionStates(prev => ({
      ...prev,
      [nodeId]: { status: 'error', timestamp: Date.now() }
    }));
  }, []);

  const clearNodeExecutionState = useCallback((nodeId: string) => {
    setNodeExecutionStates(prev => {
      const newStates = { ...prev };
      delete newStates[nodeId];
      return newStates;
    });
  }, []);

  // Handle selection changes
  const handleSelectionChange = useCallback(({ nodes: selectedNodeList }: { nodes: Node[] }) => {
    setSelectedNodes(selectedNodeList);
  }, []);

  // Enhanced atomic file sync integration for .flow files
  const { updateNode, updateFile, isConnected, getSyncStatus } = useAtomicFileSync({
    filePath: filePath || '',
    enableNodeUpdates: true, // Enable atomic node updates for .flow files
    onFileUpdated: (content, checksum, timestamp) => {
      console.log('Atomic file update received in Canvas:', timestamp);
      setFileContent(content);
      
      // Parse and update nodes/edges from the new content
      const validationResult = isValidFlowFormat(content);
      if (validationResult.isValid && validationResult.parsedData) {
        const flowData = validationResult.parsedData;
        
        if (flowData.nodes) {
          const reactFlowNodes = convertFlowNodesToReactFlow(flowData.nodes);
          const nodesWithHandlers = reactFlowNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              onNodeDelete: handleNodeDelete,
              filePath: filePath,
              // Add execution state management
              currentExecutionState: nodeExecutionStates[node.id],
              setNodePending: () => setNodePending(node.id),
              setNodeRunning: () => setNodeRunning(node.id),
              setNodeCompleted: () => setNodeCompleted(node.id),
              setNodeError: () => setNodeError(node.id),
              clearExecutionState: () => clearNodeExecutionState(node.id)
            }
          }));
          setNodes(nodesWithHandlers);
        }
        
        if (flowData.edges) {
          setEdges(flowData.edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            sourceHandle: edge.sourceHandle,
            target: edge.target,
            targetHandle: edge.targetHandle,
            type: edge.type || 'default'
          })));
        }
      }
    },
    onNodeUpdated: (nodeData, timestamp) => {
      console.log('Atomic node update received in Canvas:', nodeData.id, timestamp);
      
      // Update only the specific node in the React Flow state
      setNodes(currentNodes => 
        currentNodes.map(node => 
          node.id === nodeData.id 
            ? {
                ...node,
                data: { 
                  ...node.data, 
                  ...nodeData,
                  // Preserve execution state management functions
                  currentExecutionState: nodeExecutionStates[node.id],
                  setNodePending: () => setNodePending(node.id),
                  setNodeRunning: () => setNodeRunning(node.id),
                  setNodeCompleted: () => setNodeCompleted(node.id),
                  setNodeError: () => setNodeError(node.id),
                  clearExecutionState: () => clearNodeExecutionState(node.id)
                },
                position: nodeData.position || node.position
              }
            : node
        )
      );
    },
    onBackendChange: (changeType, content, checksum) => {
      console.log(`Backend change detected in Canvas: ${changeType}`, filePath);
      if (changeType === 'deleted') {
        toast.error('File was deleted', { description: 'The .flow file you are editing was deleted from the filesystem' });
      } else if (content) {
        // File was modified by backend, update content
        setFileContent(content);
      }
    },
    onError: (error) => {
      console.error('Atomic sync error in Canvas:', error);
      toast.error('Sync Error', { description: error });
    }
  });

  // Robust auto-save function with retry logic
  const performAutoSave = React.useCallback(async (content: string, retryCount = 0) => {
    if (!filePath || !content || content === lastSavedContent) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (isConnected()) {
        await updateFile(content);
        setLastSavedContent(content);
        setHasUnsavedChanges(false);
        
        // Update tab dirty state - mark as clean (saved)
        if (tabId) {
          setTabDirty(tabId, false);
        }
        
        console.log('✅ Auto-save successful for:', filePath);
        toast.success('File saved automatically', { duration: 2000 });
      } else {
        throw new Error('Not connected to sync service');
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      
      // Retry logic - up to 3 attempts
      if (retryCount < 3) {
        console.log(`🔄 Retrying auto-save (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          performAutoSave(content, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
      } else {
        console.error('💥 Auto-save failed after 3 attempts');
        toast.error('Auto-save failed after multiple attempts. Please save manually.');
        
        // Keep tab marked as dirty since save failed
        if (tabId) {
          setTabDirty(tabId, true);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [filePath, lastSavedContent, isConnected, updateFile, tabId, setTabDirty]);
  
  // Debounced auto-save trigger
  const triggerAutoSave = React.useCallback((content: string) => {
    if (content !== lastSavedContent) {
      setHasUnsavedChanges(true);
      
      // Mark tab as dirty immediately when changes are detected
      if (tabId) {
        setTabDirty(tabId, true);
      }
    }
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Trigger unsaved changes
    setHasUnsavedChanges(true);
    
    // Trigger auto-save after a short delay
    setTimeout(() => {
      performAutoSave(content);
    }, 500);
  }, [performAutoSave]);

  // Handle node execution updates from "Run All"
  const handleNodeExecutionUpdate = React.useCallback((executionResult: any) => {
    console.log('🔄 Handling node execution update:', executionResult);
    
    // Extract node ID from the execution result
    const nodeId = executionResult.cell_id;
    if (!nodeId) {
      console.warn('⚠️ No cell_id found in execution result');
      return;
    }
    
    // Update the specific node with execution results
    setNodes(currentNodes => 
      currentNodes.map(node => {
        if (node.id === nodeId) {
          console.log(`✅ Updating node ${nodeId} with execution results`);
          return {
            ...node,
            data: {
              ...node.data,
              executionLogs: executionResult.logs || [],
              executionStatus: executionResult.status || 'completed',
              lastExecuted: new Date().toISOString(),
              executionOutput: executionResult.output || {}
            }
          };
        }
        return node;
      })
    );
  }, []);

  // Initialize last saved content when file content loads
  React.useEffect(() => {
    if (fileContent && !lastSavedContent) {
      setLastSavedContent(fileContent);
      setHasUnsavedChanges(false);
      if (tabId) {
        setTabDirty(tabId, false);
      }
    }
  }, [fileContent, lastSavedContent, tabId, setTabDirty]);

  // Cleanup auto-save timeout on unmount
  React.useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Function to fetch data from the tab
  const fetchData = React.useCallback(async (forceRefresh = false) => {
    if (!tabId) {
      // console.log("No tab ID provided");
      return;
    }
    
    try {
      setIsRefreshing(true);
      
      const {name, path} = await fetchTabFilePath(tabId);
      
      if (!path) {
        // console.log("No path found for tab ID:", tabId);
        setIsRefreshing(false);
        return;
      }
      
      const content = await fetchTabFileContent(name, path, forceRefresh);
      if (!content) {
        // console.log("No content   found for path:", path);
        setIsRefreshing(false);
        return;
      }      
      const validationResult = isValidFlowFormat(content);
      
      // Only show toast if it hasn't been shown yet for this tabId or if forcing refresh
      if (!validationToastShown.current || forceRefresh) {
        if (!validationResult.isValid) {
          toast.error(
            forceRefresh ? "Failed to refresh flow" : "Invalid flow format", 
            { description: validationResult.error || "The file is not in a valid flow format" }
          );
        } else {
          toast.success(
            forceRefresh ? "Flow refreshed successfully" : "Valid flow format", 
            { description: "The file is in a valid flow format" }
          );
        }
        validationToastShown.current = true;
      }
      
      setFilePath(path);
      setFileContent(content);
      
      // Extract nodes and edges from parsed data if valid
      if (validationResult.isValid && validationResult.parsedData) {
        const flowData = validationResult.parsedData;
        if (flowData.nodes) {
          // Convert flow nodes to ReactFlow nodes with dynamic node support
          const reactFlowNodes = convertFlowNodesToReactFlow(flowData.nodes);
          
          // Add delete handler and filePath to each node
          const nodesWithHandlers = reactFlowNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              onNodeDelete: handleNodeDelete,
              filePath: path, // Pass the current file path to each node for execution
              // Add execution state management
              currentExecutionState: nodeExecutionStates[node.id],
              setNodePending: () => setNodePending(node.id),
              setNodeRunning: () => setNodeRunning(node.id),
              setNodeCompleted: () => setNodeCompleted(node.id),
              setNodeError: () => setNodeError(node.id),
              clearExecutionState: () => clearNodeExecutionState(node.id)
            }
          }));
          
          setNodes(nodesWithHandlers);
        }
        
        if (flowData.edges) {
          setEdges(flowData.edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            sourceHandle: edge.sourceHandle,
            target: edge.target,
            targetHandle: edge.targetHandle,
            type: edge.type || 'default'
          })));
        }
      }
      
      // console.log("File path:", path);
      // console.log("File content:", content);
      // console.log("File content length:", content?.length || 0);
    } catch (error) {
      // console.error("Error fetching tab data:", error);
      toast.error("Failed to refresh flow data");
    } finally {
      setIsRefreshing(false);
    }
  }, [tabId]); // Remove isRefreshing from dependencies

  // Handle refresh button click
  const handleRefresh = React.useCallback(() => {
    validationToastShown.current = false; // Reset toast flag to show refresh result
    fetchData(true); // Pass true to force refresh
  }, [fetchData]);
  
  // Handle connection of nodes with real-time sync
  const onConnect = React.useCallback((params: Connection) => {
    // Create a unique ID for the new edge
    const newEdge = {
      ...params,
      id: `edge_${params.source}_${params.sourceHandle || 'output'}_${params.target}_${params.targetHandle || 'input'}`,
      type: 'default'
    };
    setEdges((eds) => addEdge(newEdge, eds));
    
    // Update the fileContent to include the new edge and sync
    if (fileContent && filePath) {
      try {
        const validationResult = isValidFlowFormat(fileContent);
        if (validationResult.isValid && validationResult.parsedData) {
          const updatedFlowData = {
            ...validationResult.parsedData,
            edges: [...(validationResult.parsedData.edges || []), {
              id: newEdge.id,
              source: newEdge.source,
              sourceHandle: newEdge.sourceHandle,
              target: newEdge.target,
              targetHandle: newEdge.targetHandle,
              type: newEdge.type || 'default'
            }]
          };
          
          const newContent = JSON.stringify(updatedFlowData, null, 2);
          setFileContent(newContent);
          
          // Trigger auto-save
          triggerAutoSave(newContent);
        }
      } catch (error) {
        console.error("Error updating file content with new edge:", error);
      }
    }
  }, [fileContent, setEdges, filePath, triggerAutoSave]);
  
  // Update existing nodes with current filePath when filePath changes
  React.useEffect(() => {
    if (filePath && nodes.length > 0) {
      const updatedNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          filePath: filePath // Update filePath for all existing nodes
        }
      }));
      setNodes(updatedNodes);
    }
  }, [filePath]); // Only depend on filePath, not nodes to avoid infinite loop
  
  // Initial data fetch when tab changes
  React.useEffect(() => {
    if (!tabId) return;
    
    // Reset state when tabId changes
    validationToastShown.current = false;
    setNodes([]);
    setEdges([]);
    setFileContent(null);
    setFilePath(undefined);
    setIsRefreshing(false);
    
    // Fetch new data for the current tab
    fetchData();
    
    // console.log("Tab changed to:", tabId);
  }, [tabId, fetchData]);
 
  // Handle node deletion
  const handleNodeDelete = React.useCallback((nodeId: string) => {
    console.log(`Deleting node: ${nodeId}`);
    
    // Helper function to check if an edge is connected to the deleted node
    // This needs to be very precise to avoid removing unrelated edges
    const isEdgeConnectedToNode = (edge: Edge) => {
      // For exact matches - this is the most reliable check and should be the primary method
      if (edge.source === nodeId || edge.target === nodeId) {
        // console.log(`Edge ${edge.id} matches exactly with node ${nodeId}`);
        return true;
      }
      
      // For handle-specific connections like "nodeId__handleId"
      // These are common in ReactFlow where handles have specific IDs
      const sourceBase = edge.source.split('__')[0];
      const targetBase = edge.target.split('__')[0];
      
      if (sourceBase === nodeId || targetBase === nodeId) {
        // console.log(`Edge ${edge.id} matches with node ${nodeId} via handle pattern`);
        return true;
      }
      
      // For special cases where the node ID might be embedded in a more complex ID
      // Be extremely cautious with this to avoid false positives
      // Only use very specific patterns that are known to be used in the application
      
      // Otherwise, this edge is not connected to our node
      return false;
    };
    
    // Remove the node
    setNodes(currentNodes => currentNodes.filter(node => node.id !== nodeId));
    
    // Remove all edges connected to this node
    setEdges(currentEdges => {
      const edgesToRemove = currentEdges.filter(isEdgeConnectedToNode);
      const remainingEdges = currentEdges.filter(edge => !isEdgeConnectedToNode(edge));
      
      console.log(`Removing ${edgesToRemove.length} edges connected to node ${nodeId}`);
      edgesToRemove.forEach(edge => {
        console.log(`  - Removing edge: ${edge.id} (${edge.source} -> ${edge.target})`);
      });
      // console.log('Removed edge count:', currentEdges.length - remainingEdges.length);
      
      return remainingEdges;
    });
    
    // We no longer update fileContent here - it will be handled by the useEffect
    toast.success("Node deleted");
  }, [setNodes, setEdges]);
  
  // Use an effect to update fileContent whenever nodes or edges change
  // This ensures we always use the latest state for serialization
  React.useEffect(() => {
    // Skip initial render or when fileContent is not yet available
    if (!fileContent || !nodes || !edges) return;
    
    try {
      const validationResult = isValidFlowFormat(fileContent);
      if (validationResult.isValid && validationResult.parsedData) {
        // Create updated flow data with the current nodes and edges state
        const updatedFlowData = {
          ...validationResult.parsedData,
          // Always use the current nodes and edges from state
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: {
              ...node.data,
              // Remove the onNodeDelete function as it shouldn't be serialized
              onNodeDelete: undefined
            }
          })),
          edges: convertToFlowEdges(edges)
        };
        
        // console.log(`Updating file content - Nodes: ${nodes.length}, Edges: ${edges.length}`);
        // console.log('Edge IDs in updated flow:', edges.map((e: Edge) => e.id));
        
        // Update file content with the new data
        setFileContent(JSON.stringify(updatedFlowData, null, 2));
      }
    } catch (error) {
      // console.error("Error updating file content after state change:", error);
    }
  }, [fileContent, nodes, edges, setFileContent]);
  
  // Handle node changes and update file content with real-time sync
  const handleNodesChange = React.useCallback((changes: any) => {
    // Process normal node changes
    onNodesChange(changes);
    
    // Update file content and sync after node changes (position, deletion, etc)
    if (fileContent && changes.length > 0 && filePath) {
      setTimeout(() => {
        try {
          const validationResult = isValidFlowFormat(fileContent);
          if (validationResult.isValid && validationResult.parsedData) {
            // Get current nodes after the change
            const updatedFlowData = {
              ...validationResult.parsedData,
              nodes: nodes.map((node) => ({
                id: node.id,
                type: node.type || 'default',
                position: node.position,
                data: {
                  ...node.data,
                  onNodeDelete: undefined // Remove the function reference before serializing
                },
                draggable: node.draggable !== false,
                selectable: node.selectable !== false,
                deletable: node.deletable !== false
              })),
              edges: edges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                sourceHandle: edge.sourceHandle || null,
                target: edge.target,
                targetHandle: edge.targetHandle || null,
                type: edge.type || 'default'
              }))
            };
            
            const newContent = JSON.stringify(updatedFlowData, null, 2);
            setFileContent(newContent);
            
            // Trigger auto-save and mark as unsaved changes (makes save button yellow)
            triggerAutoSave(newContent);
          }
        } catch (error) {
          console.error("Error updating file content after node changes:", error);
        }
      }, 100); // Small delay to ensure nodes state is updated
    }
  }, [fileContent, nodes, edges, onNodesChange, filePath, triggerAutoSave]);
  
  // Handle edge changes and update file content with real-time sync
  const handleEdgesChange = React.useCallback((changes: any) => {
    onEdgesChange(changes);
    
    // Update file content and sync after edge changes
    if (fileContent && changes.length > 0 && filePath) {
      setTimeout(() => {
        try {
          const validationResult = isValidFlowFormat(fileContent);
          if (validationResult.isValid && validationResult.parsedData) {
            const updatedFlowData = {
              ...validationResult.parsedData,
              edges: edges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                sourceHandle: edge.sourceHandle || null,
                target: edge.target,
                targetHandle: edge.targetHandle || null,
                type: edge.type || 'default'
              }))
            };
            
            const newContent = JSON.stringify(updatedFlowData, null, 2);
            setFileContent(newContent);
            
            // Trigger auto-save and mark as unsaved changes (makes save button yellow)
            triggerAutoSave(newContent);
          }
        } catch (error) {
          console.error("Error updating file content after edge changes:", error);
        }
      }, 100); // Small delay to ensure edges state is updated
    }
  }, [fileContent, edges, onEdgesChange, filePath, triggerAutoSave]);

  // Handle drag over event (needed for drop functionality)
  const onDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop event from Nodebar
  const onDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>, reactFlowInstance: any) => {
      event.preventDefault();

      // Get the ReactFlow bounds
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      
      // Try to get the custom node data
      let nodeData;
      try {
        const jsonData = event.dataTransfer.getData('application/reactflow');
        if (!jsonData) return;
        nodeData = JSON.parse(jsonData);
      } catch (error) {
        console.error('Error parsing dropped node data:', error);
        return;
      }

      // Calculate position where node was dropped
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      });

      console.log('Drop position:', position);

      // Create a new node with guaranteed unique ID
      const uniqueId = `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const newNode = {
        id: uniqueId,
        type: 'dynamicNode',
        position,
        data: {
          title: nodeData.title || 'New Node',
          description: nodeData.description || '',
          inputs: nodeData.inputs || [],
          outputs: nodeData.outputs || [],
          language: nodeData.language || 'python',
          function_name: nodeData.function_name || 'function',
          source_code: nodeData.source_code || '',
          // Store the original node ID for reference if needed
          originalId: nodeData.id || nodeData.node_id,
          onNodeDelete: handleNodeDelete // Add delete handler
        }
      };

      // Add the new node to the flow
      setNodes((nds) => nds.concat(newNode));
      
      // Update the file content to include the new node and sync
      if (fileContent && filePath) {
        try {
          const validationResult = isValidFlowFormat(fileContent);
          if (validationResult.isValid && validationResult.parsedData) {
            const updatedFlowData = {
              ...validationResult.parsedData,
              nodes: [...(validationResult.parsedData.nodes || []), {
                id: newNode.id,
                type: newNode.type,
                position: newNode.position,
                data: newNode.data,
                draggable: true,
                selectable: true,
                deletable: true
              }]
            };
            
            const newContent = JSON.stringify(updatedFlowData, null, 2);
            setFileContent(newContent);
            
            // Trigger auto-save and mark as unsaved changes (makes save button yellow)
            triggerAutoSave(newContent);
          }
        } catch (error) {
          console.error("Error updating file content with new node:", error);
        }
      }
    },
    [fileContent, setNodes, filePath, triggerAutoSave]
  );

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Auto-save status indicator */}
      {(isSaving || hasUnsavedChanges) && (
        <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md shadow-sm border text-sm">
          {isSaving ? (
            <>
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-blue-600">Saving...</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-orange-600">Unsaved changes</span>
            </>
          ) : null}
        </div>
      )}
      
      <Toolbar 
        nodes={nodes}
        edges={edges}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        fileContent={fileContent}
        fileName={filePath ? filePath.split('/').pop() : undefined}
        tabId={tabId}
        hasUnsavedChanges={hasUnsavedChanges}
        filePath={filePath}
        onNodeExecutionUpdate={handleNodeExecutionUpdate}
        selectedNodes={selectedNodes}
      /> 
      <ReactFlowProvider>
        <CanvasContent 
          tabId={tabId} 
          onRefresh={handleRefresh} 
          isRefreshing={isRefreshing}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={handleSelectionChange}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fileContent={fileContent}
          filePath={filePath}
        />
      </ReactFlowProvider>
    </div>
  );
};

export default Canvas;
