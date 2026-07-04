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

  const statsRef = useRef<SystemStats | null>(null);

  // Memoize callbacks to prevent re-renders
  const handleStatsUpdate = useCallback((newStats: SystemStats) => {
    const prev = statsRef.current;
    if (prev &&
        prev.cpu_usage === newStats.cpu_usage &&
        prev.ram_usage === newStats.ram_usage &&
        prev.ram_total === newStats.ram_total &&
        prev.ram_used === newStats.ram_used &&
        prev.ram_available === newStats.ram_available &&
        prev.disk_usage === newStats.disk_usage &&
        prev.disk_total === newStats.disk_total &&
        prev.disk_used === newStats.disk_used &&
        prev.disk_free === newStats.disk_free &&
        prev.uptime === newStats.uptime &&
        prev.server_ip === newStats.server_ip) {
      return;
    }
    statsRef.current = newStats;
    setStats(newStats);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const updateConnectionStatus = useCallback(() => {
    const svc = SystemStatsService.getInstance();
    const status = svc.getConnectionStatus();
    setConnectionStatus(prevStatus => {
      // Only update if status actually changed
      if (prevStatus !== status) {
        return status;
      }
      return prevStatus;
    });
  }, []);

  // Refs to hold latest callbacks so the effect can use them without re-running
  const handleStatsUpdateRef = useRef(handleStatsUpdate);
  const handleErrorRef = useRef(handleError);
  const updateConnectionStatusRef = useRef(updateConnectionStatus);
  handleStatsUpdateRef.current = handleStatsUpdate;
  handleErrorRef.current = handleError;
  updateConnectionStatusRef.current = updateConnectionStatus;

  useEffect(() => {
    const svc = SystemStatsService.getInstance();

    // Subscribe to real-time system stats updates
    const unsubscribe = svc.subscribe((stats) => handleStatsUpdateRef.current(stats));

    // Subscribe to error notifications
    const unsubscribeError = svc.onError((err) => handleErrorRef.current(err));

    // Monitor connection status with reduced frequency
    // Defer initial check to avoid synchronous setState in effect
    setTimeout(() => updateConnectionStatusRef.current(), 0);
    statusIntervalRef.current = setInterval(() => updateConnectionStatusRef.current(), 2000);

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribe();
      unsubscribeError();
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
