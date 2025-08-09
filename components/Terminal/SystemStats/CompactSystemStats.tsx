import React, { useState, useEffect } from 'react';
import { SystemStatsService, SystemStats } from '@/services/systemStatsService';

interface BatteryIconProps {
  percentage: number;
  label: string;
  className?: string;
}

const BatteryIcon: React.FC<BatteryIconProps> = ({ percentage, label, className = '' }) => {
  const systemStatsService = SystemStatsService.getInstance();
  const color = systemStatsService.getUsageColor(percentage);
  
  // Calculate battery fill level (0-100%)
  const fillLevel = Math.min(Math.max(percentage, 0), 100);
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        {/* Battery Icon */}
        <div className="relative">
          <svg width="24" height="12" viewBox="0 0 24 12" className="drop-shadow-sm">
            {/* Battery outline */}
            <rect
              x="1"
              y="2"
              width="20"
              height="8"
              rx="1"
              fill="none"
              stroke="#6b7280"
              strokeWidth="1"
            />
            {/* Battery terminal */}
            <rect
              x="21"
              y="4"
              width="2"
              height="4"
              rx="1"
              fill="#6b7280"
            />
            {/* Battery fill */}
            <rect
              x="2"
              y="3"
              width={`${(fillLevel / 100) * 18}`}
              height="6"
              rx="0.5"
              fill={color}
              className="transition-all duration-300"
            />
          </svg>
        </div>
        
        {/* Label and Percentage */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-none">
            {label}
          </span>
          <span 
            className="text-xs font-mono leading-none"
            style={{ color }}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

interface CompactSystemStatsProps {
  className?: string;
  refreshInterval?: number;
  showIP?: boolean;
}

const CompactSystemStats: React.FC<CompactSystemStatsProps> = ({ 
  className = '',
  refreshInterval = 3000,
  showIP = false
}) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const systemStatsService = SystemStatsService.getInstance();

  const fetchStats = async () => {
    try {
      setError(null);
      const newStats = await systemStatsService.getSystemStats();
      
      if (newStats) {
        setStats(newStats);
      } else {
        setError('Failed to fetch stats');
      }
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-6 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-8 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-6 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-8 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-xs text-red-500">Stats unavailable</span>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* CPU Battery */}
      <BatteryIcon
        percentage={stats.cpu_usage}
        label="CPU"
      />
      
      {/* RAM Battery */}
      <BatteryIcon
        percentage={stats.ram_usage}
        label="RAM"
      />
      
      {/* Optional IP Display */}
      {showIP && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded">
          <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2 2a1 1 0 000 2h.01a1 1 0 100-2H5zm3 0a1 1 0 000 2h3a1 1 0 100-2H8z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
            {stats.server_ip}
          </span>
        </div>
      )}
    </div>
  );
};

export default CompactSystemStats;
