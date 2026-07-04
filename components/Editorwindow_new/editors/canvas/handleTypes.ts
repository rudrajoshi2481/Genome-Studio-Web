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
  // ── Neutral ──────────────────────────────────────────────
  any: {
    label: 'any',
    color: '#78716c',
    badgeClass: 'bg-stone-500/10 text-stone-600 border-stone-500/20',
    handleColor: '#a8a29e',
    description: 'Accepts any type',
  },
  // ── Primitives (slate family) ────────────────────────────
  string: {
    label: 'str',
    color: '#64748b',
    badgeClass: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    handleColor: '#94a3b8',
    description: 'String / text value',
  },
  int: {
    label: 'int',
    color: '#475569',
    badgeClass: 'bg-slate-600/10 text-slate-700 border-slate-600/20',
    handleColor: '#64748b',
    description: 'Integer number',
  },
  float: {
    label: 'float',
    color: '#5b7c99',
    badgeClass: 'bg-sky-700/10 text-sky-700 border-sky-700/20',
    handleColor: '#7c9cb5',
    description: 'Floating-point number',
  },
  bool: {
    label: 'bool',
    color: '#8b7355',
    badgeClass: 'bg-amber-700/10 text-amber-800 border-amber-700/20',
    handleColor: '#a89070',
    description: 'Boolean (true/false)',
  },
  // ── Collections (clay family) ────────────────────────────
  list: {
    label: 'list',
    color: '#a0653e',
    badgeClass: 'bg-amber-600/10 text-amber-700 border-amber-600/20',
    handleColor: '#b8804f',
    description: 'List / array of values',
  },
  dict: {
    label: 'dict',
    color: '#8c6d5c',
    badgeClass: 'bg-stone-600/10 text-stone-700 border-stone-600/20',
    handleColor: '#a68a78',
    description: 'Dictionary / mapping',
  },
  // ── File paths (sand family) ─────────────────────────────
  file: {
    label: 'file',
    color: '#b08d57',
    badgeClass: 'bg-yellow-700/10 text-yellow-800 border-yellow-700/20',
    handleColor: '#c4a872',
    description: 'File path (string)',
  },
  // ── Data structures (sage family) ────────────────────────
  AnnData: {
    label: 'AnnData',
    color: '#5d7b5d',
    badgeClass: 'bg-green-700/10 text-green-800 border-green-700/20',
    handleColor: '#7a9a7a',
    description: 'AnnData object (single-cell genomics)',
  },
  DataFrame: {
    label: 'DataFrame',
    color: '#4a7c6f',
    badgeClass: 'bg-teal-700/10 text-teal-800 border-teal-700/20',
    handleColor: '#6a9b8e',
    description: 'Pandas DataFrame',
  },
  ndarray: {
    label: 'ndarray',
    color: '#6b8e6b',
    badgeClass: 'bg-green-600/10 text-green-700 border-green-600/20',
    handleColor: '#88a888',
    description: 'NumPy array',
  },
  figure: {
    label: 'figure',
    color: '#7a6a8c',
    badgeClass: 'bg-violet-600/10 text-violet-700 border-violet-600/20',
    handleColor: '#9688a8',
    description: 'Matplotlib figure',
  },
  // ── Bio formats (terracotta / olive family) ──────────────
  fastq: {
    label: 'fastq',
    color: '#8a9a5b',
    badgeClass: 'bg-lime-700/10 text-lime-800 border-lime-700/20',
    handleColor: '#a3b572',
    description: 'FASTQ sequence file',
  },
  bam: {
    label: 'bam',
    color: '#9c6b4e',
    badgeClass: 'bg-orange-800/10 text-orange-800 border-orange-800/20',
    handleColor: '#b88565',
    description: 'BAM alignment file',
  },
  bed: {
    label: 'bed',
    color: '#7d8c5a',
    badgeClass: 'bg-olive-600/10 text-olive-700 border-olive-600/20',
    handleColor: '#94a572',
    description: 'BED genomic interval file',
  },
  gtf: {
    label: 'gtf',
    color: '#6b8471',
    badgeClass: 'bg-emerald-700/10 text-emerald-800 border-emerald-700/20',
    handleColor: '#85a08b',
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
