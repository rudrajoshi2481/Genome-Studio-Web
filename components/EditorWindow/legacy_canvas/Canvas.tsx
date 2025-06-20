"use client"

import React, { useState, useCallback, useEffect } from 'react';
import { useAuthToken } from '@/lib/stores/auth-store';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  ReactFlowProvider,
  ReactFlowInstance,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFileExplorerStore } from '../../Sidebar/FileExplorer/utils/store'
import DynamicCustomNode from './DynamicCustomNode'
import { createFlowNodeFromCustomNode, FlowNodeData } from '@/lib/utils/node-utils'
import { usePipeline } from './hooks/usePipeline';
import { useCanvasWebSocket } from './hooks/useCanvasWebSocket';
import { usePipelineOperations } from './hooks/usePipelineOperations';
import { CanvasProps, PipelineMetadata, DataProcessingPipeline } from './types';
import CustomEdge from './components/CustomEdge'
import MetadataDialog from './components/MetadataDialog'
import CanvasToolbar from './components/CanvasToolbar'

const nodeTypes = {
  dynamicCustomNode: DynamicCustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const initialNodes: Node<FlowNodeData>[] = [];
const initialEdges: Edge[] = [];

const CanvasContent: React.FC<CanvasProps> = ({ fileContent, activePath }) => {
  const authToken = useAuthToken();
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  
  const { activePath: storeActivePath } = useFileExplorerStore();
  const currentActivePath = activePath || storeActivePath;
  
  const [pipelineMetadata, setPipelineMetadata] = useState<PipelineMetadata>({
    id: "flow_001",
    name: "Data Processing Pipeline",
    description: "A flow for data processing and visualization"
  });

  const handlePipelineUpdate = useCallback((updatedPipeline: DataProcessingPipeline) => {
    setPipelineMetadata(prev => {
      const newMetadata = {
        id: updatedPipeline.id || "New Flow",
        name: updatedPipeline.name || "Data Processing Pipeline", 
        description: updatedPipeline.description || "A flow for data processing and visualization",
        version: updatedPipeline.version,
        created: updatedPipeline.created,
        modified: updatedPipeline.modified,
        author: updatedPipeline.author
      };
      
      if (JSON.stringify(prev) !== JSON.stringify(newMetadata)) {
        return newMetadata;
      }
      return prev;
    });
  }, []);

  const handleMetadataUpdate = useCallback((metadata: PipelineMetadata) => {
    setPipelineMetadata(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(metadata)) {
        return metadata;
      }
      return prev;
    });
  }, []);

  const handlePartialPipelineUpdate = useCallback((pipeline: Partial<DataProcessingPipeline>) => {
    if (pipeline.id) {
      handlePipelineUpdate(pipeline as DataProcessingPipeline);
    }
  }, [handlePipelineUpdate]);

  const { pipelineLoaded, pipelineData } = usePipeline({
    fileContent,
    onNodesChange: setNodes,
    onEdgesChange: setEdges,
    onMetadataChange: handleMetadataUpdate,
    onPipelineDataChange: handlePartialPipelineUpdate,
  });

  const { isConnected } = useCanvasWebSocket({
    activePath: currentActivePath,
    authToken,
    onMetadataUpdate: handleMetadataUpdate,
    onPipelineUpdate: handlePartialPipelineUpdate,
    onNodesUpdate: setNodes,
    onEdgesUpdate: setEdges
  });

  const pipelineOps = usePipelineOperations({
    nodes,
    edges,
    metadata: pipelineMetadata,
    activePath: currentActivePath,
    authToken,
    pipelineData: pipelineData || undefined,
    onPipelineUpdate: handlePipelineUpdate
  });

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<FlowNodeData>[]);
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = { 
        ...connection, 
        type: 'custom',
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        animated: false,
        data: { label: `${connection.sourceHandle} → ${connection.targetHandle}` }
      } as Edge;
      
      setEdges((eds) => addEdge(edge, eds));
    },
    []
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const nodeData = event.dataTransfer.getData('application/reactflow');
      
      if (!nodeData || !reactFlowInstance) return;
      
      try {
        const customNode = JSON.parse(nodeData);
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        
        const newNode = createFlowNodeFromCustomNode(customNode, position);
        const nodeWithDeleteFunction = {
          ...newNode,
          data: {
            ...newNode.data,
          }
        } as Node<FlowNodeData>;
        
        setNodes((nds) => [...nds, nodeWithDeleteFunction]);
      } catch (error) {
        console.error('Error adding node:', error);
      }
    },
    [reactFlowInstance]
  );

  // Toolbar handlers
  const handleRunAll = useCallback(() => {
    // Add logic to run all nodes here
  }, []);

  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, []);
  
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
        <CanvasToolbar
          nodes={nodes}
          onRunAll={handleRunAll}
          onEditMetadata={() => setMetadataDialogOpen(true)}
          onSavePipeline={pipelineOps.savePipeline}
          onClearCanvas={handleClearCanvas}
        />
      </ReactFlow>

      <MetadataDialog
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
        metadata={pipelineMetadata}
        onSave={pipelineOps.updateMetadata}
      />
    </div>
  );
}

