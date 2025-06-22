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
  Handle,
  Position,
  Panel,
  MiniMap,
  BackgroundVariant,
} from 'reactflow';
import { RefreshCw, Save, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import 'reactflow/dist/style.css';
import { Code2, BarChart3 } from 'lucide-react';
import DynamicCustomNode from './DynamicCustomNode';
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  parsePipelineFile,
  createDefaultFlow,
  convertToFlowNodes,
  convertToFlowEdges,
  convertToPipelineNodes,
  convertToPipelineEdges,
  ensureFlowExtension,
  validateFlowData,
  cleanJsonContent,
  normalizeIds
} from './utils/fileParser';
import { PipelineFile } from './types/pipeline';

// Define props for the Canvas component
interface CanvasProps {
  fileContent: string;
  activePath: string;
  onContentChange: (content: string) => void;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
}

// Memoize node types outside the component to prevent React Flow warnings
const nodeTypes: NodeTypes = {
  dynamicNode: DynamicCustomNode,
  code_editor: DynamicCustomNode, // Add code_editor node type
  visualization: DynamicCustomNode, // Add visualization node type
};

// Memoize edge types outside the component
const edgeTypes: EdgeTypes = {};

// Canvas content component
const CanvasContent: React.FC<CanvasProps> = ({ fileContent, activePath, onContentChange }) => {
  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Flow data state
  const [flowData, setFlowData] = useState<PipelineFile | null>(null);
  
  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Save loading state
  const [isSaving, setIsSaving] = useState(false);

  // Parse flow file content when it changes
  useEffect(() => {
    if (!fileContent) return;
    
    try {
      // Show loading toast
    //   toast.loading('Loading pipeline...');
      
      // Clean and parse JSON content
      const cleanContent = cleanJsonContent(fileContent);
      const parsedData = JSON.parse(cleanContent);
      
      // Validate flow data structure
      if (!validateFlowData(parsedData)) {
        toast.error('Invalid flow data structure');
        console.error('Invalid flow data structure');
        return;
      }
      
      // Normalize IDs in the flow data
      const normalizedData = normalizeIds(parsedData);
      
      // Convert to React Flow nodes and edges
      const flowNodes = convertToFlowNodes(normalizedData.nodes);
      const flowEdges = convertToFlowEdges(normalizedData.edges);
      
      // Update state
      setFlowData(normalizedData);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setHasUnsavedChanges(false);
      
      // Show success toast and dismiss loading toast
      toast.success('Pipeline loaded successfully');
      toast.dismiss();
    } catch (error) {
      // Show error toast
      toast.error(`Failed to parse flow file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Failed to parse flow file:', error);
      
      // Create default flow on parse error
      const defaultFlow = createDefaultFlow();
      setFlowData(defaultFlow);
      setNodes(convertToFlowNodes(defaultFlow.nodes));
      setEdges(convertToFlowEdges(defaultFlow.edges));
    }
  }, [fileContent, activePath]); // Add activePath to dependencies to ensure reloading when switching files

  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      // Create a unique ID for the new edge
      const newEdge = {
        ...connection,
        id: `edge_${connection.source}_${connection.sourceHandle}_${connection.target}_${connection.targetHandle}`,
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges]
  );

  // Handle node deletion
  const onNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setHasUnsavedChanges(true);
    },
    [setNodes, setEdges]
  );

  // Save pipeline to server
  const savePipeline = useCallback(async () => {
    if (!flowData) return;
    
    try {
      setIsSaving(true);
      
      // Show saving toast
      toast.loading('Saving pipeline...');
      
      // Update flow data with current nodes and edges
      const updatedFlowData = {
        ...flowData,
        nodes: convertToPipelineNodes(nodes),
        edges: convertToPipelineEdges(edges),
        modified: new Date().toISOString(),
      };
      
      // Validate flow data before saving
      if (!validateFlowData(updatedFlowData)) {
        toast.error('Invalid flow data structure');
        console.error('Invalid flow data structure');
        setIsSaving(false);
        return;
      }
      
      // Convert to JSON string
      const content = JSON.stringify(updatedFlowData, null, 2);
      
      // Save to server
      const success = await saveFileToServer(activePath, content);
      
      if (success) {
        // Update content in parent component
        onContentChange(content);
        setHasUnsavedChanges(false);
        toast.success('Pipeline saved successfully');
      } else {
        toast.error('Failed to save pipeline');
      }
    } catch (error) {
      toast.error(`Error saving pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error saving pipeline:', error);
    } finally {
      setIsSaving(false);
    }
  }, [flowData, nodes, edges, activePath, onContentChange, toast]);

  // Save file to server
  const saveFileToServer = async (filePath: string, content: string): Promise<boolean> => {
    try {
      // Ensure file path has correct extension
      const normalizedPath = ensureFlowExtension(filePath);
      
      // Get root path from file path
      const rootPath = normalizedPath.split('/').slice(0, -1).join('/');
      
      // Get auth token
      const token = authService.getToken();
      if (!token) {
        console.error('No authentication token available');
        toast.error('Authentication error: No token available');
        return false;
      }
      
      // Validate JSON content before saving
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
        if (!validateFlowData(parsedContent)) {
          console.error('Invalid flow data structure');
          toast.error('Invalid flow data structure');
          return false;
        }
      } catch (error) {
        console.error('Invalid JSON content:', error);
        toast.error('Invalid JSON content');
        return false;
      }
      
      // Format content as a valid JSON string
      const formattedContent = JSON.stringify(parsedContent, null, 2);
      
      // Prepare request payload - the API expects 'path' in the body and 'root_path' as a query parameter
      const queryParams = new URLSearchParams({
        root_path: rootPath
      }).toString();
      
      const payload = {
        path: normalizedPath,  // API expects 'path', not 'file_path'
        content: formattedContent
      };
      
      console.log('Saving file with payload:', payload, 'and query params:', queryParams);
      
      // Send file content to server with correct parameter format
      const response = await fetch(`http://localhost:8000/api/v1/file-explorer/update-file-content?${queryParams}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save file:', response.status, response.statusText, errorText);
        toast.error(`Failed to save file: ${response.statusText}. ${errorText}`);
        return false;
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error saving file:', errorMessage);
      toast.error(`Error saving file: ${errorMessage}`);
      return false;
    }
  };

  // Refresh pipeline
  const refreshPipeline = useCallback(() => {
    if (!fileContent) return;
    
    try {
      // Show loading toast
    //   toast.loading('Refreshing pipeline...');
      
      // Parse file content again
      const parsedData = parsePipelineFile(fileContent);
      
      if (!parsedData) {
        toast.error('Failed to parse flow file');
        return;
      }
      
      // Update state with refreshed data
      setFlowData(parsedData);
      setNodes(convertToFlowNodes(parsedData.nodes));
      setEdges(convertToFlowEdges(parsedData.edges));
      setHasUnsavedChanges(false);
      
    //   toast.success('Pipeline refreshed successfully');
    } catch (error) {
      toast.error(`Error refreshing pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error refreshing pipeline:', error);
    }
  }, [fileContent, toast]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
    >
      {/* Controls */}
      <Controls />
      <MiniMap nodeStrokeWidth={3} zoomable pannable />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      
      {/* Panel with buttons */}
      <Panel position="top-right">
        <div className="flex gap-2">
          {/* Save button */}
          <button
            onClick={savePipeline}
            disabled={isSaving || !hasUnsavedChanges}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-medium ${hasUnsavedChanges ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
            title={hasUnsavedChanges ? 'Save changes' : 'No changes to save'}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save</span>
              </>
            )}
          </button>
          
          {/* Refresh button */}
          <button
            onClick={refreshPipeline}
            className="flex items-center gap-1 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium"
            title="Refresh pipeline from file"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </Panel>
    </ReactFlow>
  );
};

// Main Canvas component with ReactFlowProvider
const Canvas: React.FC<CanvasProps> = (props) => {
  // Reset the flow when activePath changes to ensure proper loading of different files
  const key = props.activePath || 'default';
  
  return (
    <div className="w-full h-full">
      <Toaster />
      <ReactFlowProvider>
        <CanvasContent key={key} {...props} />
      </ReactFlowProvider>
    </div>
  );
};

export default Canvas;