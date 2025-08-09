import React, { useState, useEffect } from 'react';
import { SystemStatsService, SystemStats } from '@/services/systemStatsService';

interface TerminalStyleStatsProps {
  refreshInterval?: number;
}

const TerminalStyleStats: React.FC<TerminalStyleStatsProps> = ({ 
  refreshInterval = 3000 
}) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const systemStatsService = SystemStatsService.getInstance();

  const fetchStats = async () => {
    try {
      const newStats = await systemStatsService.getSystemStats();
      if (newStats) {
        setStats(newStats);
      }
    } catch (err) {
      console.error('Error fetching system stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (isLoading || !stats) {
    return (
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-mono">CPU USAGE</span>
          <span className="text-xs font-mono">Loading...</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-mono">RAM USAGE</span>
          <span className="text-xs font-mono">Loading...</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-mono">SERVER IP</span>
          <span className="text-xs font-mono">Loading...</span>
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
    </div>
  );
};

export default TerminalStyleStats;
