"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useUpdateNodeInternals } from 'reactflow';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Pencil, Focus, Trash2, Copy, Save, Code, Type, Hash, Braces, ToggleLeft, List as ListIcon, ChevronDown, ChevronRight, Dna, Boxes } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';
import { createCustomNode } from '@/lib/services/custom-node-service';

// Define data types
export type DataType = 'string' | 'int' | 'float' | 'bool' | 'list' | 'dict' | 'higlass-track' | 'ngl-structure';

// HiGlass track config: file types → valid track types + default
export const HIGLASS_FILE_TYPES: Record<string, { label: string; tracks: string[] }> = {
  cooler:     { label: 'Cooler (.mcool/.cool)',     tracks: ['heatmap', 'horizontal-heatmap', 'vertical-heatmap', '1d-heatmap'] },
  bigwig:     { label: 'BigWig (.bw/.bigwig)',      tracks: ['line', 'bar', 'horizontal-line', 'horizontal-bar', '1d-heatmap'] },
  bed:        { label: 'BED (.bed)',                tracks: ['bedlike', 'bar', 'horizontal-bar'] },
  bed2d:      { label: 'BEDPE (.bedpe/.bed2d)',     tracks: ['2d-rectangle-domains', 'horizontal-2d-rectangle-domains', 'vertical-2d-rectangle-domains'] },
  vcf:        { label: 'VCF (.vcf/.vcf.gz)',        tracks: ['bedlike'] },
  gff:        { label: 'GFF/GTF (.gff/.gtf)',       tracks: ['gene-annotations', 'horizontal-gene-annotations'] },
  chromsizes: { label: 'Chrom sizes (.sizes)',      tracks: ['chromosome-labels', 'horizontal-chromosome-labels', 'vertical-chromosome-labels'] },
  hitile:     { label: 'Hitile (.hitile)',          tracks: ['line', 'bar', 'horizontal-line', 'horizontal-bar'] },
  multivec:   { label: 'Multivec (.multivec/.mv5)', tracks: ['heatmap', 'horizontal-multivec', 'vertical-multivec'] },
};

export const HIGLASS_POSITIONS = ['center', 'top', 'bottom', 'left', 'right', 'whole', 'gallery'];

// NGL structure config: file types, representations, color schemes
export const NGL_FILE_TYPES: Record<string, string> = {
  auto: 'Auto (from extension)',
  pdb: 'PDB (.pdb/.ent)',
  cif: 'mmCIF (.cif/.mmcif)',
  gro: 'GRO (.gro)',
  pqr: 'PQR (.pqr)',
  mol2: 'MOL2 (.mol2)',
  sdf: 'SDF (.sdf)',
};

export const NGL_REPRESENTATIONS = [
  'cartoon', 'backbone', 'ball+stick', 'licorice', 'hyperball',
  'line', 'point', 'ribbon', 'surface', 'rocket', 'helixorient',
  'contact', 'distance', 'label',
];

export const NGL_COLOR_SCHEMES = [
  'default', 'atomindex', 'chainindex', 'chainname', 'element',
  'residueindex', 'resname', 'sstruc', 'uniform', 'molecule',
  'bfactor', 'hydrophobicity', 'occupancy', 'random',
];

export interface HiGlassTrackSpec {
  file_path: string;
  file_type: string;
  track_type: string; // 'auto' = use default for file type
  position: string;
  name: string;
  view_group: number;
  options: Record<string, unknown>;
}

const DEFAULT_TRACK_SPEC: HiGlassTrackSpec = {
  file_path: '',
  file_type: 'cooler',
  track_type: 'auto',
  position: 'center',
  name: '',
  view_group: 0,
  options: {},
};

export interface NGLStructureSpec {
  file_path: string;
  file_type: string; // 'auto' = detect from extension
  representation: string;
  color_scheme: string; // 'default' = representation default
  name: string;
  options: string; // JSON string of extra NGL representation params
}

const DEFAULT_STRUCTURE_SPEC: NGLStructureSpec = {
  file_path: '',
  file_type: 'auto',
  representation: 'cartoon',
  color_scheme: 'default',
  name: '',
  options: '',
};

