import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { NodeData } from '../types/nodeFactory';
import { useNodeState } from '../bash/useNodeState';

interface SamToBamData extends NodeData {
  inputFile?: string;
  outputFile?: string;
  sortBy?: 'coordinate' | 'name';
  threads?: number;
  compressionLevel?: number;
}

const SamToBamNode: React.FC<NodeProps<SamToBamData>> = ({ data, selected }) => {
  const {
    showLogs,
    isCollapsed,
    toggleLogs,
    toggleCollapse,
    dimensions,
    nodeRef,
  } = useNodeState();

  const [inputFile, setInputFile] = useState(data.inputFile || 'aligned.sam');
  const [outputFile, setOutputFile] = useState(data.outputFile || 'aligned.sorted.bam');
  const [sortBy, setSortBy] = useState<'coordinate' | 'name'>(data.sortBy || 'coordinate');
  const [threads, setThreads] = useState(data.threads || 4);
  const [compressionLevel, setCompressionLevel] = useState(data.compressionLevel || 6);
  const [command, setCommand] = useState('');

  const generateCommand = useCallback(() => {
    const sortOption = sortBy === 'name' ? 'n' : '';
    return `samtools view -bS ${inputFile} | samtools sort -${sortOption} -@ ${threads} -l ${compressionLevel} -o ${outputFile}`;
  }, [inputFile, outputFile, sortBy, threads, compressionLevel]);

  useEffect(() => {
    setCommand(generateCommand());
  }, [generateCommand]);

  const handleRun = useCallback(() => {
    console.log('Running command:', command);
  }, [command]);

  return (
    <div ref={nodeRef} className="react-flow__node-content">
      <Card
        className={`w-[${dimensions.width}px] transition-all duration-200 p-0 ${
          selected ? 'ring-2 ring-blue-400' : ''
        }`}
      >
        <div className="p-4 space-y-4 w-[500px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isCollapsed ? "secondary" : "outline"}>{data.status}</Badge>
              {isCollapsed && (
                <span className="text-sm text-muted-foreground">
                  {sortBy} sort | {outputFile}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="p-1 h-auto"
            >
              {isCollapsed ? <ChevronDown /> : <ChevronUp />}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{data.title}</h3>
            {isCollapsed && (
              <Button
                onClick={handleRun}
                size="sm"
                variant="ghost"
                className="whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!isCollapsed && (
            <>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Run command</h4>
                  <div className="flex gap-2">
                    <Input
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      onClick={handleRun}
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      <Play className="w-4 h-4 mr-1" /> Run
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Input SAM file</label>
                    <Input
                      value={inputFile}
                      onChange={(e) => setInputFile(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Output BAM file</label>
                    <Input
                      value={outputFile}
                      onChange={(e) => setOutputFile(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort by</label>
                    <Select value={sortBy} onValueChange={(value: 'coordinate' | 'name') => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coordinate">Coordinate</SelectItem>
                        <SelectItem value="name">Read name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Threads</label>
                    <Input
                      type="number"
                      value={threads}
                      onChange={(e) => setThreads(Number(e.target.value))}
                      className="text-sm"
                      min={1}
                      max={32}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Compression level</label>
                    <Input
                      type="number"
                      value={compressionLevel}
                      onChange={(e) => setCompressionLevel(Number(e.target.value))}
                      className="text-sm"
                      min={0}
                      max={9}
                    />
                  </div>
                </div>
              </div>

              {showLogs && data.logs && (
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

export default SamToBamNode;
