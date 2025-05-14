import { useEffect } from 'react';
import { useFileExplorerStore } from './store';

export const WebSocketHandler: React.FC = () => {
  const { initializeWebSocket, disconnectWebSocket } = useFileExplorerStore();

  useEffect(() => {
    // Initialize with default path /app
    const cleanup = initializeWebSocket('/app');
    return () => {
      cleanup?.();
      disconnectWebSocket();
    };
  }, [initializeWebSocket, disconnectWebSocket]);

  return null;
};
