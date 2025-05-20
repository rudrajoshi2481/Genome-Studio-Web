import { Node, XYPosition } from 'reactflow';

export interface NodeData {
  title: string;
  command: string;
  status?: 'Completed' | 'Running' | 'Failed' | 'Upcoming';
  logs?: string[];
}

export const createNode = (
  type: string,
  position: XYPosition,
  data: Partial<NodeData>
): Partial<Node> => {
  return {
    type,
    position,
    data: {
      status: 'Upcoming',
      logs: [],
      ...data,
    },
  };
};
