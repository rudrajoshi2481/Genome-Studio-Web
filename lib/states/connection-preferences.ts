import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '../config';

interface ConnectionPreferences {
  wsUrl: string;
}

interface ConnectionState {
  preferences: ConnectionPreferences;
  updatePreferences: (update: Partial<ConnectionPreferences>) => void;
}

export const useConnectionPreferences = create<ConnectionState>()(
  persist(
    (set) => ({
      preferences: {
        wsUrl: config.wsUrl,
      },
      updatePreferences: (update) =>
        set((state) => ({
          preferences: { ...state.preferences, ...update },
        })),
    }),
    {
      name: 'connection-preferences',
    }
  )
);
