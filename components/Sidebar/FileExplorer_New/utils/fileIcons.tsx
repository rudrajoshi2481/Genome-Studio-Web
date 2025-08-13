import React from 'react'
import {
  FileIcon,
  FileTextIcon,
  FileCodeIcon,
  FileImageIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileArchiveIcon,
  DatabaseIcon,
  SettingsIcon,
  BookOpenIcon,
  BrainIcon,
  GitBranchIcon,
  PackageIcon,
  TerminalIcon,
  CpuIcon,
  FlaskConicalIcon,
  WorkflowIcon,
  FileSpreadsheetIcon,
  PresentationIcon,
  FileJsonIcon,
  FileXIcon,
  FileSpreadsheetIcon as FileCsvIcon,
  FileTypeIcon,
  LockIcon,
  KeyIcon,
  ShieldIcon,
  MonitorIcon,
  ServerIcon,
  CloudIcon,
  HardDriveIcon,
  WrenchIcon,
  BugIcon,
  TestTubeIcon,
  ScrollIcon,
  BookIcon,
  GraduationCapIcon,
  MapIcon,
  PaletteIcon,
  MusicIcon,
  CameraIcon,
  PlayIcon,
  ZapIcon,
  ActivityIcon,
  BarChartIcon,
  PieChartIcon,
  TrendingUpIcon,
  CalendarIcon,
  ClockIcon,
  MailIcon,
  MessageSquareIcon,
  PhoneIcon,
  GlobeIcon,
  LinkIcon,
  DownloadIcon,
  UploadIcon,
  FolderIcon
} from 'lucide-react'

