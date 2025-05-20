"use client"

import { useCallback, useLayoutEffect, useRef } from "react"
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
  Position,
  useReactFlow
} from "reactflow"
import dagre from "dagre"
import "reactflow/dist/style.css"
import CustomBashNode from "./components/CustomBashNode"
import React from "react"

const nodeTypes = {
  bashNode: CustomBashNode,
}

const initialNodes = [
  {
    id: "1",
    type: "bashNode",
    position: { x: 100, y: 100 },
    data: {
      title: "BWA Alignment",
      status: "Running",
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

const initialEdges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
]

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const nodeWidth = 300
  const nodeHeight = 200

  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

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

function Flow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { project } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

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

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const data = event.dataTransfer.getData('application/reactflow')
      
      if (!data || !reactFlowBounds) return

      const nodeTemplate = JSON.parse(data)
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode = {
        id: `${Date.now()}`,
        type: 'bashNode',
        position,
        data: {
          title: nodeTemplate.title,
          command: nodeTemplate.command,
          status: 'Upcoming',
          logs: [],
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [project, setNodes],
  )

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        onDragOver={onDragOver}
        onDrop={onDrop}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#999', strokeWidth: 2 },
        }}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  )
}
