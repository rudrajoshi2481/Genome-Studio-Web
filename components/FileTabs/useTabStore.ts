import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useDialogStore } from './useDialogStore'

export interface TabFile {
  id: string;
  name: string;
  path: string;
  content?: string;
  isDirty?: boolean;
  isModified?: boolean;
  extension?: string;
}

export interface TabOptions {
  maxTabs?: number;
  allowDuplicates?: boolean;
  autoSave?: boolean;
}

interface TabState {
  tabs: Map<string, TabFile>;
  activeTabId: string | null;
  tabOrder: string[];
  options: TabOptions;
  
  // Actions
  addTab: (filePath: string, fileName?: string, content?: string) => string | null;
  removeTab: (tabId: string) => boolean;
  forceRemoveTab: (tabId: string) => boolean;
  closeTab: (tabId: string) => boolean;
  activateTab: (tabId: string) => boolean;
  updateTabContent: (tabId: string, content: string) => boolean;
  updateTab: (tabId: string, updatedTab: Partial<TabFile>) => boolean;
  setTabDirty: (tabId: string, isDirty: boolean) => boolean;
  saveTab: (tabId: string) => boolean;
  closeAllTabs: () => boolean;
  moveTab: (tabId: string, newIndex: number) => boolean;
  findTabs: (pattern: string) => TabFile[];
  getActiveTab: () => TabFile | null;
  getTab: (tabId: string) => TabFile | null;
  getAllTabs: () => TabFile[];
  getStats: () => {
    totalTabs: number;
    dirtyTabs: number;
    activeTabId: string | null;
    maxTabs: number;
  };
  setOptions: (options: Partial<TabOptions>) => void;
}

// Helper functions
const generateTabId = (filePath: string): string => {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
};

const getFileExtension = (filePath: string): string => {
  return filePath.split('.').pop()?.toLowerCase() || '';
};

const mapToObject = (map: Map<string, TabFile> | Record<string, TabFile>): Record<string, TabFile> => {
  const obj: Record<string, TabFile> = {};
  
  // Check if map is actually a Map
  if (map instanceof Map) {
    map.forEach((value, key) => {
      obj[key] = value;
    });
  } else if (typeof map === 'object' && map !== null) {
    // Handle case where map is already an object
    Object.keys(map).forEach(key => {
      obj[key] = map[key];
    });
  }
  
  return obj;
};

