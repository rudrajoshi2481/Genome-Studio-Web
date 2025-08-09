import React, { useState, useEffect } from 'react';
import { SystemStatsService, SystemStats } from '@/services/systemStatsService';

interface SimpleServerIPProps {
  refreshInterval?: number;
}

const SimpleServerIP: React.FC<SimpleServerIPProps> = ({ 
  refreshInterval = 5000 
}) => {
  const [serverIP, setServerIP] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);

  const systemStatsService = SystemStatsService.getInstance();

  const fetchServerIP = async () => {
    try {
      setError(null);
      const stats = await systemStatsService.getSystemStats();
      
      if (stats) {
        setServerIP(stats.server_ip);
      } else {
        setError('Failed to fetch server IP');
        setServerIP('Unavailable');
      }
    } catch (err) {
      setError('Error: ' + String(err));
      setServerIP('Error');
    }
  };

  useEffect(() => {
    fetchServerIP();
    const interval = setInterval(fetchServerIP, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return (
    <div className='flex flex-col text-xs'>
      <span className='font-mono text-xs'>SERVER IP</span>
      <span className='font-mono text-xs'>{serverIP}</span>
    </div>
  );
};

export default SimpleServerIP;
