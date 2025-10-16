import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// Define terminal type
export type TerminalType = 'tmux' | 'simple';

// Define the terminal tab interface
export interface TerminalTab {
  id: string;
  name: string;
  active: boolean;
  cwd?: string; // Current working directory
  createdAt: string;
  type: TerminalType; // Terminal type: tmux (persistent) or simple (non-persistent)
}

// Define the terminal store state
interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  
  // Actions
  createTab: (name?: string, type?: TerminalType) => string; // Returns the new tab ID
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, newName: string) => void;
  updateTabCwd: (tabId: string, cwd: string) => void;
}

// Create the store
export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      
      createTab: (name = 'Terminal', type: TerminalType = 'tmux') => {
        const newTabId = uuidv4();
        const newTab: TerminalTab = {
          id: newTabId,
          name: name,
          active: true,
          cwd: '/home',
          createdAt: new Date().toISOString(),
          type: type,
        };
        
        set((state) => {
          // Deactivate all other tabs
          const updatedTabs = state.tabs.map(tab => ({
            ...tab,
            active: false,
          }));
          
          return {
            tabs: [...updatedTabs, newTab],
            activeTabId: newTabId,
          };
        });
        
        return newTabId;
      },
      
      closeTab: (tabId: string) => {
        const { tabs, activeTabId } = get();
        const isClosingActiveTab = tabId === activeTabId;
        const filteredTabs = tabs.filter(tab => tab.id !== tabId);
        
        // If we're closing the active tab and there are other tabs, make another one active
        let newActiveTabId = activeTabId;
        if (isClosingActiveTab && filteredTabs.length > 0) {
          newActiveTabId = filteredTabs[filteredTabs.length - 1].id;
          filteredTabs[filteredTabs.length - 1].active = true;
        } else if (filteredTabs.length === 0) {
          newActiveTabId = null;
        }
        
        set({
          tabs: filteredTabs,
          activeTabId: newActiveTabId,
        });
      },
      
      setActiveTab: (tabId: string) => {
        set((state) => {
          const updatedTabs = state.tabs.map(tab => ({
            ...tab,
            active: tab.id === tabId,
          }));
          
          return {
            tabs: updatedTabs,
            activeTabId: tabId,
          };
        });
      },
      
      renameTab: (tabId: string, newName: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, name: newName } : tab
          ),
        }));
      },
      
      updateTabCwd: (tabId: string, cwd: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, cwd } : tab
          ),
        }));
      },
    }),
    {
      name: 'terminal-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);