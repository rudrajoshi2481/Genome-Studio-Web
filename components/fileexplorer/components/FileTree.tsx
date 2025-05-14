import React, { Fragment } from 'react';
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import { useFileExplorerStore } from '../store';
import type { FileNode } from '../types';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  node: FileNode;
  level?: number;
}

export const FileTree: React.FC<FileTreeProps> = ({ node, level = 0 }) => {
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
