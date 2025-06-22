"use client"
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as authService from '@/lib/services/auth-service';
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
  NodeTypes,
  EdgeTypes,
  NodeProps,
  Handle,
  Position,
  Panel,
  MiniMap,
  BackgroundVariant,
} from 'reactflow';
import { RefreshCw, Save } from 'lucide-react';
import 'reactflow/dist/style.css';
import { Code2, BarChart3 } from 'lucide-react';
import DynamicCustomNode from './DynamicCustomNode';

// Define props for the Canvas component
interface CanvasProps {
  fileContent: string;
  activePath: string;
  onContentChange?: (content: string) => void;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
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
        {Array.isArray(data.source) ? data.source.slice(0, 3).join('\n') + (data.source.length > 3 ? '\n...' : '') : (data.source || '# No code')}
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        id="input-default"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="output-default"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
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
      
      <Handle
        type="target"
        position={Position.Left}
        id="input-default"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="output-default"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

// Custom edge component
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {} }: any) => {
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

// Define node types mapping - moved outside component to avoid React Flow warnings
const nodeTypes: NodeTypes = {
  code_editor: CodeEditorNode,
  visualization: VisualizationNode,
  dynamicCustomNode: DynamicCustomNode,
};

// Define edge types mapping - moved outside component to avoid React Flow warnings
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Function to ensure proper file extension
const ensureFlowExtension = (filePath: string): string => {
  if (!filePath.endsWith('.flow')) {
    return `${filePath}.flow`;
  }
  return filePath;
};

// Function to clean malformed JSON content
const cleanJsonContent = (content: string): string => {
  try {
    // Remove the malformed "..." pattern from JSON
    let cleanContent = content.replace(/,\s*\.\.\.\s*/g, ',');
    cleanContent = cleanContent.replace(/\.\.\./g, '');
    
    // Fix trailing commas before closing brackets/braces
    cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix unquoted property names (basic cases)
    cleanContent = cleanContent.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    return cleanContent;
  } catch (error) {
    console.error('Error cleaning JSON content:', error);
    return content;
  }
};

// Function to normalize node/edge IDs to fix mismatches
const normalizeIds = (data: any): any => {
  if (!data) return data;
  
  // Create ID mapping from hyphens to underscores and vice versa
  const nodeIdMap: Record<string, string> = {};
  
  // First pass: collect all node IDs and create mapping
  if (data.nodes) {
    data.nodes.forEach((node: any) => {
      if (node.id) {
        const normalizedId = node.id.replace(/-/g, '_');
        nodeIdMap[node.id] = normalizedId;
        nodeIdMap[node.id.replace(/_/g, '-')] = normalizedId; // Also map hyphen version
        node.id = normalizedId;
      }
    });
  }
  
  // Second pass: update edge references and normalize edge IDs
  if (data.edges) {
    data.edges = data.edges.filter((edge: any) => {
      // Normalize edge source and target
      if (edge.source) {
        const normalizedSource = edge.source.replace(/-/g, '_');
        edge.source = normalizedSource;
      }
      if (edge.target) {
        const normalizedTarget = edge.target.replace(/-/g, '_');
        edge.target = normalizedTarget;
      }
      
      // Normalize edge ID
      if (edge.id) {
        edge.id = edge.id.replace(/-/g, '_');
      }
      
      // Only keep edges that reference existing nodes
      return data.nodes.some((node: any) => node.id === edge.source) && 
             data.nodes.some((node: any) => node.id === edge.target);
    });
  }
  
  return data;
};

// Function to validate JSON structure
const validateFlowData = (data: any): boolean => {
  try {
    // Check required top-level properties
    if (!data || typeof data !== 'object') {
      console.error('Flow data must be an object');
      return false;
    }
    
    if (!data.nodes || !Array.isArray(data.nodes)) {
      console.error('Flow data must have a nodes array');
      return false;
    }
    
    if (!data.edges || !Array.isArray(data.edges)) {
      console.warn('Flow data should have an edges array, using empty array');
      data.edges = [];
    }
    
    // Validate each node has required properties
    for (const node of data.nodes) {
      if (!node.id || typeof node.id !== 'string') {
        console.error('Each node must have a string id');
        return false;
      }
    }
    
    // Validate each edge has required properties
    for (const edge of data.edges) {
      if (!edge.id || !edge.source || !edge.target) {
        console.error('Each edge must have id, source, and target');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating flow data:', error);
    return false;
  }
};

// Function to save file content using the same API as file-content-store
const saveFileToServer = async (filePath: string, content: string): Promise<boolean> => {
  try {
    // Ensure the file has the correct extension
    const normalizedPath = ensureFlowExtension(filePath);
    
    // Get the root path from the file path
    const pathParts = normalizedPath.split('/');
    const rootPath = pathParts.slice(0, -1).join('/');
    
    // Get auth token
    const token = authService.getToken();
    
    if (!token) {
      console.error('No authentication token available');
      return false;
    }
    
    // Validate JSON before saving
    try {
      const parsedContent = JSON.parse(content);
      if (!validateFlowData(parsedContent)) {
        console.error('Invalid flow data structure, cannot save');
        return false;
      }
    } catch (jsonError) {
      console.error('Invalid JSON content, cannot save:', jsonError);
      return false;
    }
    
    const response = await fetch(`http://localhost:8000/api/v1/file-explorer/update-file-content?root_path=${encodeURIComponent(rootPath)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        path: normalizedPath,
        content: content,
        base_content: content
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to update file content: ${response.status} ${response.statusText}`, errorText);
      return false;
    }
    
    console.log('File saved successfully:', normalizedPath);
    return true;
  } catch (error) {
    console.error('Error saving file:', error);
    return false;
  }
};

// Convert pipeline nodes to ReactFlow nodes
const convertToFlowNodes = (pipelineNodes: any[]): Node[] => {
  return pipelineNodes.map((node, index) => ({
    id: node.id || `node_${index}`,
    type: 'dynamicCustomNode',
    position: node.position || { x: 100 + (index * 300), y: 100 },
    data: {
      title: node.data?.title || `Node ${index + 1}`,
      description: node.data?.description || '',
      language: node.data?.language || 'python',
      source: Array.isArray(node.data?.source) 
        ? node.data.source.join('\n') 
        : (node.data?.source || '# No code'),
      inputs: Array.isArray(node.data?.inputs) ? node.data.inputs : [],
      outputs: Array.isArray(node.data?.outputs) ? node.data.outputs : [],
      status: node.data?.status || 'idle',
      execution_count: node.data?.execution_count || 0,
    },
  }));
};

// Convert pipeline edges to ReactFlow edges
const convertToFlowEdges = (pipelineEdges: any[]): Edge[] => {
  return pipelineEdges.map((edge, index) => ({
    id: edge.id || `edge_${index}`,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || 'output-default',
    targetHandle: edge.targetHandle || 'input-default',
    type: edge.type || 'custom',
  })).filter(edge => edge.source && edge.target); // Filter out invalid edges
};

// Convert ReactFlow nodes back to pipeline format
const convertToPipelineNodes = (flowNodes: Node[]): any[] => {
  return flowNodes.map((node) => ({
    id: node.id,
    type: node.type || 'code_editor',
    position: node.position,
    data: {
      title: node.data?.title || 'Untitled Node',
      description: node.data?.description || '',
      language: node.data?.language || 'python',
      source: typeof node.data?.source === 'string' ? node.data.source.split('\n') : ['# No code'],
      inputs: node.data?.inputs || [],
      outputs: node.data?.outputs || [],
      status: node.data?.status || 'idle',
      execution_count: node.data?.execution_count || 0,
      execution_timing: node.data?.execution_timing || null,
      logs: node.data?.logs || [],
      errors: node.data?.errors || [],
      warnings: node.data?.warnings || [],
      stdout: node.data?.stdout || [],
      stderr: node.data?.stderr || [],
      metadata: {
        tags: node.data?.metadata?.tags || [],
        author: node.data?.metadata?.author || '',
        created: node.data?.metadata?.created || new Date().toISOString(),
        modified: new Date().toISOString(),
        notes: node.data?.metadata?.notes || '',
        collapsed: node.data?.metadata?.collapsed || false,
        pinned: node.data?.metadata?.pinned || false,
        version: node.data?.metadata?.version || 1,
        dependencies: node.data?.metadata?.dependencies || null,
        environment: node.data?.metadata?.environment || 'default'
      },
      ui: node.data?.ui || {
        color: '#3b82f6',
        icon: 'code',
        width: 300,
        height: 200,
        theme: 'auto',
        font_size: 14,
        show_line_numbers: true
      },
      dependencies: node.data?.dependencies || [],
      config: node.data?.config || {
        timeout: 30,
        memory_limit: 512,
        cpu_limit: 50,
        auto_run: false,
        cache_results: true
      }
    },
    draggable: true,
    selectable: true,
    deletable: true,
    hidden: false,
    selected: false
  }));
};

// Convert ReactFlow edges back to pipeline format
const convertToPipelineEdges = (flowEdges: Edge[]): any[] => {
  return flowEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || '',
    targetHandle: edge.targetHandle || '',
    type: edge.type,
  }));
};

