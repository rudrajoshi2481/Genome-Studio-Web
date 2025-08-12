import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SystemStatsService, SystemStats } from '@/services/systemStatsService';

interface TerminalStyleStatsProps {
  // refreshInterval is no longer needed with WebSocket
}

const TerminalStyleStats: React.FC<TerminalStyleStatsProps> = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const systemStatsService = SystemStatsService.getInstance();

  // Memoize callbacks to prevent re-renders
  const handleStatsUpdate = useCallback((newStats: SystemStats) => {
    setStats(newStats);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const updateConnectionStatus = useCallback(() => {
    const status = systemStatsService.getConnectionStatus();
    setConnectionStatus(prevStatus => {
      // Only update if status actually changed
      if (prevStatus !== status) {
        return status;
      }
      return prevStatus;
    });
  }, [systemStatsService]);

  useEffect(() => {
    // Subscribe to real-time system stats updates
    const unsubscribe = systemStatsService.subscribe(handleStatsUpdate);

    // Subscribe to error notifications
    const unsubscribeError = systemStatsService.onError(handleError);

    // Monitor connection status with reduced frequency
    updateConnectionStatus(); // Initial status check
    statusIntervalRef.current = setInterval(updateConnectionStatus, 2000); // Check every 2 seconds instead of 1

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribe();
      unsubscribeError();
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [handleStatsUpdate, handleError, updateConnectionStatus]);

  if (isLoading || !stats) {
    return (
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-mono">CPU USAGE</span>
          <span className="text-xs font-mono">
            {error ? 'Error' : connectionStatus === 'connecting' ? 'Connecting...' : 'Loading...'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-mono">RAM USAGE</span>
          <span className="text-xs font-mono">
            {error ? 'Error' : connectionStatus === 'connecting' ? 'Connecting...' : 'Loading...'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-mono">CONNECTION</span>
          <span className={`text-xs font-mono ${
            connectionStatus === 'connected' ? 'text-green-400' :
            connectionStatus === 'connecting' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {connectionStatus.toUpperCase()}
          </span>
        </div>
      </div>
    );
  }

  // Get color based on usage percentage
  const getCPUColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRAMColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="flex items-center gap-6">
      {/* CPU Usage */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 font-mono">CPU USAGE</span>
        <span className={`text-xs font-mono ${getCPUColor(stats.cpu_usage)}`}>
          {stats.cpu_usage.toFixed(1)}%
        </span>
      </div>
      
      {/* RAM Usage */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 font-mono">RAM USAGE</span>
        <span className={`text-xs font-mono ${getRAMColor(stats.ram_usage)}`}>
          {stats.ram_usage.toFixed(1)}%
        </span>
      </div>
      
      {/* Server IP */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 font-mono">SERVER IP</span>
        <span className="text-xs font-mono text-blue-400">
          {stats.server_ip}
        </span>
      </div>
      
      {/* Connection Status Indicator */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 font-mono">STATUS</span>
        <span className={`text-xs font-mono ${
          connectionStatus === 'connected' ? 'text-green-400' :
          connectionStatus === 'connecting' ? 'text-yellow-400' :
          'text-red-400'
        }`}>
          {connectionStatus === 'connected' ? 'LIVE' :
           connectionStatus === 'connecting' ? 'CONN' :
           'DISC'}
        </span>
      </div>
      
      {/* Error indicator */}
      {error && (
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-mono">ERROR</span>
          <span className="text-xs font-mono text-red-400" title={error}>
            FAIL
          </span>
        </div>
      )}
    </div>
  );
};

export default TerminalStyleStats;