const Canvas: React.FC<CanvasProps> = ({ fileContent, activePath }) => {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <CanvasContent fileContent={fileContent} activePath={activePath} />
      </div>
    </ReactFlowProvider>
  );
};

export default Canvas;


// "use client"

// import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// import { useAuthToken } from '@/lib/stores/auth-store';
// import { 
//   ReactFlow, 
//   Background, 
//   Controls, 
//   ReactFlowProvider,
//   ReactFlowInstance,
//   Node,
//   Edge,
//   NodeChange,
//   EdgeChange,
//   Connection,
//   applyNodeChanges,
//   applyEdgeChanges,
//   addEdge,
//   NodePositionChange
// } from '@xyflow/react'
// import '@xyflow/react/dist/style.css'
// import { useFileExplorerStore } from '../../Sidebar/FileExplorer/utils/store'
// import DynamicCustomNode from './DynamicCustomNode'
// import { createFlowNodeFromCustomNode, FlowNodeData } from '@/lib/utils/node-utils'
// import { usePipeline } from './hooks/usePipeline';
// import { useCanvasWebSocket } from './hooks/useCanvasWebSocket';
// import { usePipelineOperations } from './hooks/usePipelineOperations';
// import { CanvasProps, PipelineMetadata, DataProcessingPipeline } from './types';
// import CustomEdge from './components/CustomEdge'
// import MetadataDialog from './components/MetadataDialog'
// import CanvasToolbar from './components/CanvasToolbar'
// import { debugAuth, debugFilePath } from './utils/debugAuth'
// import { toast } from 'sonner'

// // Extracted components and hooks

// // Define node and edge types for React Flow
// const nodeTypes = {
//   dynamicCustomNode: DynamicCustomNode,
// };

// const edgeTypes = {
//   custom: CustomEdge,
// };

// // Initial empty state
// const initialNodes: Node<FlowNodeData>[] = [];
// const initialEdges: Edge[] = [];

// // Inner Canvas component with access to React Flow hooks
// const CanvasContent: React.FC<CanvasProps> = ({ fileContent, activePath }) => {
//   // Get authentication token
//   const authToken = useAuthToken();
  
//   // State for nodes and edges
//   const [nodes, setNodes] = useState<Node<FlowNodeData>[]>(initialNodes);
//   const [edges, setEdges] = useState<Edge[]>(initialEdges);
  
//   // Refs for debouncing timeouts
//   const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const edgeSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const connectSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
//   // Get file explorer state
//   const { activePath: storeActivePath, rootPath } = useFileExplorerStore();
  
//   // Use the activePath prop if provided, otherwise fall back to store
//   const currentActivePath = activePath || storeActivePath;
  
//   // Debug logging
//   useEffect(() => {
//     console.log('Canvas Debug Info:', {
//       authToken: !!authToken,
//       activePath,
//       storeActivePath,
//       currentActivePath,
//     });
//   }, [authToken, currentActivePath]);
  
//   // State for pipeline metadata
//   const [pipelineMetadata, setPipelineMetadata] = useState<PipelineMetadata>({
//     id: "flow_001",
//     name: "Data Processing Pipeline",
//     description: "A flow for data processing and visualization"
//   });
  
