import { NodeTypes } from 'reactflow';
import { SimpleNode } from './SimpleNode';
import { CustomNode } from './CustomNode';
import { DataTypeNode } from './DataTypeNode';

// Node types for ReactFlow
export const nodeTypes: NodeTypes = {
  simpleNode: SimpleNode,
  customNode: CustomNode,
  dataType: DataTypeNode,
};
