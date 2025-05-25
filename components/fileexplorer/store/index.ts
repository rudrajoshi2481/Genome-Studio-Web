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
      currentPath: '/app',
      navigationHistory: {
        paths: ['/app'],
        currentIndex: 0,
        canGoBack: false,
        canGoForward: false
      },
      recentPaths: ['/app'],
      ...createActions(set, get)
    }),
    {
      name: 'file-explorer-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        expandedNodes: Array.from(state.expandedNodes),
        fileTree: state.fileTree,
        currentPath: state.currentPath,
        navigationHistory: state.navigationHistory,
        recentPaths: state.recentPaths
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert the rehydrated array back to a Set
          state.expandedNodes = new Set(state.expandedNodes);
          
          // Only fetch initial data if fileTree is null
          if (!state.fileTree) {
            state.fetchFileTree('/app', 2);
          }
        }
      }
    }
  )
);