// File extension to icon mapping
const fileIconMap: Record<string, React.ComponentType<any>> = {
  // Programming languages
  'js': FileCodeIcon,
  'jsx': FileCodeIcon,
  'ts': FileCodeIcon,
  'tsx': FileCodeIcon,
  'py': FileCodeIcon,
  'java': FileCodeIcon,
  'cpp': FileCodeIcon,
  'c': FileCodeIcon,
  'h': FileCodeIcon,
  'hpp': FileCodeIcon,
  'cs': FileCodeIcon,
  'php': FileCodeIcon,
  'rb': FileCodeIcon,
  'go': FileCodeIcon,
  'rs': FileCodeIcon,
  'swift': FileCodeIcon,
  'kt': FileCodeIcon,
  'scala': FileCodeIcon,
  'clj': FileCodeIcon,
  'hs': FileCodeIcon,
  'ml': FileCodeIcon,
  'fs': FileCodeIcon,
  'elm': FileCodeIcon,
  'dart': FileCodeIcon,
  'lua': FileCodeIcon,
  'r': FileCodeIcon,
  'jl': FileCodeIcon,
  'pl': FileCodeIcon,
  'sh': TerminalIcon,
  'bash': TerminalIcon,
  'zsh': TerminalIcon,
  'fish': TerminalIcon,
  'ps1': TerminalIcon,
  'bat': TerminalIcon,
  'cmd': TerminalIcon,

  // Web technologies
  'html': FileCodeIcon,
  'htm': FileCodeIcon,
  'css': PaletteIcon,
  'scss': PaletteIcon,
  'sass': PaletteIcon,
  'less': PaletteIcon,
  'vue': FileCodeIcon,
  'svelte': FileCodeIcon,

  // Data formats
  'json': FileJsonIcon,
  'xml': FileXIcon,
  'yaml': FileTypeIcon,
  'yml': FileTypeIcon,
  'toml': FileTypeIcon,
  'ini': SettingsIcon,
  'cfg': SettingsIcon,
  'conf': SettingsIcon,
  'config': SettingsIcon,
  'csv': FileCsvIcon,
  'tsv': FileSpreadsheetIcon,
  'xlsx': FileSpreadsheetIcon,
  'xls': FileSpreadsheetIcon,
  'ods': FileSpreadsheetIcon,

  // Documents
  'md': BookOpenIcon,
  'markdown': BookOpenIcon,
  'txt': FileTextIcon,
  'rtf': FileTextIcon,
  'doc': FileTextIcon,
  'docx': FileTextIcon,
  'odt': FileTextIcon,
  'pdf': BookIcon,
  'tex': FileTextIcon,
  'latex': FileTextIcon,
  'rst': FileTextIcon,
  'asciidoc': FileTextIcon,
  'adoc': FileTextIcon,

  // Presentations
  'ppt': PresentationIcon,
  'pptx': PresentationIcon,
  'odp': PresentationIcon,
  'keynote': PresentationIcon,

  // Images
  'jpg': FileImageIcon,
  'jpeg': FileImageIcon,
  'png': FileImageIcon,
  'gif': FileImageIcon,
  'bmp': FileImageIcon,
  'svg': FileImageIcon,
  'webp': FileImageIcon,
  'ico': FileImageIcon,
  'tiff': FileImageIcon,
  'tif': FileImageIcon,
  'raw': CameraIcon,
  'cr2': CameraIcon,
  'nef': CameraIcon,
  'arw': CameraIcon,

  // Audio
  'mp3': FileAudioIcon,
  'wav': FileAudioIcon,
  'flac': FileAudioIcon,
  'aac': FileAudioIcon,
  'ogg': FileAudioIcon,
  'wma': FileAudioIcon,
  'm4a': FileAudioIcon,
  'opus': FileAudioIcon,
  'midi': MusicIcon,
  'mid': MusicIcon,

  // Video
  'mp4': FileVideoIcon,
  'avi': FileVideoIcon,
  'mkv': FileVideoIcon,
  'mov': FileVideoIcon,
  'wmv': FileVideoIcon,
  'flv': FileVideoIcon,
  'webm': FileVideoIcon,
  'm4v': FileVideoIcon,
  '3gp': FileVideoIcon,
  'ogv': FileVideoIcon,

  // Archives
  'zip': FileArchiveIcon,
  'rar': FileArchiveIcon,
  '7z': FileArchiveIcon,
  'tar': FileArchiveIcon,
  'gz': FileArchiveIcon,
  'bz2': FileArchiveIcon,
  'xz': FileArchiveIcon,
  'tgz': FileArchiveIcon,
  'tbz2': FileArchiveIcon,
  'txz': FileArchiveIcon,

  // Database
  'sql': DatabaseIcon,
  'db': DatabaseIcon,
  'sqlite': DatabaseIcon,
  'sqlite3': DatabaseIcon,
  'mdb': DatabaseIcon,
  'accdb': DatabaseIcon,

  // Scientific/Bioinformatics
  'fasta': BrainIcon,
  'fa': BrainIcon,
  'fastq': BrainIcon,
  'fq': BrainIcon,
  'sam': BrainIcon,
  'bam': BrainIcon,
  'vcf': BrainIcon,
  'gff': BrainIcon,
  'gtf': BrainIcon,
  'bed': BrainIcon,
  'wig': BrainIcon,
  'bigwig': BrainIcon,
  'bw': BrainIcon,
  'bedgraph': BrainIcon,
  'pdb': FlaskConicalIcon,
  'mol': FlaskConicalIcon,
  'sdf': FlaskConicalIcon,
  'mol2': FlaskConicalIcon,

  // Workflow files
  'flow': WorkflowIcon,
  'workflow': WorkflowIcon,
  'wf': WorkflowIcon,
  'cwl': WorkflowIcon,
  'nf': WorkflowIcon,
  'snakefile': WorkflowIcon,
  'smk': WorkflowIcon,

  // Package management
  'package': PackageIcon,
  'requirements.txt': PackageIcon,
  'pipfile': PackageIcon,
  'poetry': PackageIcon,
  'cargo': PackageIcon,
  'gemfile': PackageIcon,
  'npm': PackageIcon,
  'yarn': PackageIcon,
  'pom': PackageIcon,
  'gradle': PackageIcon,
  'makefile': WrenchIcon,
  'cmake': WrenchIcon,
  'dockerfile': ServerIcon,

  // Version control
  'gitignore': GitBranchIcon,
  'gitattributes': GitBranchIcon,
  'gitmodules': GitBranchIcon,

  // Security/Keys
  'key': KeyIcon,
  'pem': LockIcon,
  'crt': ShieldIcon,
  'cert': ShieldIcon,
  'p12': LockIcon,
  'pfx': LockIcon,
  'jks': LockIcon,

  // System/Config
  'env': SettingsIcon,
  'properties': SettingsIcon,
  'service': ServerIcon,
  'socket': ServerIcon,
  'mount': HardDriveIcon,
  'desktop': MonitorIcon,

  // Logs
  'log': ScrollIcon,
  'out': FileTextIcon,
  'err': BugIcon,

  // Test files
  'test': TestTubeIcon,
  'spec': TestTubeIcon,

  // Documentation
  'readme': BookIcon,
  'license': ScrollIcon,
  'changelog': BookIcon,
  'authors': GraduationCapIcon,
  'contributors': GraduationCapIcon,

  // Data analysis
  'ipynb': ActivityIcon,
  'rmd': BarChartIcon,
  'qmd': BarChartIcon,

  // Web assets
  'woff': FileTypeIcon,
  'woff2': FileTypeIcon,
  'ttf': FileTypeIcon,
  'otf': FileTypeIcon,
  'eot': FileTypeIcon,

  // Temporary/backup
  'tmp': ClockIcon,
  'temp': ClockIcon,
  'bak': DownloadIcon,
  'backup': DownloadIcon,
  'old': ClockIcon,
  'orig': ClockIcon,
  'swp': ClockIcon,
  'swo': ClockIcon,
}