const CanvasContent: React.FC<CanvasProps> = ({ fileContent, activePath, onContentChange }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Handle drag over for node dropping
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle connection between nodes - NO AUTO-SAVE
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      setHasUnsavedChanges(true);
    },
    [edges, setEdges]
  );

  // Handle dropping nodes onto the canvas - NO AUTO-SAVE
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowInstance || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      try {
        const nodeDataStr = event.dataTransfer.getData('application/reactflow');
        if (nodeDataStr) {
          const nodeData = JSON.parse(nodeDataStr);
          
          const newNode = {
            id: `node_${Date.now()}`,
            type: 'dynamicCustomNode',
            position,
            data: {
              title: nodeData.title || 'Custom Node',
              description: nodeData.description || '',
              language: nodeData.language || 'python',
              source: nodeData.code || '# No code',
              inputs: nodeData.inputs || [],
              outputs: nodeData.outputs || [],
            },
          };
          
          const newNodes = [...nodes, newNode];
          setNodes(newNodes);
          setHasUnsavedChanges(true);
        }
      } catch (error) {
        console.error('Error processing dropped node:', error);
      }
    },
    [reactFlowInstance, nodes, setNodes]
  );

  // Parse flow file content when it changes
  useEffect(() => {
    if (!fileContent || !activePath.endsWith('.flow')) {
      return;
    }
    
    try {
      if (!fileContent.trim()) {
        console.warn('Empty file content');
        return;
      }
      
      // Clean the content to remove malformed JSON parts
      const cleanContent = cleanJsonContent(fileContent);
      
      const parsedData = JSON.parse(cleanContent);
      
      // Validate the parsed data
      if (!validateFlowData(parsedData)) {
        console.error('Invalid flow data structure');
        return;
      }
      
      // Normalize IDs to fix node/edge mismatches
      const normalizedData = normalizeIds(parsedData);
      
      const flowNodes = convertToFlowNodes(normalizedData.nodes);
      const flowEdges = convertToFlowEdges(normalizedData.edges);
      
      const flowDataObj: FlowData = {
        id: normalizedData.id || 'flow_001',
        name: normalizedData.name || 'Untitled Flow',
        description: normalizedData.description || '',
        version: normalizedData.version || '1.0.0',
        created: normalizedData.created || new Date().toISOString(),
        modified: normalizedData.modified || new Date().toISOString(),
        author: normalizedData.author || '',
        config: normalizedData.config || {},
        nodes: normalizedData.nodes,
        edges: normalizedData.edges,
        global_variables: normalizedData.global_variables || {},
        shared_imports: normalizedData.shared_imports || [],
        execution_history: normalizedData.execution_history || []
      };
      
      setFlowData(flowDataObj);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setHasUnsavedChanges(false);
      
      console.log('Flow file loaded successfully:', flowDataObj.name);
    } catch (error) {
      console.error('Failed to parse flow file:', error);
      console.error('File content preview:', fileContent.substring(0, 500) + '...');
      
      // Try to provide more specific error information
      if (error instanceof SyntaxError) {
        const match = error.message.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const beforeError = fileContent.substring(Math.max(0, position - 100), position);
          const afterError = fileContent.substring(position, position + 100);
          console.error('Error context:', { beforeError, afterError });
        }
      }
    }
  }, [fileContent, activePath, setNodes, setEdges]);

  // Handle edge deletion - NO AUTO-SAVE
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      const newEdges = edges.filter((e) => e.id !== edge.id);
      setEdges(newEdges);
      setHasUnsavedChanges(true);
    },
    [edges, setEdges]
  );

  // Handle node changes - NO AUTO-SAVE
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      setHasUnsavedChanges(true);
    },
    [onNodesChange]
  );

  // Handle edge changes - NO AUTO-SAVE
  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      setHasUnsavedChanges(true);
    },
    [onEdgesChange]
  );

  // Save pipeline - ONLY MANUAL SAVE
  const savePipeline = useCallback(async () => {
    if (flowData && activePath) {
      try {
        const updatedFlowData = {
          ...flowData,
          nodes: convertToPipelineNodes(nodes),
          edges: convertToPipelineEdges(edges),
          modified: new Date().toISOString()
        };
        
        // Ensure the data is valid before saving
        if (!validateFlowData(updatedFlowData)) {
          console.error('Invalid flow data, cannot save');
          return;
        }
        
        const content = JSON.stringify(updatedFlowData, null, 2);
        const success = await saveFileToServer(activePath, content);
        
        if (success) {
          console.log('Pipeline saved successfully');
          setHasUnsavedChanges(false);
          if (onContentChange) {
            onContentChange(content);
          }
        } else {
          console.error('Failed to save pipeline');
        }
      } catch (error) {
        console.error('Error saving pipeline:', error);
      }
    }
  }, [flowData, activePath, nodes, edges, onContentChange]);
  
  return (
    <div className="flex flex-col h-full">
      <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-right"
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap />
          <Panel position="top-left">
            {flowData && (
              <div className="bg-white p-2 rounded shadow-md text-xs">
                <div className="font-bold">{flowData.name || 'Untitled Flow'}</div>
                <div className="text-gray-500">{flowData.description || ''}</div>
                {hasUnsavedChanges && (
                  <div className="text-orange-600 text-xs mt-1">• Unsaved changes</div>
                )}
              </div>
            )}
          </Panel>
          
          <Panel position="top-right">
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">
                {activePath} ({nodes.length} nodes, {edges.length} edges)
              </div>
              <button 
                onClick={savePipeline}
                className={`${hasUnsavedChanges ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} text-white p-1 rounded-full shadow-md flex items-center justify-center`}
                title={hasUnsavedChanges ? "Save Pipeline (Unsaved Changes)" : "Save Pipeline"}
                style={{ width: '24px', height: '24px' }}
              >
                <Save size={12} />
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-full shadow-md flex items-center justify-center"
                title="Refresh Flow"
                style={{ width: '24px', height: '24px' }}
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

const Canvas = React.memo((props: CanvasProps) => {
  const { activePath } = props;
  
  return (
    <div className="canvas-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlowProvider key={activePath}>
        <CanvasContent {...props} />
      </ReactFlowProvider>
    </div>
  );
});

export { Canvas };
