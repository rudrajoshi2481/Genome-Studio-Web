import React from 'react';
import { File, Folder, ChevronRight } from 'lucide-react';
import { useFileExplorerStore } from '../store';

interface ExplorerToolbarProps {
  onNewFile?: () => void;
  onNewFolder?: () => void;
}

export const ExplorerToolbar: React.FC<ExplorerToolbarProps> = ({
  onNewFile = () => console.log('New file'),
  onNewFolder = () => console.log('New folder')
}) => {
  const { reset, fetchFileTree } = useFileExplorerStore();

  return (
    <div className="flex items-center gap-0.5">
      <button
        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="New File"
        onClick={onNewFile}
      >
        <File className="w-3.5 h-3.5" />
      </button>
      <button
        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="New Folder"
        onClick={onNewFolder}
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
};
