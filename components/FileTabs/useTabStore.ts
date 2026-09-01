import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface TabFile {
  id: string;
  name: string;
  path: string;
  content?: string;
  isDirty?: boolean;
  isModified?: boolean;
  isExecuting?: boolean;
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
  /** Rebuild the in-memory Map after external serialization (e.g. from localStorage) */
  normalizeTabs: () => void;
}

const generateTabId = (filePath: string): string => {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
};

const getFileExtension = (filePath: string): string => {
  const base = filePath.split('/').pop() || '';
  const parts = base.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

const ensureMap = (tabs: Map<string, TabFile> | Record<string, TabFile> | unknown): Map<string, TabFile> => {
  if (tabs instanceof Map) return new Map(tabs);
  if (tabs && typeof tabs === 'object') {
    const map = new Map<string, TabFile>();
    Object.entries(tabs as Record<string, TabFile>).forEach(([key, value]) => {
      if (value) map.set(key, value);
    });
    return map;
  }
  return new Map();
};

const serializeTabs = (tabs: Map<string, TabFile>): Record<string, TabFile> => {
  const obj: Record<string, TabFile> = {};
  tabs.forEach((value, key) => {
    obj[key] = { ...value, isExecuting: false };
  });
  return obj;
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

      normalizeTabs: () => {
        const state = get();
        const normalized = ensureMap(state.tabs);
        const validOrder = state.tabOrder.filter(id => normalized.has(id));
        const validActive = validOrder.includes(state.activeTabId || '') ? state.activeTabId : validOrder[validOrder.length - 1] || null;
        set({ tabs: normalized, tabOrder: validOrder, activeTabId: validActive });
      },

      addTab: (filePath, fileName, content) => {
        const state = get();
        const tabs = ensureMap(state.tabs);

        // If Map was corrupted, normalize and bail once
        if (state.tabs !== tabs) {
          set({ tabs });
        }

        // Check for duplicates if not allowed
        if (!state.options.allowDuplicates) {
          for (const [, tab] of tabs) {
            if (tab.path === filePath) {
              get().activateTab(tab.id);
              return tab.id;
            }
          }
        }

        // Check max tabs limit
        if (state.options.maxTabs && tabs.size >= state.options.maxTabs) {
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
          isExecuting: false,
          extension: getFileExtension(filePath)
        };

        const newTabs = new Map(tabs);
        newTabs.set(tabId, newTab);

        const newTabOrder = [...state.tabOrder, tabId];

        set({
          tabs: newTabs,
          tabOrder: newTabOrder,
          activeTabId: tabId
        });

        return tabId;
      },

      removeTab: (tabId) => {
        const state = get();
        const tabs = ensureMap(state.tabs);
        const tab = tabs.get(tabId);
        if (!tab) return false;

        // If tab has unsaved changes and no auto-save, return false to trigger dialog
        if (tab.isDirty && !state.options.autoSave) {
          return false;
        }

        return get().forceRemoveTab(tabId);
      },

      forceRemoveTab: (tabId) => {
        const state = get();
        const tabs = ensureMap(state.tabs);
        const tab = tabs.get(tabId);
        if (!tab) return false;

        const newTabs = new Map(tabs);
        newTabs.delete(tabId);

        const newTabOrder = state.tabOrder.filter(id => id !== tabId);

        // Handle active tab removal: prefer the tab that took this index (right),
        // otherwise the last tab (left), matching browser behavior.
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === tabId) {
          if (newTabOrder.length > 0) {
            const currentIndex = state.tabOrder.indexOf(tabId);
            newActiveTabId = newTabOrder[Math.min(currentIndex, newTabOrder.length - 1)];
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
        return get().removeTab(tabId);
      },

      activateTab: (tabId) => {
        const state = get();
        const tabs = ensureMap(state.tabs);
        if (!tabs.has(tabId)) return false;

        set({ tabs, activeTabId: tabId });
        return true;
      },

      getActiveTab: () => {
        const state = get();
        if (!state.activeTabId) return null;
        return ensureMap(state.tabs).get(state.activeTabId) || null;
      },

      getTab: (tabId) => {
        const state = get();
        return ensureMap(state.tabs).get(tabId) || null;
      },

      getAllTabs: () => {
        const state = get();
        const tabs = ensureMap(state.tabs);
        return state.tabOrder.map(id => tabs.get(id)).filter((t): t is TabFile => !!t);
      },

      updateTabContent: (tabId, content) => {
        const state = get();
        const tabs = ensureMap(state.tabs);
        const tab = tabs.get(tabId);
        if (!tab) return false;

        const wasModified = tab.content !== content;

        const newTab = {
          ...tab,
          content,
          isModified: wasModified,
          isDirty: wasModified
        };

        const newTabs = new Map(tabs);
        newTabs.set(tabId, newTab);

        set({ tabs: newTabs });
        return true;
      },

      setTabDirty: (tabId, isDirty = true) => {
        const state = get();
        const tabs = ensureMap(state.tabs);
        const tab = tabs.get(tabId);
        if (!tab) return false;

        const newTabs = new Map(tabs);
        newTabs.set(tabId, { ...tab, isDirty });

        set({ tabs: newTabs });
        return true;
      },

      saveTab: (tabId) => {
        const state = get();
        const tabs = ensureMap(state.tabs);
        const tab = tabs.get(tabId);
        if (!tab) return false;

        const newTabs = new Map(tabs);
        newTabs.set(tabId, { ...tab, isDirty: false, isModified: false });

        set({ tabs: newTabs });
        return true;
      },

      closeAllTabs: () => {
        const state = get();
        const tabs = ensureMap(state.tabs);

        const dirtyTabs = Array.from(tabs.values()).filter(tab => tab.isDirty);
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
        const tabs = ensureMap(state.tabs);

        const currentIndex = state.tabOrder.indexOf(tabId);
        if (currentIndex === -1) return false;

        const tabsToClose = state.tabOrder.slice(currentIndex + 1);
        const dirtyTabs = tabsToClose.filter(id => tabs.get(id)?.isDirty);

        if (dirtyTabs.length > 0 && !state.options.autoSave) {
          const shouldClose = confirm(`${dirtyTabs.length} tab(s) have unsaved changes. Close anyway?`);
          if (!shouldClose) return false;
        }

        const newTabs = new Map(tabs);
        tabsToClose.forEach(id => newTabs.delete(id));

        const newTabOrder = state.tabOrder.slice(0, currentIndex + 1);

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

      closeTabsToLeft: (tabId) => {
        const state = get();
        const tabs = ensureMap(state.tabs);

        const currentIndex = state.tabOrder.indexOf(tabId);
        if (currentIndex === -1) return false;

        const tabsToClose = state.tabOrder.slice(0, currentIndex);
        const dirtyTabs = tabsToClose.filter(id => tabs.get(id)?.isDirty);

        if (dirtyTabs.length > 0 && !state.options.autoSave) {
          const shouldClose = confirm(`${dirtyTabs.length} tab(s) have unsaved changes. Close anyway?`);
          if (!shouldClose) return false;
        }

        const newTabs = new Map(tabs);
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
        const tabs = ensureMap(state.tabs);
        const tab = tabs.get(tabId);
        if (!tab) return false;

        const tabsToClose = state.tabOrder.filter(id => id !== tabId);
        const dirtyTabs = tabsToClose.filter(id => tabs.get(id)?.isDirty);

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
        const tabOrder = [...state.tabOrder];
        const currentIndex = tabOrder.indexOf(tabId);

        if (currentIndex === -1 || newIndex < 0 || newIndex >= tabOrder.length) {
          return false;
        }

        tabOrder.splice(currentIndex, 1);
        tabOrder.splice(newIndex, 0, tabId);

        set({ tabOrder });
        return true;
      },

      findTabs: (pattern) => {
        const state = get();
        const tabs = ensureMap(state.tabs);
        const regex = new RegExp(pattern, 'i');

        return Array.from(tabs.values()).filter(tab =>
          regex.test(tab.name) || regex.test(tab.path)
        );
      },

      getStats: () => {
        const state = get();
        const tabs = ensureMap(state.tabs);

        return {
          totalTabs: tabs.size,
          dirtyTabs: Array.from(tabs.values()).filter(tab => tab.isDirty).length,
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
        const state = get();
        const tabs = ensureMap(state.tabs);
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
      name: 'tab-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: serializeTabs(ensureMap(state.tabs)),
        activeTabId: state.activeTabId,
        tabOrder: state.tabOrder,
        options: state.options
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Convert serialized object back to Map and sanitize execution state
        state.tabs = ensureMap(state.tabs);
        state.tabOrder = (state.tabOrder || []).filter(id => (state.tabs as Map<string, TabFile>).has(id));
        if (!state.tabOrder.includes(state.activeTabId || '')) {
          state.activeTabId = state.tabOrder[state.tabOrder.length - 1] || null;
        }
        state.tabs.forEach((tab) => {
          tab.isExecuting = false;
        });
      }
    }
  )
);
