"use client"

import type React from "react"

import { Handle, Position, type NodeProps } from "reactflow"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Terminal, ChevronDown, ChevronUp, Play, CheckCircle, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface BashNodeData {
  status: "Completed" | "Running" | "Failed" | "Upcoming"
  command: string
  logs?: string[]
}

export default function CustomBashNode({ data, selected }: NodeProps<BashNodeData>) {
  const [showLogs, setShowLogs] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

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

  return (
    <Card
    className={cn(
      "w-[300px] transition-all duration-200 rounded-none p-0 shadow-none border-0 border-1 border-black",
      selected ? "ring-2 ring-blue-400" : "ring-0",
      isCollapsed ? "h-[40px] overflow-hidden" : ""
    )}
  >
    
    {/* Status Badge */}
    <Badge
      className={cn(
        "absolute -top-2 right-2 px-2 py-0.5 text-xs font-medium flex items-center",
        statusConfig[data.status].color,
      )}
    >
      {statusConfig[data.status].icon} {data.status}
    </Badge>

    {/* Header */}
    <div 
      className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      onClick={() => setIsCollapsed(!isCollapsed)}
    >
      <div className="flex items-center">
        <Terminal className="w-4 h-4 mr-2 text-slate-700 dark:text-slate-300" />
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Bash Command</span>
      </div>
      <ChevronDown className={cn("w-4 h-4 transition-transform", isCollapsed ? "rotate-180" : "")} />
    </div>

    {/* Content */}
    <CardContent className="space-y-3">
      <div>
        <div className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Run command</div>
        <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2.5 rounded text-sm font-mono border border-slate-200 dark:border-slate-700 overflow-x-auto">
          {data.command}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="bg-slate-200 dark:bg-slate-700 px-4 py-1.5 text-sm font-medium rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center"
          onClick={(e) => {
            e.stopPropagation()
            // Add your run command logic here
          }}
        >
          <Play className="w-3.5 h-3.5 mr-1.5" />
          Run
        </button>
      </div>
    </CardContent>

    {/* Show Logs Section */}
    <div className="border-t border-slate-200 dark:border-slate-700">
      <button
        className="w-full bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        onClick={() => setShowLogs(!showLogs)}
      >
        <span className="flex items-center">
          <Terminal className="w-4 h-4 mr-2" />
          Logs
        </span>
        {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showLogs && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 max-h-[200px] overflow-y-auto font-mono text-xs">
          {data.logs && data.logs.length > 0 ? (
            data.logs.map((log, index) => (
              <div key={index} className="py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                {log}
              </div>
            ))
          ) : (
            <div className="text-slate-500 dark:text-slate-400 italic">No logs available</div>
          )}
        </div>
      )}
    </div>

    {/* Handles */}
    <Handle
      type="source"
      position={Position.Right}
      className="w-3 h-3 !bg-blue-500 border-2 border-white dark:border-slate-900 right-[-6px]"
    />
    <Handle
      type="target"
      position={Position.Left}
      className="w-3 h-3 !bg-blue-500 border-2 border-white dark:border-slate-900 left-[-6px]"
    />
  </Card>
  )
}
