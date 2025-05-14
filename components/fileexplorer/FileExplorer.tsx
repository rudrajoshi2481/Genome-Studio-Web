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
    fetchFileTree('/app', 3);
  }, [fetchFileTree]);

  if (error) {
    return <div className="text-red-500 text-sm p-2">{error}</div>;
  }

  if (!fileTree) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="h-8 flex-none px-1 flex items-center justify-between relative">
        <ExplorerToolbar />
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <WebSocketHandler />
        <FileTree node={fileTree} />
      </div>
    </div>
  );
};

export default FileExplorer;