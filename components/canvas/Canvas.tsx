"use client"

import React, { useState, useCallback, useRef } from 'react'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  ReactFlowProvider,
  ReactFlowInstance,
  Node,
  Edge,
  useReactFlow,
  Panel,
  BaseEdge,
  EdgeProps,
  getBezierPath
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import { useFileExplorerStore } from '../Sidebar/FileExplorer/utils/store'
import DynamicCustomNode from './DynamicCustomNode'
import { createFlowNodeFromCustomNode, calculateNewNodePosition, FlowNodeData } from '@/lib/utils/node-utils'
import { X, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'


// Custom edge component with delete button
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd }: EdgeProps) => {
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const { setEdges } = useReactFlow();
  
  // Get the path for the edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Handle edge deletion
  const onEdgeDelete = useCallback(
    (event: React.MouseEvent, edgeId: string) => {
      event.stopPropagation();
      setEdges((edges) => edges.filter((edge) => edge.id !== edgeId));
      toast.success('Connection deleted');
    },
    [setEdges]
  );

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        strokeWidth={15}
        fill="none"
        stroke="transparent"
        strokeOpacity={0}
        onMouseEnter={() => setShowDeleteButton(true)}
        onMouseLeave={() => setShowDeleteButton(false)}
      />
      {showDeleteButton && (
        <foreignObject
          width={20}
          height={20}
          x={labelX - 10}
          y={labelY - 10}
          className="edgebutton-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div
            className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-white cursor-pointer hover:bg-zinc-700 border border-zinc-700 shadow-sm transition-colors"
            onClick={(event) => onEdgeDelete(event, id)}
          >
            <X size={12} />
          </div>
        </foreignObject>
      )}
    </>
  );
};

// Define node and edge types for React Flow
const nodeTypes = {
  dynamicCustomNode: DynamicCustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Initial empty state
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Main Canvas wrapper component to provide React Flow context
function CanvasWrapper() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}

// Inner Canvas component with access to React Flow hooks
function CanvasContent() {
  // State for nodes and edges
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const { activePath, rootPath } = useFileExplorerStore();
  
  // Reference to the React Flow instance
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlow = useReactFlow();
  
  // Callbacks for node and edge changes
  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  
  // Handle connection between nodes
  const onConnect = useCallback((params: any) => {
    setEdges((eds) => [...eds, { 
      ...params, 
      id: `edge-${Date.now()}`, 
      animated: false,
      type: 'custom' // Use our custom edge type
    }]);
  }, []);
  
  // Handle edge deletion when user clicks on an edge
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, []);
  
  // Handle node deletion
  const onNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    // Remove any connected edges
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    toast.success('Node removed');
  }, []);
  
  // Handle drag over event for custom nodes
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  // Handle drop event for custom nodes
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      // Get the custom node data from the drag event
      const nodeData = event.dataTransfer.getData('application/reactflow');
      
      if (!nodeData || !reactFlowInstance) {
        return;
      }
      
      try {
        // Parse the node data
        const customNode = JSON.parse(nodeData);
        
        // Get the position where the node was dropped
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        
        // Create a new React Flow node from the custom node
        const newNode = createFlowNodeFromCustomNode(customNode, position);
        
        // Create a new node with the onNodeDelete function
        const nodeWithDeleteFunction = {
          ...newNode,
          data: {
            ...newNode.data,
            // We'll access this in the DynamicCustomNode component
            onNodeDelete
          }
        };
        
        // Add the new node to the canvas
        setNodes((nds) => [...nds, nodeWithDeleteFunction]);
        
        console.log('Added new node:', nodeWithDeleteFunction);
      } catch (error) {
        console.error('Error adding node to canvas:', error);
      }
    },
    [reactFlowInstance]
  );
  
  return (
    <div className="flex flex-col h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'custom' }}
        fitView
      >
        <Background />
        <Controls />
        <Panel position="top-right">
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm"
              className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 shadow-sm transition-colors"
              onClick={() => {
                toast.success('Running all nodes...');
                // Add logic to run all nodes here
                nodes.forEach(node => {
                  toast.info(`Running node: ${node.data.title || 'Untitled Node'}`);
                  // Execute node logic here
                });
              }}
            >
              <Play className="h-3 w-3 mr-1" />
              Run All
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 shadow-sm transition-colors"
              onClick={() => {
                // Clear the canvas
                setNodes([]);
                setEdges([]);
                toast.success('Canvas cleared');
              }}
            >
              Clear Canvas
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Export the wrapper component
function Canvas() {
  return <CanvasWrapper />;
}

export default Canvas