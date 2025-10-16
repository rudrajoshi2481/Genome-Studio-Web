"use client"

import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Pencil } from 'lucide-react';

// Define data types
export type DataType = 'string' | 'int' | 'float' | 'bool' | 'list' | 'dict';

// Define the shape of the data type node data
export interface DataTypeNodeData extends Record<string, any> {
  dataType: DataType;
  value: any;
  label?: string;
}

interface DataTypeNodeProps extends NodeProps {
  data: DataTypeNodeData;
}

export const DataTypeNode = ({ id, data, selected }: DataTypeNodeProps) => {
  const nodeData: DataTypeNodeData = data as DataTypeNodeData;
  const { setNodes } = useReactFlow();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<any>(
    nodeData.value !== undefined && nodeData.value !== null 
      ? nodeData.value 
      : getDefaultValue(nodeData.dataType)
  );
  const [label, setLabel] = useState<string>(nodeData.label || nodeData.dataType);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelError, setLabelError] = useState<string>('');
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Validate variable name
  const isValidVariableName = (name: string): { valid: boolean; error: string } => {
    if (!name || name.trim() === '') {
      return { valid: false, error: 'Variable name cannot be empty' };
    }
    
    // Check if starts with a number
    if (/^\d/.test(name)) {
      return { valid: false, error: 'Cannot start with a number' };
    }
    
    // Check for spaces
    if (/\s/.test(name)) {
      return { valid: false, error: 'Cannot contain spaces' };
    }
    
    // Check for special characters (only alphanumeric and underscore allowed)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return { valid: false, error: 'Only letters, numbers, and underscores allowed' };
    }
    
    return { valid: true, error: '' };
  };

  // Sync value with node data when it changes externally
  useEffect(() => {
    if (nodeData.value !== undefined && nodeData.value !== value) {
      setValue(nodeData.value);
    }
  }, [nodeData.value]);

  // Focus label input when editing starts
  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  // Get default value based on data type
  function getDefaultValue(dataType: DataType): any {
    switch (dataType) {
      case 'string':
        return '';
      case 'int':
        return 0;
      case 'float':
        return 0.0;
      case 'bool':
        return false;
      case 'list':
        return '[]';
      case 'dict':
        return '{}';
      default:
        return '';
    }
  }

  // Get icon for data type
  function getDataTypeIcon(dataType: DataType): string {
    switch (dataType) {
      case 'string':
        return '📝';
      case 'int':
        return '🔢';
      case 'float':
        return '🔢';
      case 'bool':
        return '✓';
      case 'list':
        return '📋';
      case 'dict':
        return '📚';
      default:
        return '📦';
    }
  }

  // Get color for data type (subtle header colors)
  function getDataTypeColor(dataType: DataType): string {
    switch (dataType) {
      case 'string':
        return 'bg-green-50 border-green-200';
      case 'int':
        return 'bg-blue-50 border-blue-200';
      case 'float':
        return 'bg-cyan-50 border-cyan-200';
      case 'bool':
        return 'bg-purple-50 border-purple-200';
      case 'list':
        return 'bg-orange-50 border-orange-200';
      case 'dict':
        return 'bg-pink-50 border-pink-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  }

  // Handle value change
  const handleValueChange = (newValue: any) => {
    setValue(newValue);
    
    // Update the node data in ReactFlow
    // This will trigger onNodesChange which sets the dirty flag
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              value: newValue,
            },
          };
        }
        return node;
      })
    );
    
    // Manually trigger dirty flag if setDirty is available in node data
    if (nodeData.setDirty && nodeData.tabId && nodeData.updateTab) {
      nodeData.setDirty(nodeData.tabId, true);
      nodeData.updateTab(nodeData.tabId, { isDirty: true });
    }
  };

  // Handle label change
  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    
    // Update the node data in ReactFlow
    // This will trigger onNodesChange which sets the dirty flag
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: newLabel,
            },
          };
        }
        return node;
      })
    );
    
    // Manually trigger dirty flag if setDirty is available in node data
    if (nodeData.setDirty && nodeData.tabId && nodeData.updateTab) {
      nodeData.setDirty(nodeData.tabId, true);
      nodeData.updateTab(nodeData.tabId, { isDirty: true });
    }
  };

  // Handle label blur
  const handleLabelBlur = () => {
    const validation = isValidVariableName(label);
    
    if (!validation.valid) {
      // If validation fails, show error and revert to previous valid label
      setLabelError(validation.error);
      setLabel(nodeData.label || nodeData.dataType);
      setIsEditingLabel(false);
      
      // Clear error after 3 seconds
      setTimeout(() => setLabelError(''), 3000);
      return;
    }
    
    setLabelError('');
    setIsEditingLabel(false);
    
    if (label !== nodeData.label) {
      // If label has changed and is valid, save it
      handleLabelChange(label);
    }
  };

  // Render input based on data type
  const renderInput = () => {
    switch (nodeData.dataType) {
      case 'string':
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Enter string..."
            className="text-xs h-8"
          />
        );
      
      case 'int':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseInt(e.target.value);
              handleValueChange(isNaN(val) ? 0 : val);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Enter integer..."
            className="text-xs h-8"
            step="1"
          />
        );
      
      case 'float':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const val = e.target.value === '' ? 0.0 : parseFloat(e.target.value);
              handleValueChange(isNaN(val) ? 0.0 : val);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Enter float..."
            className="text-xs h-8"
            step="0.1"
          />
        );
      
      case 'bool':
        return (
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id={`bool-${id}`}
              checked={value}
              onCheckedChange={(checked) => handleValueChange(checked)}
            />
            <Label htmlFor={`bool-${id}`} className="text-xs cursor-pointer">
              {value ? 'True' : 'False'}
            </Label>
          </div>
        );
      
      case 'list':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder='["item1", "item2"]'
            className="text-xs min-h-[60px] font-mono"
          />
        );
      
      case 'dict':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder='{"key": "value"}'
            className="text-xs min-h-[60px] font-mono"
          />
        );
      
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Enter value..."
            className="text-xs h-8"
          />
        );
    }
  };

  return (
    <div
      ref={nodeRef}
      className={cn(
        "rounded-lg border shadow-md transition-all duration-200 bg-white",
        selected ? "ring-2 ring-blue-500 shadow-lg" : "border-gray-200",
        "min-w-[200px]"
      )}
    >
        {/* Header */}
        <div className={cn(
          "px-3 py-2 border-b rounded-t-lg",
          getDataTypeColor(nodeData.dataType)
        )}>
          <div className="flex items-center gap-2">
            <span className="text-base">{getDataTypeIcon(nodeData.dataType)}</span>
            <div className="flex-1">
              <div className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">
                {nodeData.dataType}
              </div>
              {isEditingLabel ? (
                <input
                  ref={labelInputRef}
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={handleLabelBlur}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      const validation = isValidVariableName(label);
                      if (validation.valid) {
                        handleLabelChange(label);
                        setIsEditingLabel(false);
                        setLabelError('');
                      } else {
                        setLabelError(validation.error);
                        setTimeout(() => setLabelError(''), 3000);
                      }
                    } else if (e.key === 'Escape') {
                      setLabel(nodeData.label || nodeData.dataType);
                      setIsEditingLabel(false);
                      setLabelError('');
                    }
                  }}
                  className="text-xs font-medium text-gray-800 bg-white/80 border border-gray-300 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              ) : (
                <div 
                  className="text-xs font-medium text-gray-800 flex items-center gap-1 cursor-pointer hover:text-blue-600 group"
                  onClick={() => setIsEditingLabel(true)}
                >
                  {label}
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {labelError && (
          <div className="px-3 py-1 bg-red-50 border-t border-red-200">
            <p className="text-xs text-red-600">{labelError}</p>
          </div>
        )}

        {/* Content */}
        <div className="px-3 py-3 bg-white">
          {renderInput()}
        </div>

        {/* Output Handle - styled like CustomNode */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-2.5 h-2.5 !bg-blue-500 !border-2 !border-white rounded-full"
          style={{ right: -5 }}
        />
    </div>
  );
};

export default DataTypeNode;
