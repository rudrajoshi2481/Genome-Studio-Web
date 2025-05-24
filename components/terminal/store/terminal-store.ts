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

// Helper function to generate a unique terminal ID
const generateUniqueId = (instances: TerminalInstance[]): string => {
  // Get all existing IDs
  const existingIds = new Set(instances.map(instance => instance.id));
  
  // Find the next available number
  let counter = 1;
  let newId = `tty-${counter.toString().padStart(2, '0')}`;
  
  while (existingIds.has(newId)) {
    counter++;
    newId = `tty-${counter.toString().padStart(2, '0')}`;
  }
  
  return newId;
};

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      // Start with an empty array - we'll initialize on client side
      instances: [],
      activeInstanceId: '',

      addInstance: (instance) => {
        set((state) => {
          // Generate a unique ID if one isn't provided or if it already exists
          const existingIds = new Set(state.instances.map(i => i.id));
          const id = existingIds.has(instance.id) ? 
            generateUniqueId(state.instances) : 
            instance.id;
          
          const newInstance = { 
            ...instance, 
            id,
            name: instance.name === instance.id ? 
              `tty ${id.split('-')[1]}` : 
              instance.name,
            logs: [] 
          };
          
          return {
            instances: [...state.instances, newInstance]
          };
        });
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
