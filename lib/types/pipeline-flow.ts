// TypeScript Schema for Data Processing Pipeline

export interface DataProcessingPipeline {
  id: string;
  name: string;
  description: string;
  version: string;
  created: string; // ISO 8601 timestamp
  modified: string; // ISO 8601 timestamp
  author: string;
  config: PipelineConfig;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  global_variables: Record<string, any>;
  shared_imports: string[];
  execution_history: ExecutionHistoryEntry[];
}

export interface PipelineConfig {
  auto_layout: boolean;
  execution_mode: string;
  default_language: string;
  environment: string;
  global_timeout: number;
}

export interface NodeConfig {
  timeout: number;
  memory_limit: number;
  cpu_limit: number;
  auto_run: boolean;
  cache_results: boolean;
}

export interface PipelineNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: NodeData;
  draggable?: boolean;
  selectable?: boolean;
  deletable: boolean;
  hidden: boolean;
  selected: boolean;
  // Add properties for resizable nodes
  width?: number;
  height?: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  title: string;
  description: string;
  language: string;
  source: string[];
  status: string;
  execution_count: number;
  execution_timing: ExecutionTiming;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  logs: LogEntry[];
  errors: any[];
  warnings: any[];
  stdout: string[];
  stderr: string[];
  metadata: NodeMetadata;
  ui: UISettings;
  dependencies: NodeDependency[];
  config: NodeConfig;
}

export interface ExecutionTiming {
  start_time: string; // ISO 8601 timestamp
  end_time: string; // ISO 8601 timestamp
  duration: number; // milliseconds
  queued_time: string; // ISO 8601 timestamp
}

export interface ExecutionHistoryEntry {
  timestamp: string; // ISO 8601 timestamp
  node_id: string;
  status: string;
  duration: number;
  error: string | null;
}

export interface NodeInput {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description: string;
  data_type: string;
  source_node_id: string;
  default_value: any;
}

export interface NodeOutput {
  id: string;
  name: string;
  type: string;
  description: string;
  data_type: string;
  preview?: string;
  size?: number;
  file_path?: string;
}

export interface NodeMetadata {
  tags: string[];
  author: string;
  created: string; // ISO 8601 timestamp
  modified: string; // ISO 8601 timestamp
  notes: string;
  collapsed: boolean;
  pinned: boolean;
  version: number;
  dependencies: string[] | null;
  environment: string;
}

export interface UISettings {
  color: string;
  icon: string;
  width: number;
  height: number;
  theme: string;
  font_size: number;
  show_line_numbers: boolean;
}

export interface NodeDependency {
  node_id: string;
  dependency_type: string;
  required: boolean;
  description: string;
}

export interface PipelineEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  type?: string;
  data?: {
    label?: string;
    [key: string]: any;
  };
}

export interface LogEntry {
  timestamp: string; // ISO 8601 timestamp
  level: string;
  message: string;
  source: string;
}
