import React, { useState, useCallback } from 'react'
import { ReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import ActiveFileTabs from './ActiveFileTabs'
import FileContent from './FileContent'
import { useFileExplorerStore } from '../Sidebar/FileExplorer/utils/store'
import useActiveFilesStore from './active-files-store'


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
  const { activeFiles, activeFileIndex } = useActiveFilesStore()
  const [showFlow, setShowFlow] = useState(true)
 
  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  // Show file content when a file is selected, otherwise show the flow
  const renderContent = () => {
    // If we have active files and an active file index
    if (activeFiles.length > 0 && activeFileIndex !== null) {
      const activeFile = activeFiles[activeFileIndex]
      return <FileContent path={activeFile.path} />
    }

    // Otherwise show the flow editor
    return (
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}>
        <Background />
        <Controls />
      </ReactFlow>
    )
  }
 
  return (
    <div className="flex flex-col h-full">
      {/* File tabs bar */}
      <ActiveFileTabs />
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  )
}

export default Canvas