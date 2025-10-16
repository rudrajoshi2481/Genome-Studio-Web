import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
  closeTabsToRight: (tabId: string) => boolean;
  closeTabsToLeft: (tabId: string) => boolean;
  closeOtherTabs: (tabId: string) => boolean;
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
  
  if (map instanceof Map) {
    map.forEach((value, key) => {
      obj[key] = value;
    });
  } else if (typeof map === 'object' && map !== null) {
    Object.keys(map).forEach(key => {
      obj[key] = map[key];
    });
  }
  
  return obj;
};

const objectToMap = (obj: Record<string, TabFile> | null | undefined): Map<string, TabFile> => {
  const map = new Map<string, TabFile>();
  
  if (!obj || typeof obj !== 'object') {
    return map;
  }
  
  if (obj instanceof Map) {
    return obj;
  }
  
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
        
        if (!(state.tabs instanceof Map)) {
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
          return null;
        }

        const tabId = generateTabId(filePath);
        const name = fileName || filePath.split('/').pop() || 'Untitled';
        
        const newTab: TabFile = {
          id: tabId,
          name,
          path: filePath,
          content: content || '',
          isDirty: false,
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
        
        if (!(state.tabs instanceof Map)) {
          return false;
        }
        
        const tab = state.tabs.get(tabId);
        if (!tab) return false;

        // If tab has unsaved changes and no auto-save, return false to trigger dialog
        if (tab.isDirty && !state.options.autoSave) {
          return false;
        }

        return state.forceRemoveTab(tabId);
      },
      
      forceRemoveTab: (tabId) => {
        const state = get();
        
        if (!(state.tabs instanceof Map)) {
          return false;
        }
        
        const tab = state.tabs.get(tabId);
        if (!tab) return false;

        const newTabs = new Map(state.tabs);
        newTabs.delete(tabId);
        
        const newTabOrder = state.tabOrder.filter(id => id !== tabId);
        
        // Handle active tab removal
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === tabId) {
          const currentIndex = state.tabOrder.indexOf(tabId);
          if (newTabOrder.length > 0) {
            const nextIndex = Math.min(currentIndex, newTabOrder.length - 1);
            newActiveTabId = newTabOrder[nextIndex];
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
      
      closeTab: (tabId) => {
        return get().removeTab(tabId)
      },
      
      activateTab: (tabId) => {
        const state = get();
        
        if (!(state.tabs instanceof Map)) {
          return false;
        }
        
        if (!state.tabs.has(tabId)) return false;
        
        set({ activeTabId: tabId });
        return true;
      },
      
      getActiveTab: () => {
        const state = get();
        if (!state.activeTabId) return null;
        if (!(state.tabs instanceof Map)) {
          return null;
        }
        return state.tabs.get(state.activeTabId) || null;
      },
      
      getTab: (tabId) => {
        const state = get();
        if (!(state.tabs instanceof Map)) {
          return null;
        }
        return state.tabs.get(tabId) || null;
      },
      
      getAllTabs: () => {
        const state = get();
        
        if (!(state.tabs instanceof Map)) {
          return [];
        }
        
        return state.tabOrder.map(id => state.tabs.get(id)).filter(Boolean) as TabFile[];
      },
      
      updateTabContent: (tabId, content) => {
        const state = get();
        
        if (!(state.tabs instanceof Map)) {
          return false;
        }
        
        const tab = state.tabs.get(tabId);
        if (!tab) return false;

        const wasModified = tab.content !== content;
        
        const newTab = {
          ...tab,
          content,
          isModified: wasModified,
          isDirty: tab.isDirty || false
        };
        
        const newTabs = new Map(state.tabs);
        newTabs.set(tabId, newTab);
        
        set({ tabs: newTabs });
        return true;
      },
      
      setTabDirty: (tabId, isDirty = true) => {
        const state = get();
        
        if (!(state.tabs instanceof Map)) {
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
        
        if (!(state.tabs instanceof Map)) {
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
        
        if (!(state.tabs instanceof Map)) {
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

      closeTabsToRight: (tabId) => {
        const state = get();
        
        if (!(state.tabs instanceof Map)) {
          return false;
        }
        
        const currentIndex = state.tabOrder.indexOf(tabId);
        if (currentIndex === -1) return false;
        
        const tabsToClose = state.tabOrder.slice(currentIndex + 1);
        const dirtyTabs = tabsToClose.filter(id => state.tabs.get(id)?.isDirty);
        
        if (dirtyTabs.length > 0 && !state.options.autoSave) {
          const shouldClose = confirm(`${dirtyTabs.length} tab(s) have unsaved changes. Close anyway?`);
          if (!shouldClose) return false;
        }
        
        const newTabs = new Map(state.tabs);
        tabsToClose.forEach(id => newTabs.delete(id));
        
        const newTabOrder = state.tabOrder.slice(0, currentIndex + 1);
        
        set({
          tabs: newTabs,
          tabOrder: newTabOrder
        });
        
        return true;
      },

      closeTabsToLeft: (tabId) => {
        const state = get();
        
        if (!(state.tabs instanceof Map)) {
          return false;
        }
        
        const currentIndex = state.tabOrder.indexOf(tabId);
        if (currentIndex === -1) return false;
        
        const tabsToClose = state.tabOrder.slice(0, currentIndex);
        const dirtyTabs = tabsToClose.filter(id => state.tabs.get(id)?.isDirty);
        
        if (dirtyTabs.length > 0 && !state.options.autoSave) {
          const shouldClose = confirm(`${dirtyTabs.length} tab(s) have unsaved changes. Close anyway?`);
          if (!shouldClose) return false;
        }
        
        const newTabs = new Map(state.tabs);
        tabsToClose.forEach(id => newTabs.delete(id));
        
        const newTabOrder = state.tabOrder.slice(currentIndex);
        
        let newActiveTabId = state.activeTabId;
        if (tabsToClose.includes(state.activeTabId || '')) {
          newActiveTabId = tabId;
        }
        
        set({
          tabs: newTabs,
          tabOrder: newTabOrder,
          activeTabId: newActiveTabId
        });
        
        return true;
      },

      closeOtherTabs: (tabId) => {
        const state = get();
        
        if (!(state.tabs instanceof Map)) {
          return false;
        }
        
        const tab = state.tabs.get(tabId);
        if (!tab) return false;
        
        const tabsToClose = state.tabOrder.filter(id => id !== tabId);
        const dirtyTabs = tabsToClose.filter(id => state.tabs.get(id)?.isDirty);
        
        if (dirtyTabs.length > 0 && !state.options.autoSave) {
          const shouldClose = confirm(`${dirtyTabs.length} tab(s) have unsaved changes. Close anyway?`);
          if (!shouldClose) return false;
        }
        
        const newTabs = new Map();
        newTabs.set(tabId, tab);
        
        set({
          tabs: newTabs,
          tabOrder: [tabId],
          activeTabId: tabId
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
        
        if (!(state.tabs instanceof Map)) {
          return [];
        }
        
        const regex = new RegExp(pattern, 'i');
        
        return Array.from(state.tabs.values()).filter(tab => 
          regex.test(tab.name) || regex.test(tab.path)
        );
      },
      
      getStats: () => {
        const state = get();
        
        if (!(state.tabs instanceof Map)) {
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
      
      updateTab: (tabId, updatedTab) => {
        const { tabs, tabOrder } = get();
        const tab = tabs.get(tabId);
        
        if (!tab) return false;
        
        const newTab = { ...tab, ...updatedTab };
        
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
          if (state.tabs && typeof state.tabs === 'object' && !(state.tabs instanceof Map)) {
            const tabsObject = state.tabs as unknown as Record<string, TabFile>;
            state.tabs = objectToMap(tabsObject);
          }
        }
      }
    }
  )
);
