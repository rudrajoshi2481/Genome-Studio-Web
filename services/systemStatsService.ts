import { host, port } from '@/config/server';

export interface SystemStats {
  server_ip: string;
  cpu_usage: number;
  ram_usage: number;
  ram_total: number;
  ram_used: number;
  ram_available: number;
  disk_usage: number;
  disk_total: number;
  disk_used: number;
  disk_free: number;
  uptime: number;
}

export class SystemStatsService {
  private static instance: SystemStatsService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = `http://${host}:${port}`;
  }

  public static getInstance(): SystemStatsService {
    if (!SystemStatsService.instance) {
      SystemStatsService.instance = new SystemStatsService();
    }
    return SystemStatsService.instance;
  }

  /**
   * Fetch current system statistics
   */
  async getSystemStats(): Promise<SystemStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/system/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch system stats:', response.statusText);
        return null;
      }

      const stats: SystemStats = await response.json();
      return stats;
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return null;
    }
  }

  /**
   * Check if system stats service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/system/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('System stats health check failed:', error);
      return false;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format uptime to human readable format
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get color based on usage percentage
   */
  getUsageColor(percentage: number): string {
    if (percentage >= 100) return '#ef4444'; // red-500
    if (percentage >= 80) return '#f59e0b';  // amber-500
    return '#10b981'; // emerald-500
  }

  /**
   * Get usage status text
   */
  getUsageStatus(percentage: number): string {
    if (percentage >= 100) return 'Critical';
    if (percentage >= 80) return 'Warning';
    return 'Normal';
  }
}
