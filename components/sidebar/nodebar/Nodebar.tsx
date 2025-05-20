import { DragEvent } from 'react'
import { useNodeStore } from '@/components/sidebar/nodebar/stores/nodeStore'
import { NodeCard } from './NodeCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function Nodebar() {
  const { nodeTemplates } = useNodeStore()

  const handleDragStart = (event: DragEvent<HTMLDivElement>, node: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('nodeType', 'bashNode')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-8 w-full border-b bg-muted/20 px-4 flex items-center backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <span className="font-medium">Node Templates</span>
      </div>
      
      <div className="flex-1 p-4 space-y-4">
        {nodeTemplates.map((node, index) => (
          <NodeCard
            key={index}
            title={node.title}
            command={node.command}
            onDragStart={(e) => handleDragStart(e, node)}
            draggable
          />
        ))}
      </div>
    </div>
  )
}

export default Nodebar
