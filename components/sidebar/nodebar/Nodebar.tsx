import { DragEvent } from 'react'
import { useNodeStore } from '@/components/sidebar/nodebar/stores/nodeStore'
import { NodeCard } from './NodeCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function Nodebar() {
  const { nodeTemplates } = useNodeStore()

  const handleDragStart = (event: DragEvent<HTMLDivElement>, node: any) => {
    const nodeData = {
      title: node.title,
      command: node.command,
      type: node.type || 'bashNode'
    }
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-8 w-full border-b bg-muted/20 px-4 flex items-center backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <span className="font-medium">Node Templates</span>
      </div>
      
      <div className="flex-1 p-4 grid grid-cols-2 gap-2 space-x-2">
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
