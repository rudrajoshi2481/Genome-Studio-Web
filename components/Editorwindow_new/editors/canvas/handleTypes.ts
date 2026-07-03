// Handle type definitions for workflow nodes
// Defines known types, their colors, and compatibility rules

export type HandleType =
  | 'any'
  | 'string'
  | 'int'
  | 'float'
  | 'bool'
  | 'list'
  | 'dict'
  | 'file'
  | 'AnnData'
  | 'DataFrame'
  | 'ndarray'
  | 'figure'
  | 'fastq'
  | 'bam'
  | 'bed'
  | 'gtf';

export interface HandleTypeInfo {
  label: string;
  color: string;
  badgeClass: string;
  handleColor: string;
  description: string;
}

export const HANDLE_TYPES: Record<HandleType, HandleTypeInfo> = {
  any: {
    label: 'any',
    color: '#6b7280',
    badgeClass: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    handleColor: '#5D688A',
    description: 'Accepts any type',
  },
  string: {
    label: 'str',
    color: '#22c55e',
    badgeClass: 'bg-green-500/10 text-green-700 border-green-500/20',
    handleColor: '#22c55e',
    description: 'String / text value',
  },
  int: {
    label: 'int',
    color: '#3b82f6',
    badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    handleColor: '#3b82f6',
    description: 'Integer number',
  },
  float: {
    label: 'float',
    color: '#06b6d4',
    badgeClass: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
    handleColor: '#06b6d4',
    description: 'Floating-point number',
  },
  bool: {
    label: 'bool',
    color: '#a855f7',
    badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    handleColor: '#a855f7',
    description: 'Boolean (true/false)',
  },
  list: {
    label: 'list',
    color: '#f97316',
    badgeClass: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    handleColor: '#f97316',
    description: 'List / array of values',
  },
  dict: {
    label: 'dict',
    color: '#ec4899',
    badgeClass: 'bg-pink-500/10 text-pink-700 border-pink-500/20',
    handleColor: '#ec4899',
    description: 'Dictionary / mapping',
  },
  file: {
    label: 'file',
    color: '#eab308',
    badgeClass: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    handleColor: '#eab308',
    description: 'File path (string)',
  },
  AnnData: {
    label: 'AnnData',
    color: '#8b5cf6',
    badgeClass: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
    handleColor: '#8b5cf6',
    description: 'AnnData object (single-cell genomics)',
  },
  DataFrame: {
    label: 'DataFrame',
    color: '#14b8a6',
    badgeClass: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
    handleColor: '#14b8a6',
    description: 'Pandas DataFrame',
  },
  ndarray: {
    label: 'ndarray',
    color: '#f43f5e',
    badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    handleColor: '#f43f5e',
    description: 'NumPy array',
  },
  figure: {
    label: 'figure',
    color: '#d946ef',
    badgeClass: 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20',
    handleColor: '#d946ef',
    description: 'Matplotlib figure',
  },
  fastq: {
    label: 'fastq',
    color: '#84cc16',
    badgeClass: 'bg-lime-500/10 text-lime-700 border-lime-500/20',
    handleColor: '#84cc16',
    description: 'FASTQ sequence file',
  },
  bam: {
    label: 'bam',
    color: '#0ea5e9',
    badgeClass: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    handleColor: '#0ea5e9',
    description: 'BAM alignment file',
  },
  bed: {
    label: 'bed',
    color: '#a855f7',
    badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    handleColor: '#a855f7',
    description: 'BED genomic interval file',
  },
  gtf: {
    label: 'gtf',
    color: '#6366f1',
    badgeClass: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    handleColor: '#6366f1',
    description: 'GTF gene annotation file',
  },
};

// Type compatibility: which output types can connect to which input types
// 'any' is compatible with everything
// Numeric types (int/float) are compatible with each other
// file is compatible with string (a file path is a string)
// Specific bio types (fastq, bam, bed, gtf) are compatible with file and string
const COMPATIBILITY_MAP: Record<string, Set<string>> = {
  any: new Set(Object.keys(HANDLE_TYPES)),
  string: new Set(['string', 'file', 'fastq', 'bam', 'bed', 'gtf', 'any']),
  int: new Set(['int', 'float', 'any']),
  float: new Set(['float', 'int', 'any']),
  bool: new Set(['bool', 'any']),
  list: new Set(['list', 'any']),
  dict: new Set(['dict', 'any']),
  file: new Set(['file', 'string', 'any']),
  AnnData: new Set(['AnnData', 'any']),
  DataFrame: new Set(['DataFrame', 'any']),
  ndarray: new Set(['ndarray', 'list', 'any']),
  figure: new Set(['figure', 'any']),
  fastq: new Set(['fastq', 'file', 'string', 'any']),
  bam: new Set(['bam', 'file', 'string', 'any']),
  bed: new Set(['bed', 'file', 'string', 'any']),
  gtf: new Set(['gtf', 'file', 'string', 'any']),
};

/**
 * Check if a source output type is compatible with a target input type
 */
export function isTypeCompatible(sourceType: string, targetType: string): boolean {
  if (!sourceType || !targetType) return true;
  if (sourceType === 'any' || targetType === 'any') return true;

  const compatible = COMPATIBILITY_MAP[targetType];
  if (compatible) {
    return compatible.has(sourceType);
  }

  // Unknown types: allow connection but they'll need to match by name
  return sourceType === targetType;
}

/**
 * Get handle type info, falling back to 'any' for unknown types
 */
export function getHandleTypeInfo(type: string): HandleTypeInfo {
  return HANDLE_TYPES[type as HandleType] || HANDLE_TYPES.any;
}

/**
 * Get all available handle types for a selector dropdown
 */
export function getAvailableHandleTypes(): HandleType[] {
  return Object.keys(HANDLE_TYPES) as HandleType[];
}