const objectToMap = (obj: Record<string, TabFile> | null | undefined): Map<string, TabFile> => {
  const map = new Map<string, TabFile>();
  
  // Handle null/undefined or non-object cases
  if (!obj || typeof obj !== 'object') {
    return map;
  }
  
  // Handle case where obj might already be a Map
  if (obj instanceof Map) {
    return obj;
  }
  
  // Convert object to Map
  Object.entries(obj).forEach(([key, value]) => {
    if (value) {
      map.set(key, value);
    }
  });
  
  return map;
};

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: new Map<string, TabFile>(),
      activeTabId: null,
      tabOrder: [],
      options: {
        maxTabs: 20,
        allowDuplicates: false,
        autoSave: false
      },
      
      addTab: (filePath, fileName, content) => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in addTab');
          set({ tabs: new Map<string, TabFile>() });
          return null;
        }
        
        // Check for duplicates if not allowed
        if (!state.options.allowDuplicates) {
          for (const [id, tab] of state.tabs.entries()) {
            if (tab.path === filePath) {
              state.activateTab(id);
              return id;
            }
          }
        }

        // Check max tabs limit
        if (state.options.maxTabs && state.tabs.size >= state.options.maxTabs) {
          console.warn(`Maximum number of tabs (${state.options.maxTabs}) reached`);
          return null;
        }

        const tabId = generateTabId(filePath);
        const name = fileName || filePath.split('/').pop() || 'Untitled';
        
        const newTab: TabFile = {
          id: tabId,
          name,
          path: filePath,
          content: content || '',
          isDirty: false,  // Start with clean state
          isModified: false,
          extension: getFileExtension(filePath)
        };

        const newTabs = new Map(state.tabs);
        newTabs.set(tabId, newTab);
        
        const newTabOrder = [...state.tabOrder, tabId];
        const newActiveTabId = state.tabs.size === 0 || !state.activeTabId ? tabId : state.activeTabId;
        
        set({ 
          tabs: newTabs,
          tabOrder: newTabOrder,
          activeTabId: newActiveTabId
        });
        
        return tabId;
      },
      
      removeTab: (tabId) => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in removeTab');
          return false;
        }
        
        const tab = state.tabs.get(tabId);
        if (!tab) return false;

        // Check if tab has unsaved changes
        if (tab.isDirty && !state.options.autoSave) {
          // Instead of using browser confirm, use our custom dialog
          useDialogStore.getState().openUnsavedChangesDialog(tabId, tab.name);
          return false; // Return early, the actual removal will happen when dialog is confirmed
        }

        const newTabs = new Map(state.tabs);
        newTabs.delete(tabId);
        
        const newTabOrder = state.tabOrder.filter(id => id !== tabId);
        
        // Handle active tab removal
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === tabId) {
          const currentIndex = state.tabOrder.indexOf(tabId);
          if (newTabOrder.length > 0) {
            if (currentIndex < newTabOrder.length) {
              newActiveTabId = newTabOrder[currentIndex];
            } else {
              newActiveTabId = newTabOrder[newTabOrder.length - 1];
            }
          } else {
            newActiveTabId = null;
          }
        }
        
        set({
          tabs: newTabs,
          tabOrder: newTabOrder,
          activeTabId: newActiveTabId
        });
        
        return true;
      },
      
      forceRemoveTab: (tabId) => {
        const state = get();
        
        console.log('🗑️ TabStore: Force removing tab:', tabId);
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in forceRemoveTab');
          return false;
        }
        
        const tab = state.tabs.get(tabId);
        if (!tab) {
          console.warn('Tab not found for forceRemoveTab:', tabId);
          return false;
        }

        // Skip dirty check - force remove regardless of state
        const newTabs = new Map(state.tabs);
        newTabs.delete(tabId);
        
        const newTabOrder = state.tabOrder.filter(id => id !== tabId);
        
        // Handle active tab removal
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === tabId) {
          const currentIndex = state.tabOrder.indexOf(tabId);
          if (newTabOrder.length > 0) {
            if (currentIndex < newTabOrder.length) {
              newActiveTabId = newTabOrder[currentIndex];
            } else {
              newActiveTabId = newTabOrder[newTabOrder.length - 1];
            }
          } else {
            newActiveTabId = null;
          }
        }
        
        set({
          tabs: newTabs,
          tabOrder: newTabOrder,
          activeTabId: newActiveTabId
        });
        
        console.log('✅ TabStore: Tab force removed successfully:', tabId);
        return true;
      },
      
      closeTab: (tabId) => {
        // Alias for removeTab for better semantic clarity
        return get().removeTab(tabId)
      },
      
      activateTab: (tabId) => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in activateTab');
          return false;
        }
        
        if (!state.tabs.has(tabId)) return false;
        
        set({ activeTabId: tabId });
        return true;
      },
      
      getActiveTab: () => {
        const state = get();
        if (!state.activeTabId) return null;
        // Ensure tabs is a Map before calling get
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in getActiveTab');
          return null;
        }
        return state.tabs.get(state.activeTabId) || null;
      },
      
      getTab: (tabId) => {
        const state = get();
        // Ensure tabs is a Map before calling get
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in getTab');
          return null;
        }
        return state.tabs.get(tabId) || null;
      },
      
      getAllTabs: () => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in getAllTabs');
          return [];
        }
        
        return state.tabOrder.map(id => state.tabs.get(id)).filter(Boolean) as TabFile[];
      },
      
      updateTabContent: (tabId, content) => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in updateTabContent');
          return false;
        }
        
        const tab = state.tabs.get(tabId);
        if (!tab) return false;

        // Check if content has actually changed
        const wasModified = tab.content !== content;
        
        // Only mark as dirty if this is a user-initiated content change
        // For initial content loading, we don't want to mark as dirty
        // This will be handled by a separate setTabDirty method later
        const newTab = {
          ...tab,
          content,
          isModified: wasModified,
          // Keep the current dirty state - don't automatically mark as dirty
          // This ensures files loaded from the server aren't marked dirty
          isDirty: tab.isDirty || false
        };
        
        const newTabs = new Map(state.tabs);
        newTabs.set(tabId, newTab);
        
        set({ tabs: newTabs });
        return true;
      },
      
      setTabDirty: (tabId, isDirty = true) => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in setTabDirty');
          return false;
        }
        
        const tab = state.tabs.get(tabId);
        if (!tab) return false;
        
        const newTab = {
          ...tab,
          isDirty
        };
        
        const newTabs = new Map(state.tabs);
        newTabs.set(tabId, newTab);
        
        set({ tabs: newTabs });
        return true;
      },
      
      saveTab: (tabId) => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in saveTab');
          return false;
        }
        
        const tab = state.tabs.get(tabId);
        if (!tab) return false;
        
        const newTab = {
          ...tab,
          isDirty: false
        };
        
        const newTabs = new Map(state.tabs);
        newTabs.set(tabId, newTab);
        
        set({ tabs: newTabs });
        return true;
      },
      
      closeAllTabs: () => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in closeAllTabs');
          set({ tabs: new Map<string, TabFile>(), tabOrder: [], activeTabId: null });
          return true;
        }
        
        const dirtyTabs = Array.from(state.tabs.values()).filter(tab => tab.isDirty);
        
        if (dirtyTabs.length > 0 && !state.options.autoSave) {
          const shouldClose = confirm(`${dirtyTabs.length} tab(s) have unsaved changes. Close all anyway?`);
          if (!shouldClose) return false;
        }
        
        set({
          tabs: new Map(),
          tabOrder: [],
          activeTabId: null
        });
        
        return true;
      },
      
      moveTab: (tabId, newIndex) => {
        const state = get();
        const currentIndex = state.tabOrder.indexOf(tabId);
        
        if (currentIndex === -1 || newIndex < 0 || newIndex >= state.tabOrder.length) {
          return false;
        }

        const newTabOrder = [...state.tabOrder];
        newTabOrder.splice(currentIndex, 1);
        newTabOrder.splice(newIndex, 0, tabId);
        
        set({ tabOrder: newTabOrder });
        return true;
      },
      
      findTabs: (pattern) => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in findTabs');
          return [];
        }
        
        const regex = new RegExp(pattern, 'i');
        
        return Array.from(state.tabs.values()).filter(tab => 
          regex.test(tab.name) || regex.test(tab.path)
        );
      },
      
      getStats: () => {
        const state = get();
        
        // Ensure tabs is a Map
        if (!(state.tabs instanceof Map)) {
          console.warn('tabs is not a Map in getStats');
          return {
            totalTabs: 0,
            dirtyTabs: 0,
            activeTabId: null,
            maxTabs: state.options.maxTabs || 0
          };
        }
        
        const dirtyTabs = Array.from(state.tabs.values()).filter(tab => tab.isDirty).length;
        
        return {
          totalTabs: state.tabs.size,
          dirtyTabs,
          activeTabId: state.activeTabId,
          maxTabs: state.options.maxTabs || 0
        };
      },
      
      setOptions: (options) => {
        set(state => ({
          options: { ...state.options, ...options }
        }));
      },
      
      // Update tab with new properties
      updateTab: (tabId, updatedTab) => {
        const { tabs, tabOrder } = get();
        const tab = tabs.get(tabId);
        
        if (!tab) return false;
        
        // Create updated tab by merging existing tab with updates
        const newTab = { ...tab, ...updatedTab };
        
        // Update the tab in the map
        const newTabs = new Map(tabs);
        newTabs.set(tabId, newTab);
        
        set({ tabs: newTabs });
        return true;
      }
    }),
    {
      name: 'tab-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: mapToObject(state.tabs as Map<string, TabFile> | Record<string, TabFile>),
        activeTabId: state.activeTabId,
        tabOrder: state.tabOrder,
        options: state.options
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Fix for rehydration - convert tabs object to Map
          if (state.tabs && typeof state.tabs === 'object' && !(state.tabs instanceof Map)) {
            console.log('Converting tabs object to Map during rehydration');
            const tabsObject = state.tabs as unknown as Record<string, TabFile>;
            state.tabs = objectToMap(tabsObject);
          }
        }
      }
    }
  )
);
