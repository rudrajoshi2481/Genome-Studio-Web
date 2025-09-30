import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as authService from '../services/auth-service';
import { getServerConfig } from '@/config/server';

const config = getServerConfig();

// Define the user type
export interface User {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  avatar?: string;
  bio?: string;
  is_admin?: boolean;
  role?: string;
  created_at?: string;
  updated_at?: string;
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
      isAuthenticated: false,
      user: null,
      token: null,
      tokenExpiry: null,
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
        // Persist authentication state and user info
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        tokenExpiry: state.tokenExpiry,
        // Don't persist token in localStorage for security
        // The actual token is stored in cookies by the auth service
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 [AUTH-STORE] Rehydration started');
        
        // After hydration, verify the token is still valid
        if (state && isBrowser) {
          console.log('🔄 [AUTH-STORE] State exists, checking authentication');
          console.log('🔄 [AUTH-STORE] Current state:', {
            isAuthenticated: state.isAuthenticated,
            hasUser: !!state.user,
            username: state.user?.username
          });
          
          const isValid = authService.isAuthenticated();
          const token = authService.getToken();
          
          console.log('🔄 [AUTH-STORE] Token validation:', {
            isValid,
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
          });
          
          if (!isValid && state.isAuthenticated) {
            console.warn('⚠️ [AUTH-STORE] Token expired, clearing auth state');
            // Token expired, clear auth state
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            state.tokenExpiry = null;
          } else if (isValid && token) {
            console.log('✅ [AUTH-STORE] Token is valid');
            // Token exists and is valid
            state.isAuthenticated = true;
            state.token = token;
            
            // Fetch user data if not already present
            if (!state.user) {
              console.log('🔄 [AUTH-STORE] No user data, fetching from API...');
              authService.getCurrentUser().then(user => {
                if (user) {
                  console.log('✅ [AUTH-STORE] User data fetched successfully:', {
                    id: user.id,
                    username: user.username,
                    is_admin: user.is_admin
                  });
                  useAuthStore.setState({ 
                    user,
                    isAuthenticated: true,
                    token,
                    isLoading: false
                  });
                } else {
                  console.error('❌ [AUTH-STORE] User data fetch returned null');
                }
              }).catch((error) => {
                console.error('❌ [AUTH-STORE] Error fetching user data:', error);
                // If fetching user fails, clear auth state
                useAuthStore.setState({
                  isAuthenticated: false,
                  user: null,
                  token: null,
                  tokenExpiry: null
                });
              });
            } else {
              console.log('✅ [AUTH-STORE] User data already present:', {
                username: state.user.username,
                is_admin: state.user.is_admin
              });
            }
          } else {
            console.log('ℹ️ [AUTH-STORE] No valid token found');
          }
        } else {
          console.log('ℹ️ [AUTH-STORE] No state or not in browser');
        }
      },
    }
  )
);

// Export a hook to get the auth token
export function useAuthToken(): string | null {
  return authService.getToken();
}

export default useAuthStore;
