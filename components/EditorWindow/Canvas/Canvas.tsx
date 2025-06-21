import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  useReactFlow,
  NodeTypes,
  EdgeTypes,
  NodeProps,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Code2, BarChart3 } from 'lucide-react';
import DynamicCustomNode from './DynamicCustomNode';

interface CanvasProps {
  fileContent: string;
  activePath: string;
}

interface FlowData {
  id: string;
  name: string;
  description: string;
  version: string;
  created: string;
  modified: string;
  author: string;
  config: any;
  nodes: any[];
  edges: any[];
  global_variables?: Record<string, any>;
  shared_imports?: string[];
  execution_history?: any[];
}

// Custom node component for code editor nodes
const CodeEditorNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  return (
    <div className="p-3 border rounded-md shadow-sm bg-white min-w-[250px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4" />
          <div className="font-medium text-sm">{data.title || 'Code Node'}</div>
        </div>
        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
          {data.language || 'python'}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mb-2 line-clamp-2">
        {data.description || 'No description'}
      </div>
      
      <div className="bg-gray-50 p-2 rounded text-xs font-mono max-h-[100px] overflow-y-auto">
        {Array.isArray(data.source) ? data.source.slice(0, 3).join('\n') + (data.source.length > 3 ? '\n...' : '') : data.source || '# No code'}
      </div>
      
      {/* Input handles */}
      {data.inputs && data.inputs.map((input: any, index: number) => (
        <Handle
          key={`input-${input.id || index}`}
          type="target"
          position={Position.Left}
          id={`input-${index + 1}`}
          style={{ top: 10 + (index * 10), background: '#555' }}
          isConnectable={isConnectable}
        />
      ))}
      
      {/* Output handles */}
      {data.outputs && data.outputs.map((output: any, index: number) => (
        <Handle
          key={`output-${output.id || index}`}
          type="source"
          position={Position.Right}
          id={`output-${index + 1}`}
          style={{ top: 10 + (index * 10), background: '#555' }}
          isConnectable={isConnectable}
        />
      ))}
      
      {/* Default handles if no inputs/outputs specified */}
      {(!data.inputs || data.inputs.length === 0) && (
        <Handle
          type="target"
          position={Position.Left}
          id="input-default"
          style={{ background: '#555' }}
          isConnectable={isConnectable}
        />
      )}
      
      {(!data.outputs || data.outputs.length === 0) && (
        <Handle
          type="source"
          position={Position.Right}
          id="output-default"
          style={{ background: '#555' }}
          isConnectable={isConnectable}
        />
      )}
    </div>
  );
};

// Custom node component for visualization nodes
const VisualizationNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  return (
    <div className="p-3 border rounded-md shadow-sm bg-white min-w-[250px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          <div className="font-medium text-sm">{data.title || 'Visualization'}</div>
        </div>
        <div className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
          visualization
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mb-2 line-clamp-2">
        {data.description || 'No description'}
      </div>
      
      <div className="bg-gray-50 p-2 rounded text-xs font-mono h-[100px] flex items-center justify-center">
        [Visualization Preview]
      </div>
      
      {/* Input handles */}
      {data.inputs && data.inputs.map((input: any, index: number) => (
        <Handle
          key={`input-${input.id || index}`}
          type="target"
          position={Position.Left}
          id={`input-${index + 1}`}
          style={{ top: 10 + (index * 10), background: '#555' }}
          isConnectable={isConnectable}
        />
      ))}
      
      {/* Output handles */}
      {data.outputs && data.outputs.map((output: any, index: number) => (
        <Handle
          key={`output-${output.id || index}`}
          type="source"
          position={Position.Right}
          id={`output-${index + 1}`}
          style={{ top: 10 + (index * 10), background: '#555' }}
          isConnectable={isConnectable}
        />
      ))}
      
      {/* Default handles if no inputs/outputs specified */}
      {(!data.inputs || data.inputs.length === 0) && (
        <Handle
          type="target"
          position={Position.Left}
          id="input-default"
          style={{ background: '#555' }}
          isConnectable={isConnectable}
        />
      )}
      
      {(!data.outputs || data.outputs.length === 0) && (
        <Handle
          type="source"
          position={Position.Right}
          id="output-default"
          style={{ background: '#555' }}
          isConnectable={isConnectable}
        />
      )}
    </div>
  );
};