/**
 * Get the appropriate icon component for a file based on its extension
 * @param fileName - The name of the file
 * @param isDirectory - Whether the item is a directory
 * @returns React component for the appropriate icon
 */
export function getFileIcon(fileName: string, isDirectory: boolean = false): React.ComponentType<any> {
  if (isDirectory) {
    return FolderIcon
  }

  // Extract file extension
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  if (!extension) {
    return FileIcon
  }

  // Check for special file names (without extension)
  const lowerFileName = fileName.toLowerCase()
  const specialFiles = [
    'dockerfile', 'makefile', 'rakefile', 'gemfile', 'pipfile', 'cargo',
    'readme', 'license', 'changelog', 'authors', 'contributors',
    'gitignore', 'gitattributes', 'gitmodules'
  ]
  
  for (const specialFile of specialFiles) {
    if (lowerFileName === specialFile || lowerFileName.startsWith(specialFile + '.')) {
      return fileIconMap[specialFile] || FileIcon
    }
  }

  // Check for compound extensions
  const parts = fileName.toLowerCase().split('.')
  if (parts.length >= 3) {
    const compoundExt = parts.slice(-2).join('.')
    const compoundExtensions = [
      'tar.gz', 'tar.bz2', 'tar.xz', 'tar.lz', 'tar.Z',
      'requirements.txt', 'package.json', 'package-lock.json',
      'yarn.lock', 'poetry.lock', 'pipfile.lock'
    ]
    
    for (const compoundExtension of compoundExtensions) {
      if (fileName.toLowerCase().endsWith(compoundExtension)) {
        const key = compoundExtension.replace('.', '')
        return fileIconMap[key] || fileIconMap[extension] || FileIcon
      }
    }
  }

  return fileIconMap[extension] || FileIcon
}

/**
 * Get file icon with size and className props
 * @param fileName - The name of the file
 * @param isDirectory - Whether the item is a directory
 * @param size - Icon size (default: 16)
 * @param className - Additional CSS classes
 * @returns JSX element with the appropriate icon
 */
export function FileIconComponent({ 
  fileName, 
  isDirectory = false, 
  size = 16, 
  className = '' 
}: {
  fileName: string
  isDirectory?: boolean
  size?: number
  className?: string
}) {
  const IconComponent = getFileIcon(fileName, isDirectory)
  return <IconComponent size={size} className={className} />
}
