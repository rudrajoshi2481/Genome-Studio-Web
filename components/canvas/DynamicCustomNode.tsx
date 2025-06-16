"use client"

import React, { useMemo, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { toast } from "sonner";

// Define NodeIO interface here since it's not exported from CustomNode
export interface NodeIO {
  id?: string;
  name: string;
  type: string;
  description?: string;
}

// Define the shape of the node data
interface NodeData {
  title: string;
  description: string;
  inputs: NodeIO[];
  outputs: NodeIO[];
  language: string;
  function_name: string;
  source_code: string;
  node_id: string;
  is_public: boolean;
  tags: string[];
  instance_id: string;
  onNodeDelete?: (nodeId: string) => void;
}

// Define the props for our custom node
interface DynamicCustomNodeProps {
  id: string;
  data: NodeData;
  selected?: boolean;
}

const DynamicCustomNode: React.FC<DynamicCustomNodeProps> = ({ id, data, selected }) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 200, height: 100 });

  // Calculate node dimensions for proper handle spacing
  useLayoutEffect(() => {
    if (nodeRef.current) {
      const { offsetWidth, offsetHeight } = nodeRef.current;
      setDimensions({
        width: offsetWidth,
        height: offsetHeight
      });
      updateNodeInternals(id);
    }
  }, [id, data.inputs?.length, data.outputs?.length, updateNodeInternals]);

  // Calculate handle position based on index and total count
  const calculateHandlePosition = (index: number, total: number) => {
    // Fixed header height + padding
    const headerHeight = 40;
    
    // Start positioning handles after the header
    const startY = headerHeight + 10; // Header height + some padding
    
    // Fixed spacing between handles
    const spacing = 30;
    return startY + (spacing * index);
  };

  // Generate input handles dynamically
  const inputHandles = useMemo(() => {
    if (!data.inputs || data.inputs.length === 0) return null;
    
    return data.inputs.map((input, index) => {
      const topPosition = calculateHandlePosition(index, data.inputs?.length || 0);
      
      return (
        <div key={`input-container-${input.id || index}`} className="absolute left-0" style={{ top: topPosition }}>
          {/* Handle */}
          <Handle
            key={`input-${input.id || index}`}
            id={`input-${input.id || index}`}
            type="target"
            position={Position.Left}
            style={{ 
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#10B981', // Green color for inputs
              width: 10,
              height: 10,
              border: '2px solid white',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
              zIndex: 10
            }}
          />
          
          {/* Visible label */}
          <div className="flex items-center ml-3 h-6">
            <div className="text-xs font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 whitespace-nowrap">
              {input.name}
              <span className="text-gray-400 ml-1">{input.type}</span>
            </div>
          </div>
        </div>
      );
    });
  }, [data.inputs]);

  // Generate output handles dynamically  
  const outputHandles = useMemo(() => {
    if (!data.outputs || data.outputs.length === 0) return null;
    
    return data.outputs.map((output, index) => {
      const topPosition = calculateHandlePosition(index, data.outputs?.length || 0);
      
      return (
        <div key={`output-container-${output.id || index}`} className="absolute right-0" style={{ top: topPosition }}>
          {/* Visible label */}
          <div className="flex items-center mr-3 h-6 justify-end">
            <div className="text-xs font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 whitespace-nowrap">
              {output.name}
              <span className="text-gray-400 ml-1">{output.type}</span>
            </div>
          </div>
          
          {/* Handle */}
          <Handle
            key={`output-${output.id || index}`}
            id={`output-${output.id || index}`}
            type="source"
            position={Position.Right}
            style={{ 
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#A855F7', // Purple color for outputs
              width: 10,
              height: 10,
              border: '2px solid white',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
              zIndex: 10
            }}
          />
        </div>
      );
    });
  }, [data.outputs]);

  // Determine the minimum height based on number of inputs/outputs
  const minHeight = useMemo(() => {
    // Base height: header (40px) + content padding (24px) + description (~20px) + function name (30px) + run button (45px)
    const baseHeight = 159;
    
    // Calculate height for input and output ports
    const inputsHeight = (data.inputs?.length || 0) * 32; // 32px per input port
    const outputsHeight = (data.outputs?.length || 0) * 32; // 32px per output port
    
    // Add divider height if both inputs and outputs exist
    const dividerHeight = (data.inputs?.length && data.outputs?.length) ? 1 : 0;
    
    return Math.max(180, baseHeight + inputsHeight + outputsHeight + dividerHeight);
  }, [data.inputs?.length, data.outputs?.length]);

  return (
    <div
      ref={nodeRef}
      className={`rounded-lg shadow-md ${selected ? 'ring-2 ring-zinc-700' : ''} bg-white overflow-visible dark:bg-zinc-950 dark:border dark:border-zinc-800`}
      style={{ 
        width: 280, 
        minHeight: minHeight,
        position: 'relative'
      }}
    >
      {/* Node header with title */}
      <div className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between">
        <div className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{data.title || 'Untitled Node'}</div>
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full text-zinc-700 dark:text-zinc-300">
            {data.language || 'python'}
          </div>
          <button 
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              // Use the onNodeDelete function to remove this node
              if (typeof data.onNodeDelete === 'function') {
                data.onNodeDelete(id);
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18"></path>
              <path d="M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Node content */}
      <div className="p-3">
        {/* Description */}
        {data.description && (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">{data.description}</div>
        )}
        
        {/* Node metadata */}
        <div className="flex justify-end text-xs text-zinc-500 dark:text-zinc-400 mt-2 mb-2">
          <div className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-sm border border-zinc-200 dark:border-zinc-700">
            {data.function_name || 'function'}
          </div>
        </div>
      </div>
      
      {/* Ports section */}
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        {/* Input ports */}
        {data.inputs && data.inputs.length > 0 && (
          <div className="py-1">
            {data.inputs.map((input, idx) => (
              <div key={`port-${input.id || idx}`} className="relative h-8 flex items-center px-3">
                {/* Input handle */}
                <Handle
                  id={`input-${input.id || idx}`}
                  type="target"
                  position={Position.Left}
                  style={{ 
                    left: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#18181b', // Zinc-900 for inputs
                    width: 10,
                    height: 10,
                    border: '2px solid white',
                    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
                    zIndex: 10
                  }}
                />
                {/* Input label */}
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 ml-2">
                  {input.name}
                  <span className="text-zinc-400 dark:text-zinc-500 ml-1">{input.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Output ports */}
        {data.outputs && data.outputs.length > 0 && (
          <div className="py-1 border-t border-zinc-200 dark:border-zinc-800">
            {data.outputs.map((output, idx) => (
              <div key={`port-${output.id || idx}`} className="relative h-8 flex items-center justify-end px-3">
                {/* Output label */}
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mr-2 text-right">
                  {output.name}
                  <span className="text-zinc-400 dark:text-zinc-500 ml-1">{output.type}</span>
                </div>
                {/* Output handle */}
                <Handle
                  id={`output-${output.id || idx}`}
                  type="source"
                  position={Position.Right}
                  style={{ 
                    right: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#18181b', // Zinc-900 for outputs
                    width: 10,
                    height: 10,
                    border: '2px solid white',
                    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
                    zIndex: 10
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Run button at bottom */}
      <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800">
        <Button 
          variant="default" 
          size="sm" 
          className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white"
          onClick={() => {
            toast.success(`Running ${data.title || 'node'}...`);
            // Add your run logic here
          }}
        >
          <Play className="h-3 w-3 mr-1" />
          Run
        </Button>
      </div>
    </div>
  );
};

export default DynamicCustomNode;
