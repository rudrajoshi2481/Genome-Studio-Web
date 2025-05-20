import { Terminal, ChevronDown, ChevronUp, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusConfig } from "./config";
import { BashNodeData } from "./types";
import { Handle, Position } from "reactflow";

interface BashNodeContentProps {
  data: BashNodeData;
  selected: boolean;
  isCollapsed: boolean;
  showLogs: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
  cardContentRef: React.RefObject<HTMLDivElement | null>;
  cardFooterRef: React.RefObject<HTMLDivElement | null>;
  headerRef: React.RefObject<HTMLDivElement | null>;
  onToggleCollapse: () => void;
  onToggleLogs: () => void;
}

export function BashNodeContent({
  data,
  selected,
  isCollapsed,
  showLogs,
  contentRef,
  cardContentRef,
  cardFooterRef,
  headerRef,
  onToggleCollapse,
  onToggleLogs
}: BashNodeContentProps) {
  return (
    <Card
      ref={contentRef}
      className={cn(
        "w-full h-full transition-all duration-200 rounded-lg p-0 shadow-sm border bg-background flex flex-col",
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
        ref={headerRef}
        className="bg-muted px-4 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
      >
        <div className="flex items-center">
          <Terminal className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">{data.title}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isCollapsed ? "rotate-180" : "")} />
      </div>

      <CardContent ref={cardContentRef} className="space-y-3 m-0 w-full flex-1">
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
            onClick={(e) => {
              e.stopPropagation();
              onToggleLogs();
            }}
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
  );
}
