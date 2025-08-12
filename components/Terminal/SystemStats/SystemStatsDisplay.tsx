// import React, { useState, useEffect } from 'react';
// import { SystemStatsService, SystemStats } from '@/services/systemStatsService';

// interface ProgressBarProps {
//   label: string;
//   value: number;
//   maxValue?: number;
//   unit?: string;
//   showPercentage?: boolean;
// }

// const ProgressBar: React.FC<ProgressBarProps> = ({ 
//   label, 
//   value, 
//   maxValue = 100, 
//   unit = '%',
//   showPercentage = true 
// }) => {
//   const percentage = Math.min((value / maxValue) * 100, 100);
//   const systemStatsService = SystemStatsService.getInstance();
//   const color = systemStatsService.getUsageColor(percentage);
//   const status = systemStatsService.getUsageStatus(percentage);

//   return (
//     <div className="mb-3">
//       <div className="flex justify-between items-center mb-1">
//         <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
//           {label}
//         </span>
//         <div className="flex items-center space-x-2">
//           <span className="text-sm text-gray-600 dark:text-gray-400">
//             {showPercentage ? `${value.toFixed(1)}${unit}` : `${systemStatsService.formatBytes(value)}`}
//           </span>
//           <span className={`text-xs px-2 py-1 rounded-full ${
//             status === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
//             status === 'Warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
//             'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
//           }`}>
//             {status}
//           </span>
//         </div>
//       </div>
//       <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
//         <div
//           className="h-2.5 rounded-full transition-all duration-300 ease-in-out"
//           style={{
//             width: `${percentage}%`,
//             backgroundColor: color
//           }}
//         />
//       </div>
//     </div>
//   );
// };

// interface SystemStatsDisplayProps {
//   className?: string;
//   refreshInterval?: number;
// }

// const SystemStatsDisplay: React.FC<SystemStatsDisplayProps> = ({ 
//   className = '',
//   refreshInterval = 5000 // 5 seconds default
// }) => {
//   const [stats, setStats] = useState<SystemStats | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

//   const systemStatsService = SystemStatsService.getInstance();

//   const fetchStats = async () => {
//     try {
//       setError(null);
//       const newStats = await systemStatsService.getSystemStats();
      
//       if (newStats) {
//         setStats(newStats);
//         setLastUpdated(new Date());
//       } else {
//         setError('Failed to fetch system statistics');
//       }
//     } catch (err) {
//       setError('Error fetching system statistics: ' + String(err));
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     // Initial fetch
//     fetchStats();

//     // Set up interval for periodic updates
//     const interval = setInterval(fetchStats, refreshInterval);

//     // Cleanup interval on unmount
//     return () => clearInterval(interval);
//   }, [refreshInterval]);

//   if (isLoading) {
//     return (
//       <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
//         <div className="animate-pulse">
//           <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
//           <div className="space-y-3">
//             <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
//             <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
//             <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className={`p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 ${className}`}>
//         <div className="flex items-center">
//           <div className="flex-shrink-0">
//             <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//             </svg>
//           </div>
//           <div className="ml-3">
//             <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!stats) {
//     return (
//       <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
//         <p className="text-sm text-gray-600 dark:text-gray-400">No system statistics available</p>
//       </div>
//     );
//   }

//   return (
//     <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
//       {/* Header */}
//       <div className="flex items-center justify-between mb-4">
//         <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
//           Server Statistics
//         </h3>
//         <div className="flex items-center space-x-2">
//           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//           <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
//         </div>
//       </div>

//       {/* Server IP */}
//       <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
//         <div className="flex items-center justify-between">
//           <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
//             Server IP
//           </span>
//           <span className="text-sm font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
//             {stats.server_ip}
//           </span>
//         </div>
//       </div>

//       {/* System Metrics */}
//       <div className="space-y-4">
//         <ProgressBar
//           label="CPU Usage"
//           value={stats.cpu_usage}
//           unit="%"
//         />

//         <ProgressBar
//           label="RAM Usage"
//           value={stats.ram_usage}
//           unit="%"
//         />

//         <ProgressBar
//           label="Disk Usage"
//           value={stats.disk_usage}
//           unit="%"
//         />
//       </div>

//       {/* Additional Info */}
//       <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
//         <div className="grid grid-cols-2 gap-4 text-sm">
//           <div>
//             <span className="text-gray-600 dark:text-gray-400">RAM:</span>
//             <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
//               {systemStatsService.formatBytes(stats.ram_used)} / {systemStatsService.formatBytes(stats.ram_total)}
//             </span>
//           </div>
//           <div>
//             <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
//             <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
//               {systemStatsService.formatUptime(stats.uptime)}
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Last Updated */}
//       {lastUpdated && (
//         <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
//           Last updated: {lastUpdated.toLocaleTimeString()}
//         </div>
//       )}
//     </div>
//   );
// };

// export default SystemStatsDisplay;
