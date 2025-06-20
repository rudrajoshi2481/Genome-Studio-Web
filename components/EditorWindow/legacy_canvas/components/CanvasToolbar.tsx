import React from 'react'
import { Panel } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { Play, Edit, Download, Trash2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Node } from '@xyflow/react'
import { FlowNodeData } from '@/lib/utils/node-utils'

interface CanvasToolbarProps {
  nodes: Node<FlowNodeData>[]
  onRunAll: () => void
  onEditMetadata: () => void
  onSavePipeline: () => void
  onClearCanvas: () => void
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  nodes,
  onRunAll,
  onEditMetadata,
  onSavePipeline,
  onClearCanvas
}) => {
  const handleRunAll = () => {
    toast.success('Running all nodes...')
    nodes.forEach(node => {
      toast.info(`Running node: ${node.data.title || 'Untitled Node'}`)
      // Execute node logic here
    })
    onRunAll()
  }

  const handleClearCanvas = () => {
    onClearCanvas()
    toast.success('Canvas cleared')
  }

  return (
    <Panel position="top-right">
      <div className="flex gap-2">
        <Button 
          variant="default" 
          size="sm"
          className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 shadow-sm transition-colors"
          onClick={handleRunAll}
        >
          <Play className="h-3 w-3 mr-1" />
          Run All
        </Button>
        
        <Menubar className="border-zinc-200 bg-white">
          <MenubarMenu>
            <MenubarTrigger className="text-xs px-2 py-1 h-8">
              <Settings className="h-3 w-3 mr-1" />
              Pipeline
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={onEditMetadata}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Metadata
              </MenubarItem>
              
              <MenubarItem onClick={onSavePipeline}>
                <Download className="h-4 w-4 mr-2" />
                Save Flow
              </MenubarItem>
              
              <MenubarSeparator />
              
              <MenubarItem onClick={handleClearCanvas}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Canvas
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
    </Panel>
  )
}

export default CanvasToolbar
