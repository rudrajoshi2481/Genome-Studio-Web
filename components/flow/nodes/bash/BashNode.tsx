import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NodeData } from '../types/nodeFactory';
import { useNodeState } from './useNodeState';

const BashNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  const {
    showLogs,
    isCollapsed,
    toggleLogs,
    toggleCollapse,
    dimensions,
    nodeRef,
  } = useNodeState();

  return (
    <div ref={nodeRef} className="react-flow__node-content">
      <Card
        className={`w-[${dimensions.width}px] transition-all duration-200 ${
          selected ? 'ring-2 ring-blue-400' : ''
        }`}
      >
        <div className="p-4">
          <Badge variant="outline">{data.status}</Badge>
          <h3 className="text-lg font-semibold mt-2">{data.title}</h3>
          <pre className="mt-2 bg-muted p-2 rounded text-sm">{data.command}</pre>
          
          {!isCollapsed && (
            <>
              <button
                onClick={toggleLogs}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground"
              >
                {showLogs ? 'Hide Logs' : 'Show Logs'}
              </button>
              
              {showLogs && data.logs && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {data.logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
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
      </Card>
    </div>
  );
};

export default BashNode;
