export type NodeStatus = "Completed" | "Running" | "Failed" | "Upcoming";

export interface BashNodeData {
  status: NodeStatus;
  command: string;
  logs?: string[];
  title: string;
  additionalInputs?: Array<{ value: string; placeholder: string }>;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

export interface NodeState {
  showLogs: boolean;
  isCollapsed: boolean;
  dimensions: NodeDimensions;
  autoSizing: boolean;
}
