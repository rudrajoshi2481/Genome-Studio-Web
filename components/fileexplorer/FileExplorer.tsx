import React, { useEffect } from 'react';
import { useFileExplorerStore } from './store';
import dynamic from 'next/dynamic';
import { FileTree, ExplorerToolbar } from './components';

const WebSocketHandler = dynamic(
  () => import('./WebSocketHandler').then(mod => mod.WebSocketHandler),
  { ssr: false }
);

const FileExplorer: React.FC = () => {
  const { 
    fileTree, 
    error, 
    fetchFileTree 
  } = useFileExplorerStore();

  useEffect(() => {
    // Only fetch the file tree if it's not already loaded
    // This ensures we maintain the expanded nodes state when switching between toolbar options
    if (!fileTree) {
      // Only load the first level of directories initially (depth=1)
      // Further levels will be loaded on demand when directories are expanded
      fetchFileTree('/app', 1);
    }
  }, [fetchFileTree, fileTree]);

  if (error) {
    return <div className="text-red-500 text-sm p-2">{error}</div>;
  }

  if (!fileTree) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col bg-white ">
      <div className="h-8 flex-none px-1 mb-2 flex items-center justify-between relative">
        <ExplorerToolbar />
      </div>
      <div className="flex-1 overflow-auto min-h-0 mt-8">
        <WebSocketHandler />
        <FileTree node={fileTree} />
      </div>
    </div>
  );
};

export default FileExplorer;