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
import { useEditorContext } from '../context/EditorContext';
import { editorAPI } from '../services/EditorAPI';
import { Loader2 } from 'lucide-react';

// Import styles for ReactFlow
import 'reactflow/dist/style.css';

// Define props for the Canvas component
interface CanvasProps {
  tabId: string;
  filePath: string;
}

// Simple node component for workflows
const SimpleNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
      <div className="flex">
        <div className="ml-2">
          <div className="text-lg font-bold">{data.label}</div>
          <div className="text-gray-500">{data.type}</div>
        </div>
      </div>
    </div>
  );
};

// Node types for ReactFlow
const nodeTypes: NodeTypes = {
  simpleNode: SimpleNode,
};

// Canvas content component
const CanvasContent: React.FC<CanvasProps> = ({ tabId, filePath }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { updateContent, setDirty, setSaved, setError: setContextError } = useEditorContext();
  const { updateTab } = useTabStore();

  // Load file content
  const loadFileContent = useCallback(async () => {
    if (!filePath) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📂 Canvas: Loading file content for:', filePath);
      const fileContent = await editorAPI.getFileContent(filePath);
      
      // Parse workflow content
      let workflowData: any = {};
      if (fileContent.content) {
        try {
          workflowData = JSON.parse(fileContent.content);
        } catch (parseError) {
          console.warn('⚠️ Canvas: Could not parse workflow JSON, using empty workflow');
          workflowData = { nodes: [], edges: [] };
        }
      }

      // Convert to ReactFlow format
      const reactFlowNodes = workflowData.nodes || [];
      const reactFlowEdges = workflowData.edges || [];

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
      
      // Update context
      updateContent(tabId, fileContent.content, fileContent.version);
      setSaved(tabId, fileContent.version || 1);
      
      console.log('✅ Canvas: File content loaded successfully');
    } catch (error) {
      console.error('❌ Canvas: Error loading file content:', error);
      setError(error instanceof Error ? error.message : 'Failed to load file');
      setContextError(tabId, 'Failed to load workflow file');
    } finally {
      setIsLoading(false);
    }
  }, [filePath, tabId, updateContent, setSaved, setContextError]);

  // Save file content
  const saveFileContent = useCallback(async () => {
    if (!filePath) return;

    try {
      console.log('💾 Canvas: Saving file content for:', filePath);
      
      // Generate workflow JSON
      const workflowData = {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
        metadata: {
          lastModified: new Date().toISOString(),
          version: '1.0'
        }
      };

      const content = JSON.stringify(workflowData, null, 2);
      
      // Save using new API
      await editorAPI.updateFileContent(filePath, content);
      
      // Update context
      updateContent(tabId, content);
      setSaved(tabId, 1); // Set version to 1 after successful save
      setDirty(tabId, false);
      updateTab(tabId, { isDirty: false });
      
      toast.success('Workflow saved successfully');
      console.log('✅ Canvas: File saved successfully');
    } catch (error) {
      console.error('❌ Canvas: Error saving file:', error);
      toast.error('Failed to save workflow');
      setContextError(tabId, 'Failed to save workflow file');
    }
  }, [filePath, tabId, nodes, edges, updateContent, setSaved, setDirty, updateTab, setContextError]);

  // Load file on mount
  useEffect(() => {
    loadFileContent();
  }, [loadFileContent]);

  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge(params, edges);
      setEdges(newEdge);
      setDirty(tabId, true);
      updateTab(tabId, { isDirty: true });
    },
    [edges, setEdges, tabId, setDirty, updateTab]
  );

  // Handle node changes
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    setDirty(tabId, true);
    updateTab(tabId, { isDirty: true });
  }, [onNodesChange, tabId, setDirty, updateTab]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    setDirty(tabId, true);
    updateTab(tabId, { isDirty: true });
  }, [onEdgesChange, tabId, setDirty, updateTab]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFileContent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFileContent]);

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
          <button
            onClick={loadFileContent}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
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
