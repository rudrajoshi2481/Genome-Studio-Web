"use client"

import React from 'react';
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

// Import styles for ReactFlow
import 'reactflow/dist/style.css';

// Define props for the Canvas component
interface CanvasProps {
  tabId: string;
}

// Canvas content component
interface CanvasContentProps extends CanvasProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  nodes: Node<any, string | undefined>[];
  edges: Edge<any>[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, reactFlowInstance: any) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
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
  
  // State for ReactFlow nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
          
          // Add delete handler to each node
          const nodesWithHandlers = reactFlowNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              onNodeDelete: handleNodeDelete
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
  
  // Handle connection of nodes
  const onConnect = React.useCallback((params: Connection) => {
    // Create a unique ID for the new edge
    const newEdge = {
      ...params,
      id: `edge_${params.source}_${params.sourceHandle || 'output'}_${params.target}_${params.targetHandle || 'input'}`,
      type: 'default'
    };
    setEdges((eds) => addEdge(newEdge, eds));
    
    // Update the fileContent to include the new edge
    if (fileContent) {
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
          setFileContent(JSON.stringify(updatedFlowData, null, 2));
        }
      } catch (error) {
        // console.error("Error updating file content with new edge:", error);
      }
    }
  }, [fileContent, setEdges]);
  
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
    // console.log(`Deleting node: ${nodeId}`);
    
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
    
    // Find edges connected to this specific node
    const edgesToRemove = edges.filter(isEdgeConnectedToNode);
    
    // Log detailed information for debugging
    // console.log('Connected edges to remove:', edgesToRemove);
    // console.log('Edge IDs to remove:', edgesToRemove.map(e => e.id));
    
    // Remove the node from the state
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    
    // Only remove edges that are connected to this specific node
    setEdges((currentEdges) => {
      // Filter out only the edges connected to this node
      const remainingEdges = currentEdges.filter(edge => !isEdgeConnectedToNode(edge));
      
      // Log  before/after counts
      // console.log(`Edges before: ${currentEdges.length}, after: ${remainingEdges.length}`);
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
  
  // Handle node changes and update file content
  const handleNodesChange = React.useCallback((changes: any) => {
    // Check if any of the changes is a node removal
    const nodeRemovals = changes.filter(
      (change: any) => change.type === 'remove'
    );
    
    // Process normal node changes
    onNodesChange(changes);
    
    // Update file content after node changes (position, deletion, etc)
    if (fileContent && changes.length > 0) {
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
            setFileContent(JSON.stringify(updatedFlowData, null, 2));
          }
        } catch (error) {
          // console.error("Error updating file content after node changes:", error);
        }
      }, 100); // Small delay to ensure nodes state is updated
    }
  }, [fileContent, nodes, edges, onNodesChange]);
  
  // Handle edge changes and update file content
  const handleEdgesChange = React.useCallback((changes: any) => {
    onEdgesChange(changes);
    
    // Update file content after edge changes
    if (fileContent && changes.length > 0) {
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
            setFileContent(JSON.stringify(updatedFlowData, null, 2));
          }
        } catch (error) {
          console.error("Error updating file content after edge changes:", error);
        }
      }, 100); // Small delay to ensure edges state is updated
    }
  }, [fileContent, edges, onEdgesChange]);

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

      // Create a new node with unique ID
      const newNode = {
        id: `node_${nodeData.id || nodeData.node_id || Date.now()}`,
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
          onNodeDelete: handleNodeDelete // Add delete handler
        }
      };

      // Add the new node to the flow
      setNodes((nds) => nds.concat(newNode));
      
      // Update the file content to include the new node
      if (fileContent) {
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
            setFileContent(JSON.stringify(updatedFlowData, null, 2));
          }
        } catch (error) {
          console.error("Error updating file content with new node:", error);
        }
      }
    },
    [fileContent, setNodes]
  );

  return (
    <div className="w-full h-[95%] overflow-auto">
      <ReactFlowProvider>
        <CanvasContent 
          tabId={tabId} 
          onRefresh={handleRefresh} 
          isRefreshing={isRefreshing}
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
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
