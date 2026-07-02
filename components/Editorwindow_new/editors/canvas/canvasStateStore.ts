/**
 * Lightweight module-level store for live canvas state.
 *
 * The Canvas component writes its current nodes/edges here on every change.
 * The AI Chat WebSocket hook reads from here when sending a message so the
 * backend agent gets the live (unsaved) canvas state instead of stale file data.
 *
 * Keyed by filePath so multiple canvases can coexist.
 */

export interface CanvasNodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    title?: string;
    label?: string;
    language?: string;
    source_code?: string;
    description?: string;
    inputs?: Array<{ id: string; name: string; type?: string }>;
    outputs?: Array<{ id: string; name: string; type?: string }>;
    tags?: string[];
    value?: any;
    dataType?: string;
    [key: string]: any;
  };
}

export interface CanvasEdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

interface CanvasState {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
}

// Module-level store: filePath -> CanvasState
const _store: Map<string, CanvasState> = new Map();

export function setCanvasState(filePath: string, nodes: CanvasNodeData[], edges: CanvasEdgeData[]) {
  _store.set(filePath, { nodes, edges });
  console.log('🔍 [CANVAS STATE STORE] setCanvasState:', { filePath, nodesCount: nodes.length, edgesCount: edges.length, totalKeys: _store.size, allKeys: Array.from(_store.keys()) });
}

export function getCanvasState(filePath: string): CanvasState | undefined {
  const result = _store.get(filePath);
  console.log('🔍 [CANVAS STATE STORE] getCanvasState:', { filePath, found: !!result, nodesCount: result?.nodes.length, edgesCount: result?.edges.length });
  return result;
}

export function getAllCanvasStates(): Map<string, CanvasState> {
  return _store;
}

export function removeCanvasState(filePath: string) {
  _store.delete(filePath);
}
