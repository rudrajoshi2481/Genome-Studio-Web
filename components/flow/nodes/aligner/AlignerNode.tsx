import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { AlignerNodeData } from '../../types';
import { useNodeState } from '../bash/useNodeState';

const AlignerNode = React.forwardRef<HTMLDivElement, NodeProps<AlignerNodeData>>((props, ref) => {
  const { data, selected } = props;
  const {
    showLogs,
    isCollapsed,
    toggleLogs,
    toggleCollapse,
    dimensions,
    nodeRef,
  } = useNodeState();

  const [selectedAligner, setSelectedAligner] = useState(data.aligner || 'bwa');
  const [threads, setThreads] = useState(data.threads || 8);
  const [reference, setReference] = useState(data.reference || 'reference.fa');
  const [inputR1, setInputR1] = useState(data.inputR1 || 'R1.fastq');
  const [inputR2, setInputR2] = useState(data.inputR2 || 'R2.fastq');
  const [outputFile, setOutputFile] = useState(data.outputFile || 'aligned.sam');
  const [command, setCommand] = useState('');

  const generateCommand = useCallback(() => {
    switch (selectedAligner) {
      case 'bwa':
        return `bwa mem -SP5 -t ${threads} ${reference} ${inputR1} ${inputR2} > ${outputFile}`;
      case 'bowtie2':
        return `bowtie2 -p ${threads} -x ${reference} -1 ${inputR1} -2 ${inputR2} -S ${outputFile}`;
      case 'hisat2':
        return `hisat2 -p ${threads} -x ${reference} -1 ${inputR1} -2 ${inputR2} -S ${outputFile}`;
      case 'star':
        return `STAR --runThreadN ${threads} --genomeDir ${reference} --readFilesIn ${inputR1} ${inputR2} --outFileNamePrefix ${outputFile}`;
      default:
        return '';
    }
  }, [selectedAligner, threads, reference, inputR1, inputR2, outputFile]);

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
                  {selectedAligner} | {threads} threads
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
                    <label className="text-sm font-medium">Aligner</label>
                    <Select value={selectedAligner} onValueChange={setSelectedAligner}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bwa">BWA</SelectItem>
                        <SelectItem value="bowtie2">Bowtie2</SelectItem>
                        <SelectItem value="hisat2">HISAT2</SelectItem>
                        <SelectItem value="star">STAR</SelectItem>
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
                    <label className="text-sm font-medium">Reference</label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Input R1</label>
                    <Input
                      value={inputR1}
                      onChange={(e) => setInputR1(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Input R2</label>
                    <Input
                      value={inputR2}
                      onChange={(e) => setInputR2(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Output</label>
                    <Input
                      value={outputFile}
                      onChange={(e) => setOutputFile(e.target.value)}
                      className="text-sm"
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
});

AlignerNode.displayName = 'AlignerNode';

export default AlignerNode;
