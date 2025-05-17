'use client'

import React, { useState } from "react"
import type { Cell } from "../store/useNotebookStore"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { CodeMirrorEditor } from "./CodeMirrorEditor"

interface CodeCellProps {
  cell: Cell
  onContentChange: (content: string[]) => void
  onExecute: () => void
}

export const CodeCell: React.FC<CodeCellProps> = ({ 
  cell, 
  onContentChange, 
  onExecute,
}) => {
  const [isExecuting, setIsExecuting] = useState(false)

  const handleExecute = async () => {
    setIsExecuting(true)
    await onExecute()
    setIsExecuting(false)
  }

  return (
    <div className="relative group ">
      {/* Left gutter with execution indicators */}
      <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col items-center pt-2">
        {/* Execute button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={handleExecute}
            disabled={isExecuting}
          >
            <Play className="h-4 w-4" />
          </Button>
          <div className="text-xs font-mono text-muted-foreground">
            In[{cell.metadata.executionCount || ' '}]
          </div>
        </div>
      </div>

      {/* Code cell content */}
      <div className="ml-16 rounded-md bg-card overflow-hidden">
        {/* Code input area */}
        <div className="relative bg-muted/5 ">
          <CodeMirrorEditor
            value={cell.content.join("\n")}
            onChange={(value) => onContentChange(value.split("\n"))}
            language={cell.metadata.language as 'python'}
          />

          {/* Language indicator */}
          <div className="absolute top-2 right-3 text-xs text-muted-foreground uppercase tracking-wide">
            {cell.metadata.language || "python"}
          </div>
        </div>

        {/* Cell output area */}
        {cell.outputs && cell.outputs.length > 0 && (
          <div className="border-t">
            <div className="absolute left-0 w-16 flex flex-col items-center pt-2">
              <div className="text-xs font-mono text-muted-foreground">Out[{cell.metadata.executionCount || ' '}]</div>
            </div>
            <pre className="ml-16 p-4 text-sm whitespace-pre-wrap bg-muted/5">{cell.outputs.join("\n")}</pre>
          </div>
        )}
      </div>
    </div>
  )
}