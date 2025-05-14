import React from 'react';
import { File, Folder, ChevronRight, CopyMinus } from 'lucide-react';
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
    <div className="flex items-center gap-0.5 border-b w-full">
       <div className="h-8  w-full  bg-muted/20 px-4 flex items-center justify-between backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex  justify-between w-full ">
  <div>
    <span className="font-medium">Files</span>
  </div>
      <div className='flex gap-1'>
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
        {/* <ChevronRight className="w-3.5 h-3.5" /> */}
        <CopyMinus className="w-3.5 h-3.5"/>
      </button>
      </div>
        </div>
      </div>
    </div>
  );
};
