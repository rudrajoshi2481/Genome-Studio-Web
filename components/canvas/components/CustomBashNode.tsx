// components/CustomBashNode.tsx
"use client"

import type React from "react"
import { ResizableBox } from 'react-resizable'
import 'react-resizable/css/styles.css'
import { Handle, Position, type NodeProps } from "reactflow"
// import { useDraggable } from "@reactflow/core"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Terminal, ChevronDown, ChevronUp, Play, CheckCircle, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const statusConfig = {
  Completed: { color: "bg-green-500/20 text-green-600", icon: <CheckCircle className="w-3 h-3 mr-1" /> },
  Running: { color: "bg-blue-500/20 text-blue-600", icon: <Clock className="w-3 h-3 mr-1 animate-spin" /> },
  Failed: { color: "bg-red-500/20 text-red-600", icon: <XCircle className="w-3 h-3 mr-1" /> },
  Upcoming: { color: "bg-gray-500/20 text-gray-600", icon: <Clock className="w-3 h-3 mr-1" /> }
}

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
  const [dimensions, setDimensions] = useState({ width: 300, height: 250 })
  const [autoSizing, setAutoSizing] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const cardContentRef = useRef<HTMLDivElement>(null)
  const cardFooterRef = useRef<HTMLDivElement>(null)
  const initialWidthRef = useRef(300)
  const nodeRef = useRef<HTMLDivElement>(null)
  // const { setDraggable } = useDraggable(id)

  useEffect(() => {
    if (!autoSizing || isCollapsed || !contentRef.current) return;

    if (initialWidthRef.current === 300) {
      initialWidthRef.current = dimensions.width;
    }

    const cardContent = cardContentRef.current;
    const cardFooter = cardFooterRef.current;
    const headerHeight = 40;

    let contentHeight = 0;
    let footerHeight = 0;

    if (cardContent) {
      contentHeight = cardContent.scrollHeight;
    }

    if (cardFooter) {
      footerHeight = cardFooter.scrollHeight;
    }

    const logsContainer = contentRef.current.querySelector('.logs-container') as HTMLElement;
    const logsHeight = showLogs && logsContainer ? Math.min(200, logsContainer.scrollHeight) : 0;

    const totalHeight = headerHeight + contentHeight + footerHeight + (showLogs ? logsHeight : 0);

    setDimensions(prev => ({
      width: prev.width,
      height: isCollapsed ? 40 : totalHeight
    }));
  }, [showLogs, isCollapsed, autoSizing, data]);

  useEffect(() => {
    if (contentRef.current) {
      setAutoSizing(true);
    }
  }, []);

  const handleResize = (_event: React.SyntheticEvent, { size }: { size: { width: number; height: number } }) => {
    _event.stopPropagation();
    setAutoSizing(false);
    setDimensions({
      width: size.width,
      height: size.height
    });
  }

  const toggleLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLogs(!showLogs);
    setAutoSizing(true);
  }

  const handleResizeStart = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setAutoSizing(false);
    // setDraggable(false);
    document.body.classList.add('node-resizing');

    const handleMouseMove = (e: MouseEvent) => {
      e.stopPropagation();
    }

    document.addEventListener('mousemove', handleMouseMove, true);

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.body.classList.remove('node-resizing');
      setTimeout(() => {
        // setDraggable(true);
        setAutoSizing(true);
      }, 100);
    }

    document.addEventListener('mouseup', handleMouseUp, { once: true });
  }

  return (
    <div ref={nodeRef} className="react-flow__node-content" style={{ position: 'relative' }}>
      <ResizableBox 
        width={dimensions.width}
        height={isCollapsed ? 40 : dimensions.height}
        minConstraints={[200, 40]}
        maxConstraints={[800, 600]}
        axis="both"
        resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
        onResize={handleResize}
        onResizeStart={handleResizeStart}
        draggableOpts={{ 
          offsetParent: document.body,
          disabled: true
        }}
        style={{ 
          overflow: 'visible', 
          transition: 'height 0.2s ease',
          position: 'relative',
          zIndex: 1
        }}
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
              "absolute -top-6 right-2 px-2 py-0.5 text-xs font-medium flex items-right",
              statusConfig[data.status].color,
            )}
          >
            {statusConfig[data.status].icon} {data.status}
          </Badge>

          <div 
            className="bg-muted px-4 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
          >
            <div className="flex items-center">
              <Terminal className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">{data.title}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", isCollapsed ? "rotate-180" : "")} />
          </div>

          <CardContent ref={cardContentRef} className="space-y-3 m-0 w-full">
            <div className="space-y-3 w-full">
              <div className="text-sm font-medium">Run command</div>
              <Input
                value={data.command}
                className="font-mono text-sm"
                readOnly
                onClick={(e) => e.stopPropagation()}
              />
              {data.additionalInputs?.map((input, index) => (
                <Input
                  key={index}
                  value={input.value}
                  placeholder={input.placeholder}
                  className="font-mono text-sm mt-2"
                  readOnly
                  onClick={(e) => e.stopPropagation()}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                className="px-4 py-1.5 text-sm font-medium rounded flex items-center"
                onClick={(e) => e.stopPropagation()}
                variant={"outline"}
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Run
              </Button>
            </div>
          </CardContent>
          
          <CardFooter ref={cardFooterRef} className="w-full p-0 m-0">
            <div className="w-full border-t">
              <button
                className="w-full bg-muted px-4 py-2 text-sm font-medium flex items-center justify-between hover:bg-muted/70 transition-colors"
                onClick={toggleLogs}
              >
                <span className="flex items-center">
                  <Terminal className="w-4 h-4 mr-2" />
                  Logs
                </span>
                {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showLogs && (
                <div className="logs-container p-4 bg-muted/50 max-h-[200px] overflow-y-auto font-mono text-xs w-full">
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
          </CardFooter>
          
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
    </div>
  )
}
