"use client"

import React, { useState, useCallback } from 'react'
import { ReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'



import { useFileExplorerStore } from '../Sidebar/FileExplorer/utils/store'


const initialNodes = [
  {
    id: '1',
    data: { label: 'Hello' },
    position: { x: 0, y: 0 },
    type: 'input',
  },
  {
    id: '2',
    data: { label: 'World' },
    position: { x: 100, y: 100 },
  },
];
 
const initialEdges = [
  {
    id: '1-2',
    source: '1',
    target: '2',
  },
];

function Canvas() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { activePath, rootPath } = useFileExplorerStore();
  
  // State for tracking active tab
  
  
  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );


 
  return (
    <div className="flex flex-col h-full">
      {/* File tabs bar */}
      
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}>
        <Background />
        <Controls />
      </ReactFlow>
      {/* Main content area */}
    </div>
  );
}

export default Canvas