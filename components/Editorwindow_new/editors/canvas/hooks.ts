import { useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { toast } from 'sonner';
import { useTabStore } from '@/components/FileTabs/useTabStore';
import { useEditorContext } from '../../context/EditorContext';
import { generateUniqueNodeId } from './utils';
import { NodeData } from './types';

// Helper function to get default value for data types
const getDefaultValueForType = (dataType: string): any => {
  switch (dataType) {
    case 'string':
      return '';
    case 'int':
      return 0;
    case 'float':
      return 0.0;
    case 'bool':
      return false;
    case 'list':
      return '[]';
    case 'dict':
      return '{}';
    default:
      return '';
  }
};

// Custom hooks for Canvas functionality
export const useCanvasHandlers = (
  tabId: string,
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void,
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void,
  onNodesChange: (changes: any) => void,
  onEdgesChange: (changes: any) => void,
  saveFileContent: () => Promise<void>
) => {
  const { setDirty } = useEditorContext();
  const { updateTab } = useTabStore();

  // Handle node changes with delete functionality and dimension changes
  const handleNodesChange = useCallback((changes: any) => {
    // Check if any dimension changes occurred
    const hasDimensionChange = changes.some((change: any) => 
      change.type === 'dimensions' && change.dimensions
    );
    
    // If there are dimension changes, update the nodes with the new dimensions
    if (hasDimensionChange) {
      changes.forEach((change: any) => {
        if (change.type === 'dimensions' && change.dimensions) {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === change.id) {
                return {
                  ...node,
                  style: {
                    ...node.style,
                    width: change.dimensions.width,
                    height: change.dimensions.height,
                  },
                };
              }
              return node;
            })
          );
        }
      });
    }
    
    onNodesChange(changes);
    setDirty(tabId, true);
    updateTab(tabId, { isDirty: true });
  }, [onNodesChange, tabId, setDirty, updateTab, setNodes]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    setDirty(tabId, true);
    updateTab(tabId, { isDirty: true });
  }, [onEdgesChange, tabId, setDirty, updateTab]);

  // Handle node deletion
  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setDirty(tabId, true);
    updateTab(tabId, { isDirty: true });
    toast.success('Node deleted');
  }, [setNodes, setEdges, tabId, setDirty, updateTab]);

  // Handle drag over event (needed for drop functionality)
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop event from Nodebar
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, reactFlowInstance: any) => {
      event.preventDefault();

      // Get the ReactFlow bounds
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      
      // Try to get the custom node data
      let nodeData: NodeData;
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

      console.log('🎯 Canvas: Drop position:', position);

      // Create a new node with guaranteed unique ID
      const uniqueId = generateUniqueNodeId();
      
      // Check if this is a data type node
      let newNode;
      if (nodeData.type === 'dataType') {
        // Create a data type node
        newNode = {
          id: uniqueId,
          type: 'dataType',
          position,
          data: {
            dataType: nodeData.dataType,
            value: getDefaultValueForType(nodeData.dataType),
            label: nodeData.label || nodeData.dataType
          }
        };
        toast.success(`Added ${nodeData.label || nodeData.dataType} node to canvas`);
      } else {
        // Create a custom code node
        newNode = {
          id: uniqueId,
          type: 'customNode',
          position,
          data: {
            title: nodeData.title || nodeData.name || 'New Node',
            description: nodeData.description || '',
            inputs: nodeData.inputs || [],
            outputs: nodeData.outputs || [],
            language: nodeData.language || 'python',
            function_name: nodeData.function_name || 'function',
            source_code: nodeData.source || nodeData.source_code || '',
            tags: nodeData.tags || [],
            // Store the original node ID for reference if needed
            originalId: nodeData.id || nodeData.node_id
          }
        };
        toast.success(`Added ${nodeData.title || nodeData.name || 'node'} to canvas`);
      }

      // Add the new node to the flow
      setNodes((nds) => nds.concat(newNode));
      
      // Mark as dirty
      setDirty(tabId, true);
      updateTab(tabId, { isDirty: true });
      
      console.log('✅ Canvas: Node added successfully', newNode);
    },
    [setNodes, setDirty, tabId, updateTab]
  );

  // Handle keyboard shortcuts for node/edge operations
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFileContent();
    }
    // Delete selected nodes/edges with Delete key
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selectedNodes = nodes.filter(node => node.selected);
      const selectedEdges = edges.filter(edge => edge.selected);
      
      if (selectedNodes.length > 0 || selectedEdges.length > 0) {
        // Delete selected nodes and their connected edges
        selectedNodes.forEach(node => handleNodeDelete(node.id));
        
        // Delete selected edges
        if (selectedEdges.length > 0) {
          setEdges((eds) => eds.filter((edge) => !edge.selected));
          setDirty(tabId, true);
          updateTab(tabId, { isDirty: true });
          toast.success(`Deleted ${selectedEdges.length} edge(s)`);
        }
      }
    }
  }, [nodes, edges, handleNodeDelete, setEdges, tabId, setDirty, updateTab, saveFileContent]);

  return {
    handleNodesChange,
    handleEdgesChange,
    handleNodeDelete,
    onDragOver,
    onDrop,
    handleKeyDown
  };
};
