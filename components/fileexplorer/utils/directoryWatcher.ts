import { config } from '@/lib/config';

/**
 * Utility for managing watched directories in the file explorer
 * This helps optimize performance by only watching directories that are currently expanded
 */

/**
 * Start watching a directory
 * @param path Directory path to watch
 */
export const watchDirectory = async (path: string): Promise<void> => {
  try {
    const { apiRequest } = await import('@/lib/api-client');
    await apiRequest(`${config.apiUrl}/api/watch/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        path,
        watch: true
      })
    });
    console.log(`[DirectoryWatcher] Started watching: ${path}`);
  } catch (error) {
    console.error('[DirectoryWatcher] Error starting watch:', error);
  }
};

/**
 * Stop watching a directory
 * @param path Directory path to unwatch
 */
export const unwatchDirectory = async (path: string): Promise<void> => {
  try {
    const { apiRequest } = await import('@/lib/api-client');
    await apiRequest(`${config.apiUrl}/api/watch/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        path,
        watch: false
      })
    });
    console.log(`[DirectoryWatcher] Stopped watching: ${path}`);
  } catch (error) {
    console.error('[DirectoryWatcher] Error stopping watch:', error);
  }
};

/**
 * Get the current list of watched directories
 */
export const getWatchedDirectories = async (): Promise<string[]> => {
  try {
    const { apiRequest } = await import('@/lib/api-client');
    const response = await apiRequest(`${config.apiUrl}/api/watch/status`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    return response.watched_directories || [];
  } catch (error) {
    console.error('[DirectoryWatcher] Error getting watched directories:', error);
    return [];
  }
};
