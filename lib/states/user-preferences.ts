import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserProfile {
  email: string;
  name: string;
  bio: string;
}

interface UserPreferencesState {
  profile: UserProfile;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

export const useUserPreferences = create<UserPreferencesState>()(
  persist(
    (set) => ({
      profile: {
        email: 'user@example.com',
        name: 'John Doe',
        bio: '',
      },
      updateProfile: (newProfile) =>
        set((state) => ({
          profile: { ...state.profile, ...newProfile },
        })),
    }),
    {
      name: 'user-preferences',
    }
  )
);
