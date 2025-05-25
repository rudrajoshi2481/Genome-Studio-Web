import { useEffect } from 'react';
import { useFileExplorerStore } from './store';

export const WebSocketHandler: React.FC = () => {
  const { initializeWebSocket, disconnectWebSocket, currentPath } = useFileExplorerStore();

  useEffect(() => {
    // Initialize with the current path from the store
    const cleanup = initializeWebSocket(currentPath);
    return () => {
      cleanup?.();
      disconnectWebSocket();
    };
  }, [initializeWebSocket, disconnectWebSocket, currentPath]);

  return null;
};
