import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TerminalInstance {
  id: string;
  name: string;
  type: 'tty';
  logs: string[];
  cwd?: string;
  lastCommand?: string;
}

interface TerminalState {
  instances: TerminalInstance[];
  activeInstanceId: string;
  addInstance: (instance: Omit<TerminalInstance, 'logs'>) => void;
  removeInstance: (id: string) => void;
  setActiveInstance: (id: string) => void;
  appendLog: (id: string, log: string) => void;
  updateInstance: (id: string, updates: Partial<TerminalInstance>) => void;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      instances: [{
        id: 'tty-01',
        name: 'tty 01',
        type: 'tty',
        logs: []
      }],
      activeInstanceId: 'tty-01',

      addInstance: (instance) => {
        set((state) => ({
          instances: [...state.instances, { ...instance, logs: [] }]
        }));
      },

      removeInstance: (id) => {
        set((state) => {
          const newInstances = state.instances.filter((i) => i.id !== id);
          const newActiveId = state.activeInstanceId === id && newInstances.length > 0
            ? newInstances[0].id
            : state.activeInstanceId;
          
          return {
            instances: newInstances,
            activeInstanceId: newActiveId
          };
        });
      },

      setActiveInstance: (id) => {
        set({ activeInstanceId: id });
      },

      appendLog: (id, log) => {
        set((state) => ({
          instances: state.instances.map((instance) =>
            instance.id === id
              ? { ...instance, logs: [...instance.logs, log] }
              : instance
          )
        }));
      },

      updateInstance: (id, updates) => {
        set((state) => ({
          instances: state.instances.map((instance) =>
            instance.id === id
              ? { ...instance, ...updates }
              : instance
          )
        }));
      }
    }),
    {
      name: 'terminal-storage',
      version: 1
    }
  )
);
