"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  ReactFlowProvider,
  ReactFlowInstance,
  Node,
  Edge,
  useReactFlow,
  BaseEdge,
  EdgeProps,
  getBezierPath,
  Panel,
  NodeChange,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFileExplorerStore } from '../Sidebar/FileExplorer/utils/store'
import DynamicCustomNode from './DynamicCustomNode'
import { createFlowNodeFromCustomNode, calculateNewNodePosition, FlowNodeData } from '@/lib/utils/node-utils'
import { X, Play, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { 
  loadPipelineFromJson, 
  convertPipelineNodesToFlowNodes,
  convertPipelineEdgesToFlowEdges,
  convertFlowNodesToPipelineNodes,
  convertFlowEdgesToPipelineEdges,
  savePipelineToJson,
  createPipelineFromCurrentState
} from '@/lib/utils/pipeline-utils'
import { DataProcessingPipeline, PipelineNode, PipelineEdge } from '@/lib/types/pipeline-flow'


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

// Pipeline file path
const PIPELINE_FILE_PATH = 'pipeline.flow';

// Initial empty state
const initialNodes: Node<FlowNodeData>[] = [];
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
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const { activePath, rootPath } = useFileExplorerStore();
  
  // State to track if the pipeline has been loaded
  const [pipelineLoaded, setPipelineLoaded] = useState(false);
  
  // Reference to the React Flow instance
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlow = useReactFlow();
  
  // Load pipeline data on component mount
  useEffect(() => {
    const loadPipeline = async () => {
      try {
        const pipeline = await loadPipelineFromJson(PIPELINE_FILE_PATH);
        if (pipeline && pipeline.nodes && pipeline.edges) {
          console.log('Loaded pipeline data:', pipeline);
          
          // Convert pipeline nodes to React Flow nodes using utility function
          const flowNodes = convertPipelineNodesToFlowNodes(pipeline.nodes, onNodeDelete);
          setNodes(flowNodes);
          
          // Convert pipeline edges to React Flow edges
          const flowEdges = convertPipelineEdgesToFlowEdges(pipeline.edges);
          setEdges(flowEdges);
          
          setPipelineLoaded(true);
          toast.success('Pipeline loaded successfully');
        }
      } catch (error) {
        console.error('Error loading pipeline:', error);
        toast.error('Failed to load pipeline');
      }
    };
    
    loadPipeline();
  }, []);  // Empty dependency array means this runs once on mount
  
  // Function to save the current state to the pipeline file
  const savePipeline = useCallback(async () => {
    if (!nodes.length) {
      toast.info('No nodes to save');
      return;
    }
    
    try {
      // Create a pipeline from the current state
      const pipeline = createPipelineFromCurrentState(nodes, edges);
      
      // Save the pipeline to the file
      const response = await fetch('/api/save-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipeline,
          filePath: PIPELINE_FILE_PATH
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save pipeline: ${response.statusText}`);
      }
      
      console.log('Pipeline saved successfully:', pipeline);
      toast.success('Pipeline saved successfully');
    } catch (error) {
      console.error('Error saving pipeline:', error);
      toast.error('Failed to save pipeline');
    }
  }, [nodes, edges]);
  
  // Callbacks for node and edge changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      console.log('Node changes:', changes);
      
      // Track if any node was resized
      const resizeChanges = changes.filter(change => 
        change.type === 'dimensions' || 
        change.type === 'position'
      );
      
      if (resizeChanges.length > 0) {
        console.log('Node resize or position changes:', resizeChanges);
      }
      
      // Apply changes to nodes and cast the result to ensure type safety
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<FlowNodeData>[]);  
    },
    [setNodes]
  );
  
  const onEdgesChange = useCallback(
    (changes: any) => {
      // Apply edge changes and cast the result to ensure type safety
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds) as Edge[];
        // Log changes to console
        console.log('Edge changes:', changes);
        console.log('Updated edges:', updatedEdges);
        return updatedEdges;
      });
    },
    [setEdges],
  );
  
  // Handle connection between nodes
  const onConnect = useCallback((params: any) => {
    const newEdge = { 
      ...params, 
      id: `edge-${Date.now()}`, 
      animated: false,
      type: 'custom' // Use our custom edge type
    };
    
    setEdges((eds) => {
      const updatedEdges = [...eds, newEdge];
      console.log('New connection created:', newEdge);
      console.log('Updated edges:', updatedEdges);
      return updatedEdges;
    });
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
        } as Node<FlowNodeData>;
        
        // Add the new node to the canvas
        setNodes((nds) => {
          const updatedNodes = [...nds, nodeWithDeleteFunction];
          console.log('Added new node:', nodeWithDeleteFunction);
          console.log('Updated nodes:', updatedNodes);
          return updatedNodes;
        });
      } catch (error) {
        console.error('Error adding node to canvas:', error);
      }
    },
    [reactFlowInstance, onNodeDelete]
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
            {/* <Button 
              variant="default" 
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 shadow-sm transition-colors"
              onClick={savePipeline}
            >
              <Save className="h-3 w-3 mr-1" />
              Save Flow
            </Button> */}
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