// Custom edge component
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {} }: any) => {
  const edgePath = `M${sourceX},${sourceY} C${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`;

  return (
    <path
      id={id}
      style={style}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd="url(#arrowhead)"
      strokeWidth={2}
      stroke="#555"
    />
  );
};

// Define node types mapping
const nodeTypes: NodeTypes = {
  code_editor: CodeEditorNode,
  visualization: VisualizationNode,
  dynamicCustomNode: DynamicCustomNode,
};

// Define edge types mapping
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

const CanvasContent: React.FC<CanvasProps> = ({ fileContent, activePath }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  
  // Parse flow file content when it changes
  useEffect(() => {
    if (fileContent && activePath.endsWith('.flow')) {
      try {
        const parsedData = JSON.parse(fileContent) as FlowData;
        setFlowData(parsedData);
        
        // Convert flow nodes to ReactFlow nodes
        const flowNodes = parsedData.nodes.map((node) => ({
          id: node.id,
          type: 'dynamicCustomNode', // Always use the dynamic custom node for consistency
          position: node.position,
          data: {
            ...node.data,
            title: node.data.title || 'Untitled Node',
            description: node.data.description || '',
            language: node.data.language || 'python',
            function_name: node.data.function_name || 'function',
            source_code: node.data.source || '# No code',
            inputs: node.data.inputs || [],
            outputs: node.data.outputs || [],
            node_id: node.data.node_id || '',
            tags: node.data.tags || [],
            onNodeDelete: (nodeId: string) => {
              setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            },
          },
        }));
        
        // Convert flow edges to ReactFlow edges
        const flowEdges = parsedData.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: 'custom',
        }));
        
        setNodes(flowNodes);
        setEdges(flowEdges);
        
        console.log('Flow file loaded:', parsedData.name);
      } catch (error) {
        console.error('Failed to parse flow file:', error);
      }
    }
  }, [fileContent, activePath]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowInstance || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Try to get the node data from the drag event
      try {
        const nodeDataStr = event.dataTransfer.getData('application/reactflow');
        if (nodeDataStr) {
          const nodeData = JSON.parse(nodeDataStr);
          console.log('Dropped node data:', nodeData);
          
          // Create a new node with the custom node data
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'dynamicCustomNode', // Always use the dynamic custom node
            position,
            data: {
              title: nodeData.title || 'Custom Node',
              description: nodeData.description || '',
              language: nodeData.language || 'python',
              function_name: nodeData.function_name || 'function',
              source_code: nodeData.code || '# No code',
              inputs: nodeData.inputs || [],
              outputs: nodeData.outputs || [],
              node_id: nodeData.node_id || '',
              tags: nodeData.tags || [],
              onNodeDelete: (nodeId: string) => {
                setNodes((nds) => nds.filter((node) => node.id !== nodeId));
              },
            },
          };
          
          setNodes((nds) => nds.concat(newNode));
        }
      } catch (error) {
        console.error('Error processing dropped node:', error);
      }
    },
    [reactFlowInstance]
  );

  const handleRunAll = useCallback(() => {
    // Implement run all nodes logic
    console.log('Running all nodes');
  }, []);

  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, []);

  const pipelineOps = {
    savePipeline: useCallback(() => {
      // Implement save pipeline logic
      if (flowData) {
        console.log('Saving pipeline:', flowData.name);
        // Here you would implement the actual save logic
      }
    }, [flowData]),
    updateFlowData: useCallback((updatedData: Partial<FlowData>) => {
      setFlowData((prev) => {
        if (!prev) return null;
        return { ...prev, ...updatedData };
      });
    }, []),
  };

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="w-full h-full" ref={reactFlowWrapper}>
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
          <svg>
            <defs>
              <marker
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#555" />
              </marker>
            </defs>
          </svg>
          <Background />
          <Controls />
          {flowData && (
            <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-md text-xs">
              <div className="font-bold">{flowData.name}</div>
              <div className="text-gray-500">{flowData.description}</div>
            </div>
          )}
        </ReactFlow>
      </div>
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