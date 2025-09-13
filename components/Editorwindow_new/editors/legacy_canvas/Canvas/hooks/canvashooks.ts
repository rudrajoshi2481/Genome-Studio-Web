    

import { useTabStore } from '@/components/FileTabs/useTabStore';
import { host, port } from '@/config/server';
import authService from '@/lib/services/auth-service';
import { useFileContentStore } from '@/lib/stores/file-content-store';

export const fetchTabFilePath = async (tabId: string) => {
  const tab = useTabStore.getState().getTab(tabId);
  console.log("Tab Fetch Path:", tab);
  return {
    name: tab?.name || '',
    path: tab?.path
  };
};

export const fetchTabFileContent = async (name: string, path: string, forceRefresh: boolean = false) => {
  if (!path) {
    console.error('No path provided to fetchTabFileContent');
    return null;
  }

  try {
    // Get the file content store
    const fileContentStore = useFileContentStore.getState();
    
    // Extract the root path (directory containing the file)
    const rootPath = path.substring(0, path.lastIndexOf('/'));
    
    // Use the store's getFileContent method to fetch the file
    const fileContent = await fileContentStore.getFileContent(path, rootPath, forceRefresh);
    
    console.log('Fetched file content:', {
      path,
      contentLength: fileContent.content?.length || 0,
      metadata: fileContent.metadata,
      forceRefresh
    });
    
    return fileContent.content;
  } catch (error) {
    console.error('Error fetching file content:', error);
    return null;
  }
};


export const updateTabFileContent = async (tabId: string, content: string): Promise<boolean> => {
  try {
    // Get the tab information from the tab store
    const tabStore = useTabStore.getState();
    const tab = tabStore.tabs.get(tabId);
    
    if (!tab) {
      console.error('Tab not found for saving:', tabId);
      return false;
    }
    
    // Use the actual path from the tab
    const path = tab.path;
    console.log('Saving file to path:', path);
    
    // Based on the working curl example, the API expects:
    // 1. root_path parameter: The full path to the directory (e.g., '/home')
    // 2. path parameter: The full path to the file (e.g., '/home/new.flow')
    
    // Extract the directory part of the path for root_path
    const lastSlashIndex = path.lastIndexOf('/');
    const rootPath = lastSlashIndex > 0 ? path.substring(0, lastSlashIndex) : '/home';
    
    // For the API, we'll use the full path as is
    // This matches the working curl example
    
    console.log(`Original path: ${path}`);
    console.log(`Root path (directory): ${rootPath}`);
    
    if (!rootPath) {
      console.error('Could not determine root path from:', path);
      return false;
    }
    
    console.log(`Attempting to save file with path: ${path}, rootPath: ${rootPath}`);
    
    // Try direct API call first
    try {
      // Get authentication token
      const token = authService.getToken();
      if (!token) {
        console.error('No authentication token available');
        return false;
      }
      
      // Get the current file state from the store to access original content
      const fileContentStore = useFileContentStore.getState();
      const currentFile = fileContentStore.files[path];
      const originalContent = currentFile?.originalContent || currentFile?.content;
      
      console.log(`Saving file with API call. Has original content: ${!!originalContent}`);
      
      // Send the update request
      const response = await fetch(`http://${host}:${port}/api/v1/file-explorer/update-file-content?root_path=${encodeURIComponent(rootPath)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          path: path, // Use the full path as in the curl example
          content,
          base_content: originalContent || undefined
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${response.statusText}`, errorText);
        throw new Error(`API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('File saved successfully with direct API call:', data);
      return true;
    } catch (apiError) {
      console.error('Direct API call failed:', apiError);
      
      // Fall back to using the file content store
      try {
        console.log('Falling back to file content store method');
        const fileStore = useFileContentStore.getState();
        const result = await fileStore.updateFileContent(path, content, rootPath);
        console.log('File saved successfully via store fallback:', result);
        return true;
      } catch (storeError) {
        console.error('Store fallback also failed:', storeError);
        return false;
      }
    }
  } catch (error) {
    console.error('Error saving file content:', error);
    return false;
  }
};