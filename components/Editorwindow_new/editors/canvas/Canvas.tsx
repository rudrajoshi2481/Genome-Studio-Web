"use client"

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection, 
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Loader2 } from 'lucide-react';

import { useEditorContext } from '../../context/EditorContext';
import { useTabStore } from '@/components/FileTabs/useTabStore';
import { editorAPI } from '../../services/EditorAPI';
import { nodeTypes } from './nodeTypes';
import { useCanvasHandlers } from './hooks';
import Toolbar, { RealtimeLogUpdate, RealtimeOutputUpdate, RealtimeStatusUpdate, RealtimeProgressUpdate } from './Toolbar';
import { WorkflowExecutionStatus } from '@/services/WorkflowManagerAPI';
import { 
  parseFlowData, 
  convertFlowNodesToReactFlow, 
  convertToReactFlowEdges,
  convertToFlowNodes,
  convertToFlowEdges,
  serializeFlowData,
  createEmptyFlow,
  isValidFlowFormat
} from './utils/file-parser';
import { setCanvasState, getCanvasState } from './canvasStateStore';

interface CanvasProps {
  tabId: string;
  filePath: string;
  isActive?: boolean;
}

// Canvas content component
const CanvasContent: React.FC<CanvasProps> = ({ tabId, filePath, isActive }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<WorkflowExecutionStatus | null>(null);
  const [showMinimap, setShowMinimap] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('canvas_show_minimap');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Flag to prevent dirty on initial load
  const [savedViewport, setSavedViewport] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const wasActiveRef = useRef(isActive); // Track previous active state
  const wsNodesAddedRef = useRef(false); // Track if nodes were added via WebSocket while loading
  const hasLoadedRef = useRef(false); // Guard against double loadFileContent in Strict Mode
  const reactFlowInstance = useReactFlow();
  
  // Reset isInitialLoad when tab becomes active (e.g. switching back to a hidden tab)
  // ReactFlow recalculates dimensions when a hidden element becomes visible,
  // which would incorrectly set the dirty flag without this guard.
  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      setIsInitialLoad(true);
      setTimeout(() => setIsInitialLoad(false), 300);
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  // Ensure ReactFlow actually renders/fits nodes once they are present and the
  // tab is visible. This handles the case where nodes were added (via WebSocket
  // or store hydration) while ReactFlow had zero dimensions — e.g. a freshly
  // mounted tab or a tab that was created already-active. Without this, nodes
  // exist in state but don't appear until the tab is closed and reopened.
  useEffect(() => {
    if (!isActive || nodes.length === 0 || !reactFlowInstance) return;
    const id = requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 0 });
    });
    // When a hidden tab (display:none, so ReactFlow measures a 0x0 container)
    // becomes active, the rAF above can run before the ResizeObserver reports
    // real dimensions — leaving nodes laid out but scrolled off-screen. Re-fit
    // once layout settles so nodes appear without needing to close/reopen.
    const timers = [80, 200, 400].map((delay) =>
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 0 });
      }, delay)
    );
    return () => {
      cancelAnimationFrame(id);
      timers.forEach(clearTimeout);
    };
  }, [isActive, nodes.length, reactFlowInstance]);
  
  const { updateContent, setDirty, setSaved, registerSaveCallback, unregisterSaveCallback } = useEditorContext();
  const { updateTab } = useTabStore();
  const isTabDirty = useTabStore(state => state.tabs.get(tabId)?.isDirty ?? false);

  // --- Buffered WebSocket update mechanism ---
  // Buffers incoming updates and flushes them in a single setNodes call via rAF
  // to prevent excessive re-renders during fast streaming.
  type PendingUpdate =
    | { kind: 'log'; nodeId: string; log: Record<string, unknown> }
    | { kind: 'output'; nodeId: string; output: Record<string, unknown> }
    | { kind: 'status'; nodeId: string; status: string; errorMessage?: string; errorTraceback?: string };

  const pendingUpdatesRef = useRef<PendingUpdate[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushUpdates = useCallback(() => {
    flushTimerRef.current = null;
    const updates = pendingUpdatesRef.current;
    if (updates.length === 0) return;
    pendingUpdatesRef.current = [];

    setNodes((prevNodes) => {
      // Group updates by nodeId for efficiency
      const updatesByNode = new Map<string, PendingUpdate[]>();
      for (const u of updates) {
        const arr = updatesByNode.get(u.nodeId);
        if (arr) arr.push(u);
        else updatesByNode.set(u.nodeId, [u]);
      }

      return prevNodes.map((node) => {
        const nodeUpdates = updatesByNode.get(node.id);
        if (!nodeUpdates) return node;

        let data = { ...node.data } as Record<string, unknown>;
        let nodeStatus: string | undefined;

        for (const u of nodeUpdates) {
          if (u.kind === 'log') {
            const currentLogs = (data.logs as Array<Record<string, unknown>>) || [];
            const newLogs = [...currentLogs, u.log];
            data.logs = newLogs;
            const currentOutputs = (data.unified_outputs as Array<Record<string, unknown>>) || [];
            data.unified_outputs = [...currentOutputs, { type: 'text', content: (u.log as Record<string, unknown>).message, order: newLogs.length - 1 }];
          } else if (u.kind === 'output') {
            const currentOutputs = (data.unified_outputs as Array<Record<string, unknown>>) || [];
            const order = (u.output as Record<string, unknown>).order as number | undefined ?? currentOutputs.length;
            const newOutput: Record<string, unknown> = {
              type: (u.output as Record<string, unknown>).html ? 'rich' : 'text',
              content: (u.output as Record<string, unknown>).html || (u.output as Record<string, unknown>).text || '',
              order,
            };
            if ((u.output as Record<string, unknown>).mime_type) {
              newOutput.mime_type = (u.output as Record<string, unknown>).mime_type;
            }
            data.unified_outputs = [...currentOutputs, newOutput];
            if ((u.output as Record<string, unknown>).html) {
              const currentHtml = (data.output_html as Record<string, unknown>) || {};
              data.output_html = { ...currentHtml, [`output_${order}`]: (u.output as Record<string, unknown>).html };
            }
          } else if (u.kind === 'status') {
            data.status = u.status;
            nodeStatus = u.status;
            if (u.errorMessage) {
              data.error_message = u.errorMessage;
            }
            if (u.errorTraceback) {
              data.error_traceback = u.errorTraceback;
            }
          }
        }

        const result: typeof node = { ...node, data };
        if (nodeStatus) {
          (result as Record<string, unknown>).status = nodeStatus;
        }
        return result;
      });
    });
  }, [setNodes]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(flushUpdates, 50);
  }, [flushUpdates]);

  // Clean up flush timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, []);

  const handleRealtimeLog = useCallback((update: RealtimeLogUpdate) => {
    pendingUpdatesRef.current.push({ kind: 'log', nodeId: update.nodeId, log: update.log });
    scheduleFlush();
  }, [scheduleFlush]);

  const handleRealtimeOutput = useCallback((update: RealtimeOutputUpdate) => {
    pendingUpdatesRef.current.push({ kind: 'output', nodeId: update.nodeId, output: update.output });
    scheduleFlush();
  }, [scheduleFlush]);

  const handleRealtimeStatus = useCallback((update: RealtimeStatusUpdate) => {
    if (!update.nodeId) return;
    pendingUpdatesRef.current.push({
      kind: 'status',
      nodeId: update.nodeId,
      status: update.status,
      errorMessage: update.errorMessage,
      errorTraceback: update.errorTraceback,
    });
    scheduleFlush();
  }, [scheduleFlush]);

  const handleRealtimeProgress = useCallback((_update: RealtimeProgressUpdate) => {
    // Progress is handled by Toolbar internally; could add a progress bar here
  }, []);

  // Clear all node execution state in the UI when a full run starts
  // (not triggered for single node execution)
  const handleFullRunStart = useCallback(() => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        const cleanedData = { ...node.data };
        delete cleanedData.logs;
        delete cleanedData.output_html;
        delete cleanedData.unified_outputs;
        delete cleanedData.status;
        delete cleanedData.execution_order;
        delete cleanedData.lastExecution;
        delete cleanedData.error_message;
        delete cleanedData.error_traceback;
        return {
          ...node,
          data: cleanedData,
          status: undefined,
        };
      })
    );
    setExecutionStatus(null);
  }, [setNodes]);

  // --- Canvas Agent update listener ---
  // Listens for canvasUpdateEvent dispatched by useChatWebSocket when
  // the canvas agent sends canvas_update messages via WebSocket.
  // Applies changes directly to ReactFlow state for smooth, gradual updates.
  useEffect(() => {
    const handleCanvasUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail) return;

      // Targeting: if the message includes a filePath, only apply it to the
      // matching canvas. If no filePath is specified, apply to all canvases
      // (backward compatibility). Match by exact path OR by basename to handle
      // cases where the backend sends a relative path.
      const targetFilePath = detail.filePath;
      if (targetFilePath && targetFilePath !== filePath) {
        // Try basename match as fallback (e.g., "trial_04.flow" matches "/home/user/trial_04.flow")
        const targetBasename = targetFilePath.split('/').pop();
        const currentBasename = filePath?.split('/').pop();
        if (targetBasename !== currentBasename) return;
      }

      const { action, node, edge, node_id } = detail;
      console.log('🔍 [CANVAS] canvasUpdateEvent received:', { action, filePath, targetFilePath, hasNode: !!node, hasEdge: !!edge, node_id });

      if (action === 'add_node' && node) {
        console.log('Canvas: WS add_node received for', filePath, 'node:', node.id, 'type:', node.type);
        // Track that nodes were added via WebSocket (prevents loadFileContent from overwriting)
        wsNodesAddedRef.current = true;
        // Add the node with filePath for consistency
        const newNode = {
          ...node,
          data: {
            ...node.data,
            filePath: filePath,
          },
        };
        setNodes((nds) => {
          // Avoid duplicate if node already exists
          if (nds.some((n) => n.id === node.id)) return nds;
          const updated = nds.concat(newNode);
          // Write to store synchronously so other Canvas instances can see it
          const existing = getCanvasState(filePath!);
          setCanvasState(filePath!, updated, existing?.edges ?? []);
          console.log('Canvas: WS add_node applied — total nodes:', updated.length);
          return updated;
        });
        // Mark tab as dirty since canvas changed
        setDirty(tabId, true);
        updateTab(tabId, { isDirty: true });
      } else if (action === 'add_edge' && edge) {
        wsNodesAddedRef.current = true;
        setEdges((eds) => {
          // Avoid duplicate edges
          if (eds.some((e) => e.id === edge.id)) return eds;
          const updated = eds.concat(edge);
          // Write to store synchronously so other Canvas instances can see it
          const existing = getCanvasState(filePath!);
          setCanvasState(filePath!, existing?.nodes ?? [], updated);
          return updated;
        });
        setDirty(tabId, true);
        updateTab(tabId, { isDirty: true });
      } else if (action === 'remove_node' && node_id) {
        setNodes((nds) => nds.filter((n) => n.id !== node_id));
        setEdges((eds) => eds.filter((e) => e.source !== node_id && e.target !== node_id));
        setDirty(tabId, true);
        updateTab(tabId, { isDirty: true });
      } else if (action === 'edit_node' && detail.node_id && detail.updates) {
        const editId = detail.node_id;
        const updates = detail.updates;
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== editId) return n;
            const updated = { ...n };
            // Update position if provided
            if (updates.position) {
              updated.position = {
                ...n.position,
                ...(updates.position.x !== undefined ? { x: updates.position.x } : {}),
                ...(updates.position.y !== undefined ? { y: updates.position.y } : {}),
              };
            }
            // Update data fields
            updated.data = { ...n.data };
            for (const key of ['title', 'description', 'language', 'source_code', 'function_name', 'inputs', 'outputs', 'tags', 'dataType', 'value', 'label']) {
              if (key in updates) {
                updated.data[key] = updates[key];
              }
            }
            return updated;
          })
        );
        setDirty(tabId, true);
        updateTab(tabId, { isDirty: true });
      } else if (action === 'clear') {
        wsNodesAddedRef.current = false;
        setNodes([]);
        setEdges([]);
        setDirty(tabId, true);
        updateTab(tabId, { isDirty: true });
      }
    };

    window.addEventListener('canvasUpdateEvent', handleCanvasUpdate);
    return () => {
      window.removeEventListener('canvasUpdateEvent', handleCanvasUpdate);
    };
  }, [filePath, tabId, setNodes, setEdges, setDirty, updateTab]);

  // Sync live canvas state to the module-level store so the AI Chat
  // WebSocket hook can send the current (unsaved) nodes/edges to the backend.
  // Guard: don't overwrite the store with empty state if it already has nodes
  // (prevents unmount/remount cycles from wiping WS-added nodes).
  useEffect(() => {
    console.log('🔍 [CANVAS] canvasStateStore sync effect:', { filePath, nodesCount: nodes.length, edgesCount: edges.length });
    if (nodes.length === 0 && edges.length === 0) {
      const existing = getCanvasState(filePath);
      if (existing && (existing.nodes.length > 0 || existing.edges.length > 0)) {
        console.log('🔍 [CANVAS] Skipping store overwrite — existing state has', existing.nodes.length, 'nodes');
        return;
      }
    }
    setCanvasState(filePath, nodes, edges);
    console.log('🔍 [CANVAS] Store updated for', filePath, '— nodes:', nodes.length, 'edges:', edges.length);
  }, [filePath, nodes, edges]);

  // Load file content
  const loadFileContent = useCallback(async () => {
    if (!filePath) {
      console.log('🔍 [CANVAS] loadFileContent: no filePath, returning');
      return;
    }
    console.log('🔍 [CANVAS] loadFileContent START:', { filePath, tabId, isActive });

    try {
      setIsLoading(true);
      setError(null);
      setIsInitialLoad(true);
      
      // Reset the WebSocket-added flag before loading
      wsNodesAddedRef.current = false;
      
      // Check canvasStateStore first — if another Canvas instance (or WS update)
      // already populated live state for this filePath, use that instead of disk.
      const existingState = getCanvasState(filePath);
      console.log('🔍 [CANVAS] loadFileContent — canvasStateStore check:', { filePath, hasExistingState: !!existingState, existingNodes: existingState?.nodes.length, existingEdges: existingState?.edges.length });
      if (existingState && existingState.nodes.length > 0) {
        console.log('Canvas: Found existing live state in store,', existingState.nodes.length, 'nodes — using that instead of disk');
        const nodesWithFilePath = existingState.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            filePath: filePath,
          },
        }));
        setNodes(nodesWithFilePath);
        setEdges(existingState.edges);
        setIsLoading(false);
        setIsInitialLoad(false);
        setDirty(tabId, true);
        updateTab(tabId, { isDirty: true });
        return;
      }
      
      console.log('🔍 [CANVAS] loadFileContent — fetching from disk:', filePath);
      const fileContent = await editorAPI.getFileContent(filePath);
      console.log('🔍 [CANVAS] loadFileContent — got file content:', { hasContent: !!fileContent.content, contentLength: fileContent.content?.length, version: fileContent.version });
      
      // If nodes were added via WebSocket while we were loading the file,
      // skip overwriting the canvas state — the live WebSocket nodes take priority
      if (wsNodesAddedRef.current) {
        console.log('Canvas: Skipping file load overwrite — nodes were added via WebSocket during load');
        setIsLoading(false);
        setIsInitialLoad(false);
        return;
      }
      
      // Parse workflow content using the new file parser
      if (fileContent.content) {
        const validationResult = isValidFlowFormat(fileContent.content);
        console.log('🔍 [CANVAS] loadFileContent — validation:', { isValid: validationResult.isValid, hasParsedData: !!validationResult.parsedData });
        
        if (validationResult.isValid && validationResult.parsedData) {
          // Convert flow format to ReactFlow format
          const reactFlowNodes = convertFlowNodesToReactFlow(validationResult.parsedData.nodes);
          const reactFlowEdges = convertToReactFlowEdges(validationResult.parsedData.edges);
          
          // Add filePath to node data for execution
          const nodesWithFilePath = reactFlowNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              filePath: filePath
            }
          }));
          
          console.log('Canvas: Loaded', nodesWithFilePath.length, 'nodes,', reactFlowEdges.length, 'edges');
          console.log('🔍 [CANVAS] loadFileContent — parsed from disk:', { nodes: nodesWithFilePath.length, edges: reactFlowEdges.length, filePath });
          
          setNodes(nodesWithFilePath);
          setEdges(reactFlowEdges);
          
          // Restore viewport from file config or localStorage
          const fileViewport = validationResult.parsedData.config?.viewport;
          const localViewport = typeof window !== 'undefined' ? localStorage.getItem(`canvas_viewport_${tabId}`) : null;
          if (localViewport) {
            try { setSavedViewport(JSON.parse(localViewport)); } catch {}
          } else if (fileViewport) {
            setSavedViewport(fileViewport);
          } else {
            setSavedViewport(null);
          }
        } else {
          // Try to parse as legacy format or create empty flow
          try {
            const legacyData = JSON.parse(fileContent.content);
            if (legacyData.nodes && legacyData.edges) {
              setNodes(legacyData.nodes);
              setEdges(legacyData.edges);
            } else {
              setNodes([]);
              setEdges([]);
            }
          } catch (parseError) {
            setNodes([]);
            setEdges([]);
          }
        }
      } else {
        // Empty file, create empty flow
        setNodes([]);
        setEdges([]);
      }
      
      // Update context
      updateContent(tabId, fileContent.content, fileContent.version);
      setSaved(tabId, fileContent.version || 1);
      console.log('🔍 [CANVAS] loadFileContent — content updated in context, clearing dirty');
      
      // Clear dirty flag after loading (in case ReactFlow triggers changes)
      setDirty(tabId, false);
      updateTab(tabId, { isDirty: false });
      
      // Mark that initial load is complete after a short delay
      // This allows ReactFlow to finish its initialization
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 300);
      
      console.log('Canvas: File content loaded');
    } catch (error) {
      console.error('🔍 [CANVAS] loadFileContent ERROR:', { filePath, error });
      setError(error instanceof Error ? error.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
      console.log('🔍 [CANVAS] loadFileContent FINALLY:', { filePath, isLoading: false });
    }
  }, [filePath, tabId, updateContent, setSaved, setDirty, updateTab]);

  // Handle edge connections
  const onConnect = useCallback((params: Connection) => {
    const newEdge = {
      ...params,
      id: `edge-${params.source}-${params.target}-${Date.now()}`,
      animated: true,
      style: { 
        stroke: '#555',
        strokeDasharray: '5,5'
      }
    };
    setEdges((eds) => addEdge(newEdge, eds));
    
    // Only set dirty if not during initial load
    if (!isInitialLoad) {
      setDirty(tabId, true);
      updateTab(tabId, { isDirty: true });
    }
  }, [setEdges, setDirty, tabId, updateTab, isInitialLoad]);

  // Save file content using proper flow format
  const saveFileContent = useCallback(async () => {
    if (!filePath) return;

    try {
      // Convert ReactFlow nodes and edges to flow format
      const flowNodes = convertToFlowNodes(nodes);
      const flowEdges = convertToFlowEdges(edges);
      
      // Get current viewport
      const viewport = reactFlowInstance.getViewport();
      
      // Read the CURRENT file content from disk to preserve execution data
      // (logs, outputs, execution_history, global_variables, etc.)
      let existingData: Record<string, unknown> | null = null;
      try {
        const fileResponse = await editorAPI.getFileContent(filePath);
        if (fileResponse && fileResponse.content) {
          existingData = JSON.parse(fileResponse.content);
        }
      } catch (e) {
        console.warn('Canvas: Could not read existing file for merge, creating fresh:', e);
      }
      
      let content: string;
      
      if (existingData) {
        // Merge: update positions, dimensions, edges, code — preserve execution data
        // Build node list from CANVAS state (not disk) so deleted nodes stay deleted
        const existingNodeMap = new Map(
          ((existingData.nodes as Array<Record<string, unknown>>) || []).map(n => [n.id as string, n])
        );
        
        const mergedNodes = flowNodes.map(flowNode => {
          const existingNode = existingNodeMap.get(flowNode.id);
          if (existingNode) {
            // Preserve execution data from existing file, update visual/code from canvas
            const existingNodeData = (existingNode.data as Record<string, unknown>) || {};
            const flowNodeData = (flowNode.data as Record<string, unknown>) || {};
            // Start with existing data (preserves execution logs, status, etc.)
            // Then overlay ALL fields from the canvas flow node so no edits are lost
            const mergedData: Record<string, unknown> = {
              ...existingNodeData,
              ...flowNodeData,
            };
            return {
              ...existingNode,
              position: flowNode.position,
              data: mergedData,
            };
          }
          // New node not in file yet
          return flowNode as unknown as Record<string, unknown>;
        });
        
        existingData.nodes = mergedNodes;
        existingData.edges = flowEdges;
        
        // Update viewport in config
        if (!existingData.config) existingData.config = {};
        (existingData.config as Record<string, unknown>).viewport = viewport;
        existingData.modified = new Date().toISOString();
        
        content = JSON.stringify(existingData, null, 2);
      } else {
        // No existing file — create fresh structure
        const fileName = filePath.split('/').pop()?.replace('.flow', '') || 'workflow';
        const flowData = {
          id: `flow_${Date.now()}`,
          name: fileName,
          description: `Workflow saved on ${new Date().toLocaleDateString()}`,
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          author: '',
          config: {
            auto_layout: false,
            execution_mode: 'sequential',
            default_language: 'python',
            environment: 'default',
            viewport: viewport
          },
          nodes: flowNodes,
          edges: flowEdges,
          global_variables: {},
          shared_imports: [],
          execution_history: []
        };
        content = serializeFlowData(flowData);
      }
      
      // Save using API
      await editorAPI.updateFileContent(filePath, content);
      
      // Update context
      updateContent(tabId, content);
      setSaved(tabId, 1);
      setDirty(tabId, false);
      updateTab(tabId, { isDirty: false });
      
      // Do NOT reload file after save — this prevents flashing and races with backend
      // The node positions are already updated in the canvas state
    } catch (error) {
      console.error('❌ Canvas: Error saving file:', error);
      setError('Failed to save file');
    }
  }, [filePath, tabId, nodes, edges, reactFlowInstance, updateContent, setSaved, setDirty, updateTab]);

  // Use canvas handlers hook
  const {
    handleNodesChange,
    handleEdgesChange,
    handleNodeDelete,
    onDragOver,
    onDrop: onDropHandler,
    handleKeyDown
  } = useCanvasHandlers(
    tabId,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    saveFileContent,
    isInitialLoad
  );

  // Wrap the onDrop handler to provide ReactFlow instance
  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    onDropHandler(event, reactFlowInstance);
  }, [onDropHandler, reactFlowInstance]);

  // Handle execution completion callback
  // Debounced — only reload once after burst of node completions settles
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleExecutionComplete = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      loadFileContent();
    }, 500);
  }, [loadFileContent]);

  // Add node deletion handler and execution callback to node data
  // Use refs for stable callbacks to avoid recreating node objects on every render
  const handleNodeDeleteRef = useRef(handleNodeDelete);
  const handleExecutionCompleteRef = useRef(handleExecutionComplete);
  handleNodeDeleteRef.current = handleNodeDelete;
  handleExecutionCompleteRef.current = handleExecutionComplete;

  const nodesWithDeleteHandler = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        filePath: filePath,
        onNodeDelete: handleNodeDeleteRef.current,
        onExecutionComplete: handleExecutionCompleteRef.current,
        setDirty: setDirty,
        updateTab: updateTab,
        tabId: tabId
      }
    }));
  }, [nodes, filePath, setDirty, updateTab, tabId]);

  // Load file content on mount (guard against Strict Mode double-invoke)
  useEffect(() => {
    console.log('🔍 [CANVAS] loadFileContent effect triggered:', { tabId, filePath, hasLoaded: hasLoadedRef.current, isActive });
    if (hasLoadedRef.current) {
      console.log('🔍 [CANVAS] Skipping loadFileContent — already loaded (Strict Mode guard):', tabId);
      return;
    }
    hasLoadedRef.current = true;
    console.log('🔍 [CANVAS] Calling loadFileContent for:', filePath);
    loadFileContent();
  }, [loadFileContent]);

  // Keep a ref to the latest saveFileContent so the registered callback
  // always calls the current version without needing to re-register.
  const saveFileContentRef = useRef(saveFileContent);
  saveFileContentRef.current = saveFileContent;
  console.log('🔍 [CANVAS] saveFileContentRef updated — current nodes count:', nodes.length, 'edges count:', edges.length);

  // Register save callback once (stable identity — no churn)
  useEffect(() => {
    console.log('🔍 [CANVAS] Register save callback effect — registering for tabId:', tabId);
    const stableSave = async () => {
      console.log('🔍 [CANVAS] stableSave called — delegating to saveFileContentRef for tabId:', tabId);
      await saveFileContentRef.current();
    };
    registerSaveCallback(tabId, stableSave);
    
    return () => {
      console.log('🔍 [CANVAS] Register save callback effect — unregistering for tabId:', tabId);
      unregisterSaveCallback(tabId);
    };
  }, [tabId, registerSaveCallback, unregisterSaveCallback]);

  // Workflow execution handlers - moved before early returns to maintain hook order
  const handleRun = useCallback(() => {
    console.log('▶️ Canvas: Running workflow - delegating to Toolbar');
    // The actual execution logic is in Toolbar component
    // This is just a placeholder - Toolbar handles the real execution
  }, []);

  const handleStop = useCallback(() => {
    console.log('⏹️ Canvas: Stopping workflow');
  }, []);

  const handleReset = useCallback(async () => {
    console.log('🔄 Canvas: Resetting workflow - clearing all execution data');

    try {
      // Clear execution data from all nodes
      const resetNodes = nodes.map(node => {
        const cleanedData = { ...node.data };
        
        // Remove execution-related properties
        delete cleanedData.logs;
        delete cleanedData.execution_result;
        delete cleanedData.lastExecution;
        delete cleanedData.status;
        delete cleanedData.execution_count;
        delete cleanedData.execution_timing;
        delete cleanedData.executionStatus;
        delete cleanedData.output_html;           // Clear rich HTML outputs
        delete cleanedData.unified_outputs;       // Clear unified output stream
        delete cleanedData.execution_order;       // Clear execution order number
        delete cleanedData.error_message;         // Clear error messages
        delete cleanedData.error_traceback;       // Clear error tracebacks

        return {
          ...node,
          data: cleanedData,
          // Reset node status
          status: undefined
        };
      });

      console.log(`✅ Canvas: Cleared execution data from ${resetNodes.length} nodes`);
      
      // Update nodes state
      setNodes(resetNodes);
      
      // Clear execution status
      setExecutionStatus(null);
      
      // Save the file with cleared data
      console.log('💾 Canvas: Saving reset workflow to file');
      
      // Convert to flow format and save
      const flowNodes = convertToFlowNodes(resetNodes);
      const flowEdges = convertToFlowEdges(edges);
      const viewport = reactFlowInstance.getViewport();
      
      const fileName = filePath.split('/').pop()?.replace('.flow', '') || 'workflow';
      const flowData = {
        id: `flow_${Date.now()}`,
        name: fileName,
        description: `Workflow reset on ${new Date().toLocaleDateString()}`,
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        author: '',
        config: {
          auto_layout: false,
          execution_mode: 'sequential',
          default_language: 'python',
          environment: 'default',
          viewport: viewport
        },
        nodes: flowNodes,
        edges: flowEdges,
        global_variables: {},
        shared_imports: [],
        execution_history: [], // Clear execution history
        current_status: undefined,
        current_execution_id: undefined
      };

      const content = serializeFlowData(flowData);
      await editorAPI.updateFileContent(filePath, content);
      
      // Update context
      updateContent(tabId, content);
      setSaved(tabId, 1);
      setDirty(tabId, false);
      updateTab(tabId, { isDirty: false });
      
      console.log('✅ Canvas: Workflow reset and saved successfully');
      
    } catch (error) {
      console.error('❌ Canvas: Error resetting workflow:', error);
    }
  }, [nodes, edges, filePath, reactFlowInstance, setNodes, setExecutionStatus, updateContent, setSaved, setDirty, updateTab, tabId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        nodes={nodesWithDeleteHandler}
        edges={edges}
        onSave={saveFileContent}
        onRun={handleRun}
        onStop={handleStop}
        onReset={handleReset}
        onRefresh={loadFileContent}
        onFullRunStart={handleFullRunStart}
        filePath={filePath}
        fileName={filePath?.split('/').pop() || 'workflow'}
        tabId={tabId}
        showMinimap={showMinimap}
        onToggleMinimap={setShowMinimap}
        onExecutionStatusChange={setExecutionStatus}
        onRealtimeLog={handleRealtimeLog}
        onRealtimeOutput={handleRealtimeOutput}
        onRealtimeStatus={handleRealtimeStatus}
        onRealtimeProgress={handleRealtimeProgress}
      />
      
      <div className={`flex-1 relative bg-transparent ${isTabDirty ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}>
        <ReactFlow
          nodes={nodesWithDeleteHandler}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          deleteKeyCode={null}
          {...(savedViewport ? { defaultViewport: savedViewport, fitView: false } : { fitView: true })}
          onMoveEnd={(_, vp) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(`canvas_viewport_${tabId}`, JSON.stringify(vp));
            }
          }}
          style={{ backgroundColor: 'transparent' }}
          proOptions={{ hideAttribution: false }}
          noDragClassName="noDrag"
          noWheelClassName="noDrag"
        >
          <Controls />
          {showMinimap && <MiniMap />}
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#ccc" />
        </ReactFlow>
      </div>
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