//   // Dialog state
//   const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  
//   // Reference to the React Flow instance
//   const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
//   // Memoize the pipeline update handler to prevent unnecessary re-renders
//   const handlePipelineUpdate = useCallback((updatedPipeline: DataProcessingPipeline) => {
//     console.log('Pipeline updated:', updatedPipeline);
//     // Only update if pipeline actually changed
//     setPipelineMetadata(prev => {
//       const newMetadata = {
//         id: updatedPipeline.id || "New Flow",
//         name: updatedPipeline.name || "Data Processing Pipeline", 
//         description: updatedPipeline.description || "A flow for data processing and visualization",
//         version: updatedPipeline.version,
//         created: updatedPipeline.created,
//         modified: updatedPipeline.modified,
//         author: updatedPipeline.author
//       };
      
//       // Only update if metadata actually changed
//       if (JSON.stringify(prev) !== JSON.stringify(newMetadata)) {
//         return newMetadata;
//       }
//       return prev;
//     });
//   }, []);

//   // Separate handlers for metadata and pipeline data
//   const handleMetadataUpdate = useCallback((metadata: PipelineMetadata) => {
//     setPipelineMetadata(prev => {
//       if (JSON.stringify(prev) !== JSON.stringify(metadata)) {
//         return metadata;
//       }
//       return prev;
//     });
//   }, []);

//   const handlePartialPipelineUpdate = useCallback((pipeline: Partial<DataProcessingPipeline>) => {
//     if (pipeline.id) {
//       handlePipelineUpdate(pipeline as DataProcessingPipeline);
//     }
//   }, [handlePipelineUpdate]);

//   // Use the pipeline hook with proper callbacks
//   const { pipelineLoaded, pipelineData, reloadPipeline } = usePipeline({
//     fileContent,
//     onNodesChange: setNodes,
//     onEdgesChange: setEdges,
//     onMetadataChange: handleMetadataUpdate,
//     onPipelineDataChange: handlePartialPipelineUpdate,
//   });

//   // Memoize WebSocket connection to prevent reconnections
//   const webSocketProps = useMemo(() => ({
//     activePath: currentActivePath,
//     authToken,
//     onMetadataUpdate: handleMetadataUpdate,
//     onPipelineUpdate: handlePartialPipelineUpdate,
//     onNodesUpdate: setNodes,
//     onEdgesUpdate: setEdges
//   }), [currentActivePath, authToken, handleMetadataUpdate, handlePartialPipelineUpdate]);

//   // Use WebSocket with memoized props
//   const { isConnected } = useCanvasWebSocket(webSocketProps);

//   // Memoize pipeline operations with all required parameters and ensure we're passing the current edges state
//   const pipelineOps = usePipelineOperations({
//     nodes,
//     edges,
//     metadata: pipelineMetadata,
//     activePath: currentActivePath,
//     authToken,
//     pipelineData: pipelineData || undefined,
//     onPipelineUpdate: handlePipelineUpdate
//   });

//   // Cleanup timeout on unmount
//   useEffect(() => {
//     return () => {
//       if (connectSaveTimeoutRef.current) {
//         clearTimeout(connectSaveTimeoutRef.current);
//       }
//     };
//   }, []);

//   // Debug authentication and file path
//   useEffect(() => {
//     debugAuth();
//     debugFilePath(activePath, storeActivePath);
    
//     // Show warning if no active path is available
//     if (!currentActivePath) {
//       console.warn('No active file path available. Pipeline saving will not work.');
//       toast.warning('No active file selected. Please open a pipeline file first.');
//     }
//   }, [authToken, currentActivePath]);

//   // Callbacks for node and edge changes
//   const onNodesChange = useCallback(
//     (changes: NodeChange[]) => {
//       setNodes((nds) => {
//         const updatedNodes = applyNodeChanges(changes, nds) as Node<FlowNodeData>[];
//         return updatedNodes;
//       });
//     },
//     [setNodes]
//   );

//   const onEdgesChange = useCallback(
//     (changes: EdgeChange[]) => {
//       setEdges((eds) => applyEdgeChanges(changes, eds));
//     },
//     [setEdges]
//   );

//   const onConnect = useCallback(
//     (connection: Connection) => {
//       // Ensure the edge has all required properties
//       const edge: Edge = { 
//         ...connection, 
//         type: 'custom', // Ensure type is always set
//         id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
//         animated: false,
//         data: { label: `${connection.sourceHandle} → ${connection.targetHandle}` }
//       } as Edge;
      
//       console.log('Creating new edge connection:', edge);
      
//       // Add the edge to the state
//       setEdges((eds) => {
//         const newEdges = addEdge(edge, eds);
//         console.log('Updated edges after connection:', newEdges);
//         return newEdges;
//       });
      
//       toast.success('Connection created', { duration: 1000 });
//     },
//     [setEdges]
//   );

//   const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
//     // Remove the edge from UI
//     setEdges((eds) => eds.filter((e) => e.id !== edge.id));
//     toast.success('Connection removed', { duration: 1000 });
//   }, [setEdges]);

//   const onDragOver = useCallback((event: React.DragEvent) => {
//     event.preventDefault();
//     event.dataTransfer.dropEffect = 'move';
//   }, []);

//   const onDrop = useCallback(
//     (event: React.DragEvent) => {
//       event.preventDefault();
      
//       // Get the custom node data from the drag event
//       const nodeData = event.dataTransfer.getData('application/reactflow');
      
//       if (!nodeData || !reactFlowInstance) {
//         return;
//       }
      
//       try {
//         // Parse the node data
//         const customNode = JSON.parse(nodeData);
        
//         // Get the position where the node was dropped
//         const position = reactFlowInstance.screenToFlowPosition({
//           x: event.clientX,
//           y: event.clientY,
//         });
        
//         // Create a new React Flow node from the custom node
//         const newNode = createFlowNodeFromCustomNode(customNode, position);
        
//         // Create a new node
//         const nodeWithDeleteFunction = {
//           ...newNode,
//           data: {
//             ...newNode.data,
//           }
//         } as Node<FlowNodeData>;
        
//         // Add the new node to the canvas
//         setNodes((nds) => {
//           const updatedNodes = [...nds, nodeWithDeleteFunction];
//           console.log('Added new node:', nodeWithDeleteFunction);
//           console.log('Updated nodes:', updatedNodes);
//           return updatedNodes;
//         });
//       } catch (error) {
//         console.error('Error adding node to canvas:', error);
//       }
//     },
//     [reactFlowInstance]
//   );

//   // Toolbar handlers
//   const handleRunAll = useCallback(() => {
//     // Add logic to run all nodes here
//   }, []);

//   const handleClearCanvas = useCallback(() => {
//     setNodes([]);
//     setEdges([]);
//   }, [setNodes, setEdges]);
  
//   return (
//     <div className="flex flex-col h-full">
//       <ReactFlow
//         nodes={nodes}
//         edges={edges}
//         onNodesChange={onNodesChange}
//         onEdgesChange={onEdgesChange}
//         onConnect={onConnect}
//         onInit={setReactFlowInstance}
//         onDrop={onDrop}
//         onDragOver={onDragOver}
//         onEdgeClick={onEdgeClick}
//         nodeTypes={nodeTypes}
//         edgeTypes={edgeTypes}
//         defaultEdgeOptions={{ type: 'custom' }}
//         fitView
//       >
//         <Background />
//         <Controls />
//         <CanvasToolbar
//           nodes={nodes}
//           onRunAll={handleRunAll}
//           onEditMetadata={() => setMetadataDialogOpen(true)}
//           onSavePipeline={pipelineOps.savePipeline}
//           onClearCanvas={handleClearCanvas}
//         />
//       </ReactFlow>

//       <MetadataDialog
//         open={metadataDialogOpen}
//         onOpenChange={setMetadataDialogOpen}
//         metadata={pipelineMetadata}
//         onSave={pipelineOps.updateMetadata}
//       />
//     </div>
//   );
// }

// // Main Canvas component that wraps everything with ReactFlowProvider
// const Canvas: React.FC<CanvasProps> = ({ fileContent, activePath }) => {
//   return (
//     <ReactFlowProvider>
//       <div style={{ width: '100%', height: '100%' }}>
//         <CanvasContent fileContent={fileContent} activePath={activePath} />
//       </div>
//     </ReactFlowProvider>
//   );
// };

// export default Canvas;
