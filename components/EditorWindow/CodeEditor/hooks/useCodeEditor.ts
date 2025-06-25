import { useState, useCallback, useEffect } from 'react';
import { useTabStore, TabFile } from '@/components/FileTabs/useTabStore';
import { useFileContentStore } from '@/lib/stores/file-content-store';
import { debounce } from 'lodash';
import path from 'path';

/**
 * Hook for managing code editor state and operations
 * @param tabId - The ID of the current tab
 * @param initialContent - Initial content for the editor
 */
export function useCodeEditor(tabId: string, initialContent: string = '') {
  // Local state
  const [activeContent, setActiveContent] = useState<string>(initialContent);
  const [lastSavedContent, setLastSavedContent] = useState<string>(initialContent);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConflicts, setHasConflicts] = useState<boolean>(false);
  
  // Reset state when tab changes
  useEffect(() => {
    setActiveContent(initialContent);
    setLastSavedContent(initialContent);
    setError(null);
    setHasConflicts(false);
  }, [tabId, initialContent]);
  
  // Get tab store methods
  const tabStore = useTabStore();
  const { updateTabContent, setTabDirty } = tabStore;
  
  // Get file content store methods
  const fileContentStore = useFileContentStore();
  
  // Get active tab
  const activeTab = tabStore.getTab(tabId);
  
  // Compute if there are unsaved changes
  const hasUnsavedChanges = activeContent !== lastSavedContent && activeContent.trim() !== '';
  
  // Fetch file content when component mounts or tab changes
  useEffect(() => {
    const fetchFileContent = async () => {
      if (!activeTab?.path) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const rootPath = path.dirname(activeTab.path);
        console.log('[EDITOR LOAD] Fetching content for:', activeTab.path);
        
        // Get file content from the store
        const fileContent = await fileContentStore.getFileContent(activeTab.path, rootPath);
        
        // Update local state
        setActiveContent(fileContent.content);
        setLastSavedContent(fileContent.content);
        
        console.log('[EDITOR LOAD] Content loaded successfully');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[EDITOR LOAD] ERROR: Failed to load file:', errorMessage);
        setError(`Failed to load file: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFileContent();
  }, [tabId, activeTab?.path, fileContentStore]);
  
  // Debounced content change handler to reduce excessive updates
  const debouncedContentUpdate = useCallback(
    debounce((content: string, tabId: string) => {
      updateTabContent(tabId, content);
      setTabDirty(tabId, content !== lastSavedContent);
    }, 300),
    [updateTabContent, setTabDirty, lastSavedContent]
  );

  // Optimized content change handler
  const handleContentChange = useCallback((newContent: string) => {
    if (!activeTab) {
      console.log('[EDITOR CONTENT] ERROR: No active tab, cannot update content');
      return;
    }
    
    // Update the active content in the editor
    setActiveContent(newContent);
    
    // Mark the tab as dirty (unsaved changes)
    setTabDirty(activeTab.id, true);
    
    // Update the tab content in the tabs state
    debouncedContentUpdate(newContent, activeTab.id);
  }, [activeTab, debouncedContentUpdate, setTabDirty]);
  
  // Save file content to backend
  const saveFileContent = useCallback(async () => {
    if (!activeTab?.path) {
      console.log('[EDITOR SAVE] ERROR: No active tab path available');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const rootPath = path.dirname(activeTab.path);
      
      const result = await fileContentStore.updateFileContent(activeTab.path, activeContent, rootPath);
      
      // Handle merge results
      if (result.merged) {
        // Update content with merged version
        setActiveContent(result.content);
        
        if (result.hasConflicts) {
          setHasConflicts(true);
          setError('Merge conflicts detected. Please resolve conflicts before continuing.');
        } else {
          setHasConflicts(false);
          setError(null);
        }
      }
      
      setLastSavedContent(result.content);
      
      setTabDirty(activeTab.id, result.hasConflicts); // Keep tab dirty if there are conflicts
      
      console.log('[EDITOR SAVE] Save completed successfully');
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[EDITOR SAVE] ERROR: Failed to save file:', errorMessage);
      setError(`Failed to save file: ${errorMessage}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeTab?.path, activeContent, lastSavedContent, fileContentStore, setTabDirty]);

  return {
    activeContent,
    setActiveContent,
    lastSavedContent,
    isLoading,
    error,
    hasConflicts,
    hasUnsavedChanges,
    handleContentChange,
    saveFileContent
  };
}
