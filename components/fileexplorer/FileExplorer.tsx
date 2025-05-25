import React, { useEffect, useState } from 'react';
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
    fetchFileTree,
    currentPath,
    navigateToPath
  } = useFileExplorerStore();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // Only load the first level of directories initially (depth=1)
    // Further levels will be loaded on demand when directories are expanded
    if (initialLoad) {
      // Use the current path from the store or default to '/app'
      const initialPath = currentPath || '/app';
      fetchFileTree(initialPath, 1);
      setInitialLoad(false);
    }
  }, [fetchFileTree, currentPath, initialLoad]);

  // Update the file tree when the current path changes
  useEffect(() => {
    if (!initialLoad && currentPath) {
      fetchFileTree(currentPath, 1);
    }
  }, [currentPath, fetchFileTree, initialLoad]);

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