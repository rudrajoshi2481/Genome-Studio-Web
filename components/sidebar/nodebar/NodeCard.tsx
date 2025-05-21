import { DragEvent } from 'react'
import { Card } from "@/components/ui/card"
import { Terminal } from "lucide-react"

interface NodeCardProps {
  title: string
  command: string
  onDragStart: (event: DragEvent<HTMLDivElement>) => void
  draggable?: boolean
}

export function NodeCard({ title, command, onDragStart, draggable }: NodeCardProps) {
  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      className="p-2 cursor-move  transition-colors w-[170px] rounded-none"
    >
      <div className="flex items-center space-x-2">
        <Terminal className="w-4 h-4" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {/* <p className=" text-xs text-muted-foreground font-mono truncate">
        {command}
      </p> */}
    </Card>
  )
}
