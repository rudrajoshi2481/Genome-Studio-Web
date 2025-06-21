import { NodeProps } from '@xyflow/react';

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
  source_code: string;
  node_id?: string;
  is_public?: boolean;
  tags?: string[];
  instance_id?: string;
  onNodeDelete?: (nodeId: string) => void;
  status?: string;
  execution_count?: number;
  execution_timing?: {
    start_time?: string;
    end_time?: string;
    duration?: number;
    queued_time?: string;
  };
  logs?: LogEntry[];
}

declare const DynamicCustomNode: React.FC<NodeProps>;

export default DynamicCustomNode;
