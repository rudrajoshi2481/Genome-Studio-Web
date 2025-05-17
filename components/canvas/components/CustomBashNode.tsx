"use client"

import type React from "react"
import { ResizableBox } from 'react-resizable'
import 'react-resizable/css/styles.css'
import { Handle, Position, type NodeProps } from "reactflow"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Terminal, ChevronDown, ChevronUp, Play, CheckCircle, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"

interface BashNodeData {
  status: "Completed" | "Running" | "Failed" | "Upcoming"
  command: string
  logs?: string[]
  title: string
  additionalInputs?: Array<{ value: string; placeholder: string }>
}

export default function CustomBashNode({ data, selected, id }: NodeProps<BashNodeData>) {
  const [showLogs, setShowLogs] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 300, height: 230 })
  const [autoSizing, setAutoSizing] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousLogsHeight = useRef(0)

  const statusConfig: Record<BashNodeData["status"], { color: string; icon: React.ReactNode }> = {
    Completed: {
      color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: <CheckCircle className="w-3 h-3 mr-1" />,
    },
    Running: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <Play className="w-3 h-3 mr-1 animate-pulse" />,
    },
    Failed: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: <XCircle className="w-3 h-3 mr-1" />,
    },
    Upcoming: {
      color: "bg-amber-100 text-amber-800 border-amber-200",
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
  }

  useEffect(() => {
    if (autoSizing && contentRef.current && !isCollapsed) {
      const contentRect = contentRef.current.getBoundingClientRect()
      const logsContainer = contentRef.current.querySelector('.logs-container') as HTMLElement
      const logsHeight = showLogs ? Math.min(200, logsContainer?.scrollHeight || 0) : 0
      
      const baseHeight = contentRect.height - previousLogsHeight.current
      const newHeight = Math.max(230, baseHeight + logsHeight + 60)
      
      setDimensions(prev => ({
        width: Math.max(300, contentRect.width + 40),
        height: newHeight
      }))

      previousLogsHeight.current = logsHeight
    }
  }, [data, showLogs, isCollapsed, autoSizing])

  const handleResize = (_event: any, { size }: { size: { width: number; height: number } }) => {
    setAutoSizing(false)
    setDimensions({
      width: size.width,
      height: size.height
    })
  }

  return (
    <ResizableBox 
      width={dimensions.width}
      height={isCollapsed ? 40 : dimensions.height}
      minConstraints={[200, 40]}
      maxConstraints={[800, 600]}
      axis="both"
      resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
      onResize={handleResize}
      onResizeStart={() => setAutoSizing(false)}
      handle={
        <>
          <div
            className="react-resizable-handle absolute top-0 left-1/2 -translate-x-1/2 cursor-n-resize opacity-20 hover:opacity-100 transition-opacity bg-blue-500 rounded-full"
            style={{ 
              width: `${Math.min(120, dimensions.width * 0.4)}px`,
              height: '6px',
              top: '-3px'
            }}
          />
          <div
            className="react-resizable-handle absolute bottom-0 left-1/2 -translate-x-1/2 cursor-s-resize opacity-20 hover:opacity-100 transition-opacity bg-blue-500 rounded-full"
            style={{ 
              width: `${Math.min(120, dimensions.width * 0.4)}px`,
              height: '6px',
              bottom: '-3px'
            }}
          />
          <div
            className="react-resizable-handle absolute left-0 top-1/2 -translate-y-1/2 cursor-w-resize opacity-20 hover:opacity-100 transition-opacity bg-blue-500 rounded-full"
            style={{ 
              width: '6px',
              height: `${Math.min(60, dimensions.height * 0.3)}px`,
              left: '-3px'
            }}
          />
          <div
            className="react-resizable-handle absolute right-0 top-1/2 -translate-y-1/2 cursor-e-resize opacity-20 hover:opacity-100 transition-opacity bg-blue-500 rounded-full"
            style={{ 
              width: '6px',
              height: `${Math.min(60, dimensions.height * 0.3)}px`,
              right: '-3px'
            }}
          />
          {['nw', 'ne', 'sw', 'se'].map((corner) => (
            <div
              key={corner}
              className={`react-resizable-handle absolute w-3 h-3 cursor-${corner}-resize opacity-20 hover:opacity-100 transition-opacity bg-blue-500 rounded-sm`}
              style={{
                [corner[0] === 'n' ? 'top' : 'bottom']: '-6px',
                [corner[1] === 'e' ? 'right' : 'left']: '-6px'
              }}
            />
          ))}
        </>
      }
      style={{ overflow: 'visible', transition: 'height 0.2s ease' }}
    >
      <Card
        ref={contentRef}
        className={cn(
          "w-full h-full transition-all duration-200 rounded-lg p-0 shadow-sm border bg-background",
          selected ? "ring-2 ring-blue-400" : "ring-0",
          isCollapsed ? "h-[40px] overflow-hidden" : "overflow-visible"
        )}
      >
        <Badge
          className={cn(
            "absolute -top-2 right-2 px-2 py-0.5 text-xs font-medium flex items-right",
            statusConfig[data.status].color,
          )}
        >
          {statusConfig[data.status].icon} {data.status}
        </Badge>

        <div 
          className="bg-muted px-4 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-muted/70 transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center">
            <Terminal className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">{data.title}</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 transition-transform", isCollapsed ? "rotate-180" : "")} />
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="space-y-3">
            <div className="text-sm font-medium">Run command</div>
            <Input
              value={data.command}
              className="font-mono text-sm"
              readOnly
            />
            {data.additionalInputs?.map((input, index) => (
              <Input
                key={index}
                value={input.value}
                placeholder={input.placeholder}
                className="font-mono text-sm mt-2"
                readOnly
              />
            ))}
          </div>

          <div className="flex justify-end">
            <button
              className="bg-secondary px-4 py-1.5 text-sm font-medium rounded hover:bg-secondary/80 transition-colors flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Run
            </button>
          </div>
        </CardContent>

        <div className="border-t">
          <button
            className="w-full bg-muted px-4 py-2 text-sm font-medium flex items-center justify-between hover:bg-muted/70 transition-colors"
            onClick={() => setShowLogs(!showLogs)}
          >
            <span className="flex items-center">
              <Terminal className="w-4 h-4 mr-2" />
              Logs
            </span>
            {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showLogs && (
            <div className="logs-container p-4 bg-muted/50 max-h-[200px] overflow-y-auto font-mono text-xs">
              {data.logs?.length ? (
                data.logs.map((log, index) => (
                  <div key={index} className="py-1 border-b last:border-0">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground italic">No logs available</div>
              )}
            </div>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-blue-500 border-2 border-white dark:border-slate-900"
          style={{ right: '-6px' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-blue-500 border-2 border-white dark:border-slate-900"
          style={{ left: '-6px' }}
        />
      </Card>
    </ResizableBox>
  )
}