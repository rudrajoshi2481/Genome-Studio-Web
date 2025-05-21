import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { useNodeState } from '../bash/useNodeState';
import { NodeData } from '../types/nodeFactory';

export interface BaseNodeProps extends NodeProps {
  data: NodeData;
  children?: React.ReactNode;
  onRun?: () => void;
  collapsedContent?: React.ReactNode;
  headerActions?: React.ReactNode;
  showHandles?: boolean;
  width?: number;
}

export const BaseNode = React.forwardRef<HTMLDivElement, BaseNodeProps>((props, ref) => {
  const {
    data,
    selected,
    children,
    onRun,
    collapsedContent,
    headerActions,
    showHandles = true,
    width = 500,
  } = props;

  const {
    showLogs,
    isCollapsed,
    toggleLogs,
    toggleCollapse,
    nodeRef,
  } = useNodeState();

  return (
    <div ref={nodeRef} className="react-flow__node-content">
      <Card
        className={`w-[${width}px] transition-all duration-200 p-0 ${
          selected ? 'ring-2 ring-blue-400' : ''
        }`}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant={
                  data.status === 'Running' ? 'default' :
                  data.status === 'Failed' ? 'destructive' :
                  isCollapsed ? 'secondary' : 'outline'
                }
              >
                {data.status}
              </Badge>
              {isCollapsed && collapsedContent}
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="p-1 h-auto"
              >
                {isCollapsed ? <ChevronDown /> : <ChevronUp />}
              </Button>
            </div>
          </div>

          {/* Title & Run Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{data.title}</h3>
            {isCollapsed && onRun && (
              <Button
                onClick={onRun}
                size="sm"
                variant="ghost"
                className="whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Content */}
          {!isCollapsed && (
            <div className="space-y-4">
              {children}

              {/* Logs */}
              {showLogs && data.logs && data.logs.length > 0 && (
                <div>
                  <h4 
                    className="text-sm font-medium mb-2 flex items-center cursor-pointer"
                    onClick={toggleLogs}
                  >
                    Logs {showLogs ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />}
                  </h4>
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {data.logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showHandles && (
          <>
            <Handle
              type="target"
              position={Position.Left}
              className="w-2 h-2 bg-blue-500"
            />
            <Handle
              type="source"
              position={Position.Right}
              className="w-2 h-2 bg-blue-500"
            />
          </>
        )}
      </Card>
    </div>
  );
});

BaseNode.displayName = 'BaseNode';

export default BaseNode;
