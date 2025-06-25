import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, Save } from "lucide-react"
import { Node, Edge } from 'reactflow'
import { convertToPipelineNodes, convertToPipelineEdges } from '../utils/fileParser'
import { updateTabFileContent } from '../hooks/canvashooks'
import { toast } from 'sonner'

interface ToolbarProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  fileContent?: string | null;
  fileName?: string;
  nodes: Node[];
  edges: Edge[];
  tabId?: string;
}

function Toolbar({ onRefresh, isRefreshing = false, fileContent, fileName, nodes, edges, tabId }: ToolbarProps) {
  const [isSaving, setIsSaving] = useState(false);
  // Handle saving the current flow to the server
  const handleSave = async () => {
    if (!tabId) {
      toast.error("Cannot save: No active tab");
      return;
    }

    try {
      setIsSaving(true);
      
      // Generate the most up-to-date flow content from current nodes and edges
      let flowData: any = {};
      
      if (fileContent) {
        try {
          const parsedContent = JSON.parse(fileContent);
          // Keep the metadata and configuration
          flowData = {
            id: parsedContent.id || `flow_${Date.now()}`,
            name: parsedContent.name || (fileName?.replace('.flow', '') || 'Flow'),
            description: parsedContent.description || 'Flow diagram',
            version: parsedContent.version || '1.0.0',
            created: parsedContent.created || new Date().toISOString(),
            modified: new Date().toISOString(),
            author: parsedContent.author || 'User',
            config: parsedContent.config || {},
            global_variables: parsedContent.global_variables || {},
            shared_imports: parsedContent.shared_imports || [],
            execution_history: parsedContent.execution_history || []
          };
        } catch (error) {
          console.error('Error parsing file content:', error);
          // Create a basic structure if parsing fails
          flowData = {
            id: `flow_${Date.now()}`,
            name: fileName?.replace('.flow', '') || 'Flow',
            description: 'Flow diagram',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            author: 'User',
            config: {},
            global_variables: {},
            shared_imports: [],
            execution_history: []
          };
        }
      } else {
        // Create a basic structure if no file content
        flowData = {
          id: `flow_${Date.now()}`,
          name: fileName?.replace('.flow', '') || 'Flow',
          description: 'Flow diagram',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          author: 'User',
          config: {},
          global_variables: {},
          shared_imports: [],
          execution_history: []
        };
      }
      
      // ALWAYS use the current ReactFlow state for nodes and edges
      console.log(`Save - Current nodes: ${nodes.length}, Current edges: ${edges.length}`);
      
      // Convert the current nodes to pipeline format
      flowData.nodes = convertToPipelineNodes(nodes);
      
      // Explicitly convert current edges with proper handling of handles
      flowData.edges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle || null,
        target: edge.target,
        targetHandle: edge.targetHandle || null,
        type: edge.type || 'default'
      }));
      
      // Create the updated flow content
      const updatedContent = JSON.stringify(flowData, null, 2);
      
      // Save the content to the server
      const success = await updateTabFileContent(tabId, updatedContent);
      
      if (success) {
        toast.success("Flow saved successfully");
      } else {
        toast.error("Failed to save flow");
      }
    } catch (error) {
      console.error('Error saving flow:', error);
      toast.error("Error saving flow");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    // Generate the most up-to-date flow content from current nodes and edges
    try {
      // Parse the original file content to get the base structure (metadata only)
      let flowData: any = {};
      
      if (fileContent) {
        try {
          const parsedContent = JSON.parse(fileContent);
          // Only keep the metadata and configuration, not nodes or edges
          flowData = {
            id: parsedContent.id || `flow_${Date.now()}`,
            name: parsedContent.name || (fileName?.replace('.flow', '') || 'Flow'),
            description: parsedContent.description || 'Flow diagram',
            version: parsedContent.version || '1.0.0',
            created: parsedContent.created || new Date().toISOString(),
            modified: new Date().toISOString(),
            author: parsedContent.author || 'User',
            config: parsedContent.config || {},
            global_variables: parsedContent.global_variables || {},
            shared_imports: parsedContent.shared_imports || [],
            execution_history: parsedContent.execution_history || []
          };
        } catch (error) {
          console.error('Error parsing file content:', error);
          // Create a basic structure if parsing fails
          flowData = {
            id: `flow_${Date.now()}`,
            name: fileName?.replace('.flow', '') || 'Flow',
            description: 'Flow diagram',
            version: '1.0.0',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            author: 'User',
            config: {},
            global_variables: {},
            shared_imports: [],
            execution_history: []
          };
        }
      } else {
        // Create a basic structure if no file content
        flowData = {
          id: `flow_${Date.now()}`,
          name: fileName?.replace('.flow', '') || 'Flow',
          description: 'Flow diagram',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          author: 'User',
          config: {},
          global_variables: {},
          shared_imports: [],
          execution_history: []
        };
      }
      
      // ALWAYS use the current ReactFlow state for nodes and edges
      // This ensures we're using what's actually on the canvas
      console.log(`Download - Current nodes: ${nodes.length}, Current edges: ${edges.length}`);
      
      // Convert the current nodes to pipeline format
      flowData.nodes = convertToPipelineNodes(nodes);
      
      // Explicitly convert current edges with proper handling of handles
      flowData.edges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle || null,
        target: edge.target,
        targetHandle: edge.targetHandle || null,
        type: edge.type || 'default'
      }));
      
      // Create the updated flow content
      const updatedContent = JSON.stringify(flowData, null, 2);
      
      // Create a blob from the updated content
      const blob = new Blob([updatedContent], { type: 'application/json' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Use the fileName if provided, otherwise use a default name
      const downloadName = fileName ? 
        (fileName.endsWith('.flow') ? fileName : `${fileName}.flow`) : 
        `flow_${new Date().getTime()}.flow`;
      
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } catch (error) {
      console.error('Error generating flow content for download:', error);
      alert('Failed to download flow file. See console for details.');
    }
  };
  
  return (
    <div className="absolute top-2 right-2 z-10 flex gap-2 bg-background/80 p-1 rounded-md shadow-sm">
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleSave}
        disabled={isSaving || !tabId}
        title="Save flow to server"
      >
        <Save className={`h-4 w-4 mr-1 ${isSaving ? 'animate-pulse' : ''}`} />
        Save
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleDownload}
        disabled={false} /* Always enable download button as we can create a flow from current state */
        title="Download flow file"
      >
        <Download className="h-4 w-4 mr-1" />
        Download
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Refresh canvas"
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  )
}

export default Toolbar