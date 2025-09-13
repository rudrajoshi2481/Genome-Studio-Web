// Canvas component types and interfaces

export interface CanvasProps {
  tabId: string;
  filePath: string;
}

export interface NodeIO {
  id?: string;
  name: string;
  type: string;
  description?: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

export interface NodeData extends Record<string, any> {
  title: string;
  description: string;
  inputs: NodeIO[];
  outputs: NodeIO[];
  language: string;
  function_name: string;
  source_code?: string;
  source?: string;
  node_id?: string;
  is_public?: boolean;
  tags?: string[];
  instance_id?: string;
  onNodeDelete?: (nodeId: string) => void;
  // Execution information
  status?: string;
  execution_count?: number;
  execution_timing?: {
    start_time?: string;
    end_time?: string;
    duration?: number;
    queued_time?: string;
  };
  // Add logs
  logs?: LogEntry[];
  originalId?: string;
}

export interface CustomNodeProps {
  id: string;
  data: NodeData;
  selected: boolean;
}

export interface SimpleNodeProps {
  data: {
    label: string;
    type: string;
  };
}