// Define the shape of the data type node data
export interface DataTypeNodeData extends Record<string, any> {
  dataType: DataType;
  value: any;
  label?: string;
  isCollapsed?: boolean;
}

interface DataTypeNodeProps extends NodeProps {
  data: DataTypeNodeData;
}

export const DataTypeNode = ({ id, data, selected }: DataTypeNodeProps) => {
  const nodeData: DataTypeNodeData = data as DataTypeNodeData;
  const { setNodes, fitView, getNode } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const { token } = useAuthStore();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<any>(
    nodeData.value !== undefined && nodeData.value !== null 
      ? nodeData.value 
      : getDefaultValue(nodeData.dataType)
  );
  // Local string state for int/float inputs so user can type freely without
  // the controlled numeric value collapsing intermediate states like "05" → "5"
  const [intStr, setIntStr] = useState<string>(() => {
    const v = nodeData.value !== undefined && nodeData.value !== null ? nodeData.value : getDefaultValue(nodeData.dataType);
    return String(v);
  });
  const [floatStr, setFloatStr] = useState<string>(() => {
    const v = nodeData.value !== undefined && nodeData.value !== null ? nodeData.value : getDefaultValue(nodeData.dataType);
    return String(v);
  });
  const [label, setLabel] = useState<string>(nodeData.label || nodeData.dataType);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelError, setLabelError] = useState<string>('');
  const labelInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    // Check localStorage first (instant persistence like viewport), then node data
    if (typeof window !== 'undefined' && nodeData.filePath) {
      const stored = localStorage.getItem(`canvas_node_collapsed_${nodeData.filePath}_${id}`);
      if (stored !== null) return stored === 'true';
    }
    return nodeData.isCollapsed ?? false;
  });

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
      // Also sync the string states for int/float
      if (nodeData.dataType === 'int') setIntStr(String(nodeData.value));
      if (nodeData.dataType === 'float') setFloatStr(String(nodeData.value));
    }
  }, [nodeData.value]);

  // Ensure ReactFlow knows the handle positions when collapse state changes (including initial load)
  useEffect(() => {
    const timer = setTimeout(() => updateNodeInternals(id), 50);
    return () => clearTimeout(timer);
  }, [id, isCollapsed, updateNodeInternals]);

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
      case 'higlass-track':
        return { ...DEFAULT_TRACK_SPEC };
      case 'ngl-structure':
        return { ...DEFAULT_STRUCTURE_SPEC };
      default:
        return '';
    }
  }

  // Get icon for data type
  function getDataTypeIcon(dataType: DataType): React.ComponentType<{ className?: string }> {
    switch (dataType) {
      case 'string':
        return Type;
      case 'int':
        return Hash;
      case 'float':
        return Hash;
      case 'bool':
        return ToggleLeft;
      case 'list':
        return ListIcon;
      case 'dict':
        return Braces;
      case 'higlass-track':
        return Dna;
      case 'ngl-structure':
        return Boxes;
      default:
        return Type;
    }
  }

  // Get badge variant for data type
  function getDataTypeBadgeClass(dataType: DataType): string {
    switch (dataType) {
      case 'string':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'int':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'float':
        return 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20';
      case 'bool':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'list':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'dict':
        return 'bg-pink-500/10 text-pink-700 border-pink-500/20';
      case 'higlass-track':
        return 'bg-teal-500/10 text-teal-700 border-teal-500/20';
      case 'ngl-structure':
        return 'bg-rose-500/10 text-rose-700 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }

  // Get background class for data type header
  function getDataTypeBgClass(dataType: DataType): string {
    switch (dataType) {
      case 'string':
        return 'bg-green-500/10';
      case 'int':
        return 'bg-blue-500/10';
      case 'float':
        return 'bg-cyan-500/10';
      case 'bool':
        return 'bg-purple-500/10';
      case 'list':
        return 'bg-orange-500/10';
      case 'dict':
        return 'bg-pink-500/10';
      case 'higlass-track':
        return 'bg-teal-500/10';
      case 'ngl-structure':
        return 'bg-rose-500/10';
      default:
        return 'bg-muted';
    }
  }

  // Get diagonal stripe pattern color for data type header
  function getDataTypeStripeColor(dataType: DataType): string {
    switch (dataType) {
      case 'string':
        return 'rgba(34, 197, 94, 0.12)';
      case 'int':
        return 'rgba(59, 130, 246, 0.12)';
      case 'float':
        return 'rgba(6, 182, 212, 0.12)';
      case 'bool':
        return 'rgba(168, 85, 247, 0.12)';
      case 'list':
        return 'rgba(249, 115, 22, 0.12)';
      case 'dict':
        return 'rgba(236, 72, 153, 0.12)';
      case 'higlass-track':
        return 'rgba(13, 148, 136, 0.12)';
      case 'ngl-structure':
        return 'rgba(244, 63, 94, 0.12)';
      default:
        return 'rgba(107, 114, 128, 0.10)';
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

  // Context menu handlers
  const handleFocusNode = () => {
    const node = getNode(id);
    if (node) {
      fitView({
        nodes: [node],
        duration: 500,
        padding: 0.5,
        minZoom: 1,
        maxZoom: 1.5,
      });
      // toast.success(`Focused on "${label}"`);
    }
  };

  const handleDeleteNode = () => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    // toast.success(`Deleted node "${label}"`);
  };

  const handleDuplicateNode = () => {
    // Generate a unique ID for the duplicate
    const duplicateId = `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // Get the current node to duplicate
    const currentNode = getNode(id);
    if (!currentNode) {
      // toast.error('Could not find node to duplicate');
      return;
    }
    
    // Create a duplicate node with offset position
    // NOTE: labels become Python variable names in generated scripts, so the
    // copy label must be a valid identifier (not "Name (Copy)")
    const copyLabel = `${label}_copy`.replace(/\W/g, '_').replace(/^(\d)/, '_$1');
    const duplicateNode = {
      ...currentNode,
      id: duplicateId,
      position: {
        x: currentNode.position.x + 50,
        y: currentNode.position.y + 50,
      },
      data: {
        ...currentNode.data,
        label: copyLabel,
      },
      selected: false,
    };
    
    // Add the duplicate to the canvas
    setNodes((nds) => [...nds, duplicateNode]);
    
    // toast.success(`Duplicated "${label}"`);
  };

  const handleSaveToNodebar = async () => {
    try {
      if (!token) {
        toast.error('Please log in to save nodes');
        return;
      }

      // Generate Python code for the data type node
      let sourceCode = '';
      switch (nodeData.dataType) {
        case 'string':
          sourceCode = `def ${label}():\n    """Returns a string value"""\n    return "${value}"`;
          break;
        case 'int':
          sourceCode = `def ${label}():\n    """Returns an integer value"""\n    return ${value}`;
          break;
        case 'float':
          sourceCode = `def ${label}():\n    """Returns a float value"""\n    return ${value}`;
          break;
        case 'bool':
          sourceCode = `def ${label}():\n    """Returns a boolean value"""\n    return ${value}`;
          break;
        case 'list':
          sourceCode = `def ${label}():\n    """Returns a list value"""\n    return ${value}`;
          break;
        case 'dict':
          sourceCode = `def ${label}():\n    """Returns a dictionary value"""\n    return ${value}`;
          break;
        case 'higlass-track': {
          const spec = value as HiGlassTrackSpec;
          sourceCode = `def ${label}():\n    """Returns a HiGlass track spec"""\n    return ${JSON.stringify(spec)}`;
          break;
        }
        case 'ngl-structure': {
          const spec = value as NGLStructureSpec;
          sourceCode = `def ${label}():\n    """Returns an NGL structure spec"""\n    return ${JSON.stringify(spec)}`;
          break;
        }
      }

      // Prepare node data for saving
      const nodeToSave = {
        data: {
          title: `${label} (${nodeData.dataType})`,
          description: `Data type node: ${nodeData.dataType} with value ${JSON.stringify(value)}`,
          function_name: label,
          language: 'python',
          source: sourceCode,
          inputs: [],
          outputs: [
            {
              id: 'output',
              name: 'value',
              type: nodeData.dataType
            }
          ],
        },
        tags: ['data-type', nodeData.dataType],
        is_public: false,
        node_type: 'dataTypeNode',  // Mark as data type node
      };

      console.log('Saving data type node to nodebar:', nodeToSave);
      
      // Call API to create custom node
      const savedNode = await createCustomNode(token, nodeToSave);
      
      console.log('Data type node saved successfully:', savedNode);
      toast.success(`Saved "${label}" to Nodebar!`);
      // Dispatch event so Nodebar refreshes its list
      window.dispatchEvent(new Event('extension-installed'));
    } catch (error) {
      console.error('Error saving data type node to nodebar:', error);
      toast.error(`Failed to save node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleViewCode = () => {
    // toast.info(`Data type: ${nodeData.dataType}, Value: ${JSON.stringify(value)}`);
  };

  // Get a short preview string of the value for collapsed display
  const getValuePreview = (): string => {
    if (value === undefined || value === null) return '—';
    switch (nodeData.dataType) {
      case 'string':
        return value === '' ? '—' : value.length > 30 ? `"…${value.slice(-30)}"` : `"${value}"`;
      case 'int':
      case 'float':
        return String(value);
      case 'bool':
        return value ? 'true' : 'false';
      case 'list':
      case 'dict':
        return value.length > 40 ? `…${value.slice(-40)}` : value || '—';
      case 'higlass-track': {
        const spec = value as HiGlassTrackSpec;
        if (!spec?.file_path) return '— no file —';
        const base = spec.file_path.split('/').pop() || spec.file_path;
        return `${base} · ${spec.file_type}`;
      }
      case 'ngl-structure': {
        const spec = value as NGLStructureSpec;
        if (!spec?.file_path) return '— no file —';
        const base = spec.file_path.split('/').pop() || spec.file_path;
        return `${base} · ${spec.representation}`;
      }
      default:
        return String(value);
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
            onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
            placeholder="Enter string..."
            className="h-9"
          />
        );
      
      case 'int':
        return (
          <Input
            type="number"
            value={intStr}
            onChange={(e) => {
              setIntStr(e.target.value);
              const val = e.target.value === '' ? 0 : parseInt(e.target.value);
              if (!isNaN(val)) handleValueChange(val);
            }}
            onBlur={() => {
              const val = intStr === '' ? 0 : parseInt(intStr);
              const finalVal = isNaN(val) ? 0 : val;
              setIntStr(String(finalVal));
              handleValueChange(finalVal);
            }}
            onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
            placeholder="0"
            className="h-9"
            step="1"
          />
        );
      
      case 'float':
        return (
          <Input
            type="number"
            value={floatStr}
            onChange={(e) => {
              setFloatStr(e.target.value);
              const val = e.target.value === '' ? 0.0 : parseFloat(e.target.value);
              if (!isNaN(val)) handleValueChange(val);
            }}
            onBlur={() => {
              const val = floatStr === '' ? 0.0 : parseFloat(floatStr);
              const finalVal = isNaN(val) ? 0.0 : val;
              setFloatStr(String(finalVal));
              handleValueChange(finalVal);
            }}
            onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
            placeholder="0.0"
            className="h-9"
            step="0.1"
          />
        );
      
      case 'bool':
        return (
          <div className="flex items-center justify-between py-1">
            <Label htmlFor={`bool-${id}`} className="text-sm cursor-pointer text-foreground">
              {value ? 'True' : 'False'}
            </Label>
            <Switch
              id={`bool-${id}`}
              checked={value}
              onCheckedChange={(checked) => handleValueChange(checked)}
            />
          </div>
        );
      
      case 'list':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
            placeholder='["item1", "item2"]'
            className="min-h-[72px] font-mono text-sm"
          />
        );
      
      case 'dict':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
            placeholder='{"key": "value"}'
            className="min-h-[72px] font-mono text-sm"
          />
        );

      case 'ngl-structure': {
        const spec: NGLStructureSpec =
          value && typeof value === 'object' && !Array.isArray(value)
            ? { ...DEFAULT_STRUCTURE_SPEC, ...(value as NGLStructureSpec) }
            : { ...DEFAULT_STRUCTURE_SPEC };
        const updateSpec = (key: keyof NGLStructureSpec, val: any) => {
          handleValueChange({ ...spec, [key]: val });
        };
        return (
          <div className="space-y-2.5">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">File Path</Label>
              <Textarea
                value={spec.file_path}
                onChange={(e) => updateSpec('file_path', e.target.value)}
                onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
                placeholder="/data/1CKB.pdb"
                className="min-h-[56px] font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">File Type</Label>
                <Select
                  value={spec.file_type}
                  onValueChange={(v) => updateSpec('file_type', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NGL_FILE_TYPES).map(([ft, label]) => (
                      <SelectItem key={ft} value={ft} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Representation</Label>
                <Select
                  value={spec.representation}
                  onValueChange={(v) => updateSpec('representation', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NGL_REPRESENTATIONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Color Scheme</Label>
                <Select
                  value={spec.color_scheme}
                  onValueChange={(v) => updateSpec('color_scheme', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NGL_COLOR_SCHEMES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Name (optional)</Label>
                <Input
                  type="text"
                  value={spec.name}
                  onChange={(e) => updateSpec('name', e.target.value)}
                  onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
                  placeholder="Protein A"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Options (JSON, optional)</Label>
              <Textarea
                value={typeof spec.options === 'string' ? spec.options : JSON.stringify(spec.options || {})}
                onChange={(e) => updateSpec('options', e.target.value)}
                onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
                placeholder='{"radiusScale": 0.3, "opacity": 0.8}'
                className="min-h-[48px] font-mono text-xs"
              />
            </div>
          </div>
        );
      }

      case 'higlass-track': {
        const spec: HiGlassTrackSpec =
          value && typeof value === 'object' && !Array.isArray(value)
            ? { ...DEFAULT_TRACK_SPEC, ...(value as HiGlassTrackSpec) }
            : { ...DEFAULT_TRACK_SPEC };
        const updateSpec = (key: keyof HiGlassTrackSpec, val: any) => {
          handleValueChange({ ...spec, [key]: val });
        };
        const fileTypeMeta = HIGLASS_FILE_TYPES[spec.file_type] || HIGLASS_FILE_TYPES.cooler;
        const availableTracks = fileTypeMeta.tracks;
        const selectedTrackValid = spec.track_type !== 'auto' && availableTracks.includes(spec.track_type);
        return (
          <div className="space-y-2.5">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">File Path</Label>
              <Textarea
                value={spec.file_path}
                onChange={(e) => updateSpec('file_path', e.target.value)}
                onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
                placeholder="/data/sample.mcool"
                className="min-h-[56px] font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">File Type</Label>
                <Select
                  value={spec.file_type}
                  onValueChange={(v) => {
                    const meta = HIGLASS_FILE_TYPES[v] || HIGLASS_FILE_TYPES.cooler;
                    // Reset track type if it's not valid for the new file type
                    const newTrackType = spec.track_type !== 'auto' && meta.tracks.includes(spec.track_type)
                      ? spec.track_type
                      : 'auto';
                    handleValueChange({ ...spec, file_type: v, track_type: newTrackType });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(HIGLASS_FILE_TYPES).map(([ft, meta]) => (
                      <SelectItem key={ft} value={ft} className="text-xs">
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Position</Label>
                <Select
                  value={spec.position}
                  onValueChange={(v) => updateSpec('position', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HIGLASS_POSITIONS.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Track Type</Label>
              <Select
                value={selectedTrackValid ? spec.track_type : 'auto'}
                onValueChange={(v) => updateSpec('track_type', v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" className="text-xs">
                    Auto ({availableTracks[0]})
                  </SelectItem>
                  {availableTracks.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Name (optional)</Label>
                <Input
                  type="text"
                  value={spec.name}
                  onChange={(e) => updateSpec('name', e.target.value)}
                  onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
                  placeholder="Sample 1"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">View Group</Label>
                <Input
                  type="number"
                  value={String(spec.view_group)}
                  onChange={(e) => updateSpec('view_group', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                  onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
                  className="h-8 text-xs"
                  step="1"
                />
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
            placeholder="Enter value..."
            className="h-9"
          />
        );
    }
  };

  const DataTypeIcon = getDataTypeIcon(nodeData.dataType);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={nodeRef}
          className={cn(
            "rounded-none border border-border shadow-md transition-all duration-200 bg-background overflow-visible",
            selected && "ring-2 ring-primary shadow-lg",
            "min-w-[280px]"
          )}
          style={{ position: 'relative' }}
        >
        {/* Header */}
        <div 
          className={cn("border-b border-border px-3 py-2 flex items-center justify-between relative overflow-hidden", getDataTypeBgClass(nodeData.dataType), isCollapsed && "border-b-0")}
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 6px, ${getDataTypeStripeColor(nodeData.dataType)} 6px, ${getDataTypeStripeColor(nodeData.dataType)} 12px)`,
            backgroundSize: '200% 100%',
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 relative z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newCollapsed = !isCollapsed;
                setIsCollapsed(newCollapsed);
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === id
                      ? { ...node, data: { ...node.data, isCollapsed: newCollapsed } }
                      : node
                  )
                );
                // Persist to localStorage so it survives refreshes without saving
                if (typeof window !== 'undefined' && nodeData.filePath) {
                  localStorage.setItem(`canvas_node_collapsed_${nodeData.filePath}_${id}`, String(newCollapsed));
                }
                // Force ReactFlow to recalculate handle positions after collapse/expand
                setTimeout(() => updateNodeInternals(id), 50);
              }}
              className="shrink-0 p-0.5 hover:bg-muted/50 rounded transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed
                ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </button>
            <DataTypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              {isEditingLabel ? (
                <Input
                  ref={labelInputRef}
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={handleLabelBlur}
                  onKeyDown={(e) => {
                    if (!(e.ctrlKey || e.metaKey)) e.stopPropagation();
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
                  className="h-7 text-sm py-0 px-1.5"
                />
              ) : (
                <div 
                  className="text-sm font-medium text-foreground flex items-center gap-1 cursor-pointer hover:text-primary transition-colors group truncate"
                  onClick={() => setIsEditingLabel(true)}
                >
                  <span className="truncate">{label}</span>
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </div>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn("ml-2 shrink-0 relative z-10", getDataTypeBadgeClass(nodeData.dataType))}
          >
            {nodeData.dataType}
          </Badge>
        </div>

        {/* Error Message */}
        {labelError && (
          <div className="px-3 py-1.5 bg-destructive/5 border-b border-destructive/20">
            <p className="text-xs text-destructive">{labelError}</p>
          </div>
        )}

        {/* Value preview when collapsed */}
        {isCollapsed && (
          <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground shrink-0">Value:</span>
              {nodeData.dataType === 'bool' ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-xs",
                    value
                      ? 'bg-green-500/10 text-green-700 border-green-500/20'
                      : 'bg-red-500/10 text-red-700 border-red-500/20'
                  )}
                >
                  {value ? 'true' : 'false'}
                </Badge>
              ) : (
                <span
                  className="text-xs font-mono text-foreground overflow-hidden whitespace-nowrap"
                  style={['string', 'list', 'dict', 'higlass-track', 'ngl-structure'].includes(nodeData.dataType) ? { direction: 'rtl', textAlign: 'left', unicodeBidi: 'plaintext' } : undefined}
                >
                  {getValuePreview()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {!isCollapsed && (
          <div className="p-3">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {nodeData.dataType === 'higlass-track' ? 'Track Config' : nodeData.dataType === 'ngl-structure' ? 'Structure Config' : 'Value'}
            </Label>
            {renderInput()}
          </div>
        )}

        {/* Output Handle - styled like CustomNode */}
        <div 
          className="noDrag" 
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', right: -5, top: isCollapsed ? '50%' : '50%', transform: 'translateY(-50%)', zIndex: 100, transition: 'top 0.2s ease' }}
        >
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            style={{ 
              position: 'relative',
              left: 0,
              top: 0,
              transform: 'none',
              background: '#5D688A',
              width: 10,
              height: 10,
              border: '2px solid hsl(var(--background))',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
              cursor: 'crosshair'
            }}
          />
        </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleFocusNode}>
          <Focus className="mr-2 h-4 w-4" />
          <span>Focus Node</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleViewCode}>
          <Code className="mr-2 h-4 w-4" />
          <span>View Value</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDuplicateNode}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Duplicate</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSaveToNodebar}>
          <Save className="mr-2 h-4 w-4" />
          <span>Save to Nodebar</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDeleteNode} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default DataTypeNode;
