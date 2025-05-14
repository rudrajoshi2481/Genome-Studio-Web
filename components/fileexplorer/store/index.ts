import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { State, Actions } from './types';
import { createActions } from './actions';

export const useFileExplorerStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      fileTree: null,
      expandedNodes: new Set<string>(),
      isLoading: false,
      error: null,
      wsStatus: 'disconnected',
      wsError: null,
      ...createActions(set, get)
    }),
    {
      name: 'file-explorer-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        expandedNodes: Array.from(state.expandedNodes)
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert the rehydrated array back to a Set
          state.expandedNodes = new Set(state.expandedNodes);
          // Fetch initial data
          state.fetchFileTree('/app', 2);
        }
      }
    }
  )
);
