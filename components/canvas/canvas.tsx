'use client';

import { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

const defaultNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    data: {
      label: (
        <div className="whitespace-pre-wrap text-sm">
          Input FastQ Files{'\n'}(reads.fastq)
        </div>
      ),
    },
    position: { x: 250, y: 0 },
    style: {
      backgroundColor: '#f0f9ff',
      border: '1px solid #0369a1',
      borderRadius: 8,
      padding: 10,
    },
  },
  {
    id: '2',
    type: 'default',
    data: {
      label: (
        <div className="whitespace-pre-wrap text-sm">
          Bowtie Alignment{'\n'}bowtie -x reference -q reads.fastq -S output.sam
        </div>
      ),
    },
    position: { x: 250, y: 100 },
    style: {
      backgroundColor: '#f0fdf4',
      border: '1px solid #166534',
      borderRadius: 8,
      padding: 10,
    },
  },
  {
    id: '3',
    type: 'default',
    data: {
      label: (
        <div className="whitespace-pre-wrap text-sm">
          Output SAM File{'\n'}(output.sam)
        </div>
      ),
    },
    position: { x: 250, y: 200 },
    style: {
      backgroundColor: '#fef2f2',
      border: '1px solid #991b1b',
      borderRadius: 8,
      padding: 10,
    },
  },
];

const defaultEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: { stroke: '#0369a1' },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    animated: true,
    style: { stroke: '#166534' },
  },
];

export function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="bg-background"
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}
