import { Node } from 'reactflow';

export interface BaseNodeData {
  title: string;
  status: 'Completed' | 'Running' | 'Failed' | 'Upcoming';
  command: string;
  logs: string[];
}

export interface BashNodeData extends BaseNodeData {}

export interface AlignerNodeData extends BaseNodeData {
  threads: number;
  reference: string;
  inputR1: string;
  inputR2: string;
  outputFile: string;
  aligner?: string;
}

export interface SamToBamData extends BaseNodeData {
  inputFile?: string;
  outputFile?: string;
  sortBy?: 'coordinate' | 'name';
  threads?: number;
  compressionLevel?: number;
}

export type FlowNode = Node<BashNodeData | AlignerNodeData | SamToBamData>;
