import React, { Fragment, useEffect } from 'react';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import { useFileExplorerStore } from './store';
import type { FileNode } from './types';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const WebSocketHandler = dynamic(
  () => import('./WebSocketHandler').then(mod => mod.WebSocketHandler),
  { ssr: false }
);

interface FileTreeProps {
  node: FileNode;
  level?: number;
}

const FileTree: React.FC<FileTreeProps> = ({ node, level = 0 }) => {
  const { isNodeExpanded, toggleNode } = useFileExplorerStore();
  const isOpen = isNodeExpanded(node.path);

  return (
    <div className="relative" style={{ paddingLeft: level ? '20px' : '0px' }}>
      {level > 0 && (
        <Fragment>
          <div 
            className="absolute left-0 top-0 bottom-0 border-l border-dotted border-gray-300" 
            style={{ left: '10px', height: node.children && isOpen ? '100%' : '16px' }}
          />
          <div 
            className="absolute border-t border-dotted border-gray-300" 
            style={{ left: '10px', top: '8px', width: '10px' }}
          />
        </Fragment>
      )}
      <div
        className={cn(
          'flex items-center py-0.5 px-1 hover:bg-gray-100 rounded cursor-pointer group',
          'text-sm text-gray-700'
        )}
        onClick={() => toggleNode(node.path)}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          {node.type === 'directory' ? (
            isOpen ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )
          ) : (
            <div className="w-3" /> 
          )}
        </div>
        <div className="w-4 h-4 flex items-center justify-center mr-1">
          {node.type === 'directory' ? (
            <Folder className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <File className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
        <span className="text-[13px] text-gray-700">{node.name}</span>
      </div>
      {isOpen && node.children?.map((child) => (
        <FileTree key={child.path} node={child} level={level + 1} />
      ))}
    </div>
  );
};

const FileExplorer: React.FC = () => {
  const { 
    fileTree, 
    isLoading, 
    error, 
    fetchFileTree, 
    wsStatus,
    wsError,
    reset
  } = useFileExplorerStore();

  // Initialize HTTP connection
  useEffect(() => {
    fetchFileTree('/app', 3); // Increased depth to show more levels
  }, [fetchFileTree]);

  const renderConnectionStatus = () => {
    // Don't show anything if we're disconnected and there's no error
    if (wsStatus === 'disconnected' && !wsError) {
      return null;
    }

    const statusConfig = {
      connected: {
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: '●',
        tooltip: 'Real-time updates active'
      },
      connecting: {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: '○',
        tooltip: 'Connecting...'
      },
      error: {
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: '⚠',
        tooltip: wsError || 'Connection Error'
      },
      disconnected: {
        color: 'bg-gray-50 text-gray-500 border-gray-200',
        icon: '○',
        tooltip: 'Updates paused'
      }
    };

    const config = statusConfig[wsStatus];

    return (
      <div 
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center',
          'border shadow-sm transition-all duration-150 cursor-help',
          config.color
        )}
        title={config.tooltip}
      >
        <span className="text-[11px] leading-none">{config.icon}</span>
      </div>
    );
  };

  if (error) {
    return <div className="text-red-500 text-sm p-2">{error}</div>;
  }

  if (!fileTree) {
    return null;
  }
  
  const renderActions = () => (
    <div className="flex items-center gap-0.5">
      <button
        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="New File"
        onClick={() => console.log('New file')}
      >
        <File className="w-3.5 h-3.5" />
      </button>
      <button
        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="New Folder"
        onClick={() => console.log('New folder')}
      >
        <Folder className="w-3.5 h-3.5" />
      </button>
      <button
        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors ml-0.5"
        title="Collapse Explorer"
        onClick={() => {
          reset();
          fetchFileTree('/app', 3);
        }}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="h-8 flex-none px-1 flex items-center justify-between relative">
        {renderActions()}
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <WebSocketHandler />
        <FileTree node={fileTree} />
      </div>
    </div>
  );
};

export default FileExplorer;