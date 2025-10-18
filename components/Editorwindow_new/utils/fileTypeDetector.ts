/**
 * File type detection utility for determining appropriate editor/viewer
 */

export enum FileType {
  CODE = 'code',
  WORKFLOW = 'workflow', 
  IMAGE = 'image',
  DATA = 'data',
  PDF = 'pdf',
  UNSUPPORTED = 'unsupported'
}

/**
 * Get file extension from file path
 */
export const getFileExtension = (filePath: string): string => {
  return filePath.split('.').pop()?.toLowerCase() || '';
};

/**
 * Determine file type based on file path and extension
 */
export const getFileType = (filePath: string, extension?: string): FileType => {
  const ext = extension || getFileExtension(filePath);
  
  // Workflow files
  if (['flow', 'pipeline', 'workflow'].includes(ext)) {
    return FileType.WORKFLOW;
  }
  
  // Image files
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) {
    return FileType.IMAGE;
  }
  
  // Data files (CSV/TSV only - JSON/XML/YAML are better as code)
  if (['csv', 'tsv'].includes(ext)) {
    return FileType.DATA;
  }
  
  // PDF files
  if (ext === 'pdf') {
    return FileType.PDF;
  }
  
  // Code files (default for most text-based files)
  const codeExtensions = [
    // Programming languages
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
    'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'clj',
    'hs', 'ml', 'fs', 'elm', 'dart', 'lua', 'perl', 'r', 'matlab',
    
    // Web technologies
    'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
    
    // Configuration and markup
    'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
    'properties', 'env', 'gitignore', 'dockerignore', 'editorconfig',
    
    // Documentation
    'md', 'markdown', 'rst', 'txt', 'log',
    
    // Shell and scripts
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
    
    // Database
    'sql', 'sqlite', 'db',
    
    // Build and package files
    'dockerfile', 'makefile', 'cmake', 'gradle', 'maven', 'npm', 'yarn',
    'package', 'lock', 'requirements'
  ];
  
  if (codeExtensions.includes(ext) || ext === '') {
    return FileType.CODE;
  }
  
  // Default to unsupported for unknown file types
  return FileType.UNSUPPORTED;
};

/**
 * Check if file type supports editing (vs view-only)
 */
export const isEditableFileType = (fileType: FileType): boolean => {
  return [FileType.CODE, FileType.WORKFLOW].includes(fileType);
};

/**
 * Get human-readable file type description
 */
export const getFileTypeDescription = (fileType: FileType): string => {
  switch (fileType) {
    case FileType.CODE:
      return 'Code File';
    case FileType.WORKFLOW:
      return 'Workflow File';
    case FileType.IMAGE:
      return 'Image File';
    case FileType.DATA:
      return 'Data File';
    case FileType.PDF:
      return 'PDF Document';
    case FileType.UNSUPPORTED:
      return 'Unsupported File';
    default:
      return 'Unknown File';
  }
};

/**
 * Get suggested file extensions for a given file type
 */
export const getSuggestedExtensions = (fileType: FileType): string[] => {
  switch (fileType) {
    case FileType.CODE:
      return ['py', 'js', 'ts', 'html', 'css', 'json', 'md'];
    case FileType.WORKFLOW:
      return ['flow', 'pipeline', 'workflow'];
    case FileType.IMAGE:
      return ['png', 'jpg', 'jpeg', 'svg', 'gif'];
    case FileType.DATA:
      return ['csv', 'tsv'];
    case FileType.PDF:
      return ['pdf'];
    default:
      return [];
  }
};
