import { NodeTypes } from 'reactflow';
import BashNode from '../bash/BashNode';
import AlignerNode from '../aligner/AlignerNode';
import SamToBamNode from '../converter/SamToBamNode';

export const nodeTypes = {
  bashNode: BashNode,
  alignerNode: AlignerNode,
  samToBamNode: SamToBamNode
} as const;

export type CustomNodeTypes = typeof nodeTypes;
