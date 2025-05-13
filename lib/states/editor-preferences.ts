import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditorPreferences {
  fontSize: number;
  lineHeight: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  autoSave: boolean;
}

interface EditorPreferencesState {
  preferences: EditorPreferences;
  updatePreferences: (preferences: Partial<EditorPreferences>) => void;
}

export const useEditorPreferences = create<EditorPreferencesState>()(
  persist(
    (set) => ({
      preferences: {
        fontSize: 14,
        lineHeight: 1.6,
        showLineNumbers: true,
        wordWrap: true,
        autoSave: true,
      },
      updatePreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),
    }),
    {
      name: 'editor-preferences',
    }
  )
);
