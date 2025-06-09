import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as authService from '../services/auth-service';
import { getServerConfig } from '@/config/server';

const config = getServerConfig();

// Define the user type
export interface User {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  role?: string;
  [key: string]: any; // Allow for additional properties
}

// Define the authentication state
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  tokenExpiry: number | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create the auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: isBrowser ? authService.isAuthenticated() : false,
      user: null,
      token: isBrowser ? authService.getToken() : null,
      tokenExpiry: isBrowser && localStorage.getItem(config.auth.tokenExpiryKey) 
        ? parseInt(localStorage.getItem(config.auth.tokenExpiryKey) || '0', 10) 
        : null,
      isLoading: false,
      error: null,
      
      // Login action
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.login(username, password);
          
          if (response.success && response.token) {
            set({ 
              isAuthenticated: true,
              user: response.user || null,
              token: response.token,
              tokenExpiry: Date.now() + ((response.expiresIn || 0) * 1000),
              isLoading: false,
              error: null
            });
            return true;
          } else {
            set({ 
              isAuthenticated: false,
              user: null,
              token: null,
              tokenExpiry: null,
              isLoading: false,
              error: response.message || 'Login failed'
            });
            return false;
          }
        } catch (error) {
          set({ 
            isAuthenticated: false,
            user: null,
            token: null,
            tokenExpiry: null,
            isLoading: false,
            error: (error as Error).message || 'An unexpected error occurred'
          });
          return false;
        }
      },
      
      // Logout action
      logout: () => {
        authService.logout();
        set({ 
          isAuthenticated: false,
          user: null,
          token: null,
          tokenExpiry: null,
          error: null
        });
      },
      
      // Check authentication status
      checkAuth: () => {
        const isValid = authService.isAuthenticated();
        set({ isAuthenticated: isValid });
        
        // If not authenticated, clear user data
        if (!isValid) {
          set({ user: null, token: null, tokenExpiry: null });
        }
        
        return isValid;
      },
      
      // Refresh user data
      refreshUser: async () => {
        if (!get().isAuthenticated) return;
        
        set({ isLoading: true });
        try {
          const userData = await authService.getCurrentUser();
          if (userData) {
            set({ user: userData, isLoading: false });
          } else {
            // If we can't get user data, user might be logged out
            set({ 
              isAuthenticated: false,
              user: null,
              isLoading: false,
              error: 'Failed to refresh user data'
            });
          }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: (error as Error).message || 'Failed to refresh user data'
          });
        }
      },
      
      // Clear error
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        // Don't persist token in localStorage for security
        // The actual token is stored in cookies by the auth service
      }),
    }
  )
);

// Export a hook to get the auth token
export function useAuthToken(): string | null {
  return authService.getToken();
}

export default useAuthStore;
