"use client"

import { useCallback, useLayoutEffect } from "react"
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Position
} from "reactflow"
import dagre from "dagre"
import "reactflow/dist/style.css"
import CustomBashNode from "./components/CustomBashNode"

// Define the node types
const nodeTypes = {
  bashNode: CustomBashNode,
}
// Initial nodes for single-cell Hi-C pipeline
const initialNodes = [
  {
    id: "1",
    type: "bashNode",
    position: { x: 100, y: 100 },
    data: {
      title: "BWA Alignment",
      status: "Completed",
      command: "bwa mem -SP5 -t 8 reference.fa R1.fastq R2.fastq > aligned.sam",
      logs: ["> BWA started...", "> Alignment complete"],
    },
  },
  {
    id: "2",
    type: "bashNode",
    position: { x: 100, y: 250 },
    data: {
      title: "SAM to BAM",
      status: "Completed",
      command: "samtools view -bS aligned.sam | samtools sort -o aligned.sorted.bam",
      logs: ["> Converting SAM to BAM...", "> Sorted BAM ready"],
    },
  },
  
]

// Edges between steps
const initialEdges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
  
]

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const nodeWidth = 300
  const nodeHeight = 200
  
  // Set graph direction and spacing
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 })

  // Add nodes to the graph with their dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Calculate the layout
  dagre.layout(dagreGraph)

  // Get the positioned nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

export function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Apply layout on initial render
  useLayoutEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges)
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [])

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges],
  )

  return (
    <div style={{ width: '100%', height: '100%' }} >
      <ReactFlowProvider>
        <div style={{ width: '100%', height: '100%' }}>
          <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#999', strokeWidth: 2 },
          }}
        >
          <MiniMap />
          <Controls /> 
          <Background gap={12} size={1} />
        </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  )
}
