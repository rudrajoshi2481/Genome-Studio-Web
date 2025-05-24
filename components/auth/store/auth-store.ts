import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '@/lib/config';

// Define user interface
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Define auth store state and actions
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Helper function to log state changes
const logStateChange = (message: string, state: any) => {
  console.log(`[Auth] ${message}:`, {
    user: state.user ? { ...state.user } : null,
    token: state.token ? '***TOKEN***' : null,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error
  });
};

// Create auth store with Zustand
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      // Login action
      login: async (email: string, password: string) => {
        try {
          console.log('[Auth] Login attempt:', email);
          logStateChange('State before login attempt', get());
          set({ isLoading: true, error: null });
          logStateChange('State after setting loading', get());
          
          // Log the full URL for debugging
          const url = `${config.apiUrl}${config.loginEndpoint}`;
          console.log('[Auth] Login URL:', url);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ email, password }),
          });
          
          console.log('[Auth] Login response status:', response.status);
          const data = await response.json();
          console.log('[Auth] Login response data:', data);

          if (!response.ok) {
            console.error('[Auth] Login failed:', data.detail);
            set({ isLoading: false, error: data.detail || 'Login failed' });
            logStateChange('State after login failure', get());
            return;
          }

          console.log('[Auth] Login successful');
          
          // Set the auth token in a cookie for middleware
          document.cookie = `auth_token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
          
          const newState = {
            user: data.user,
            token: data.access_token,
            isLoading: false,
            isAuthenticated: true,
          };
          set(newState);
          logStateChange('State after successful login', get());
        } catch (error) {
          console.error('[Auth] Login error:', error);
          set({
            isLoading: false,
            error: 'An error occurred during login. Please try again.',
          });
        }
      },

      // Register action
      register: async (username: string, email: string, password: string) => {
        try {
          console.log('[Auth] Register attempt:', email);
          logStateChange('State before registration attempt', get());
          set({ isLoading: true, error: null });
          logStateChange('State after setting loading', get());
          
          // Log the full URL for debugging
          const url = `${config.apiUrl}${config.registerEndpoint}`;
          console.log('[Auth] Register URL:', url);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ username, email, password }),
          });
          
          console.log('[Auth] Register response status:', response.status);
          const data = await response.json();

          if (!response.ok) {
            console.error('[Auth] Registration failed:', data.detail);
            set({ isLoading: false, error: data.detail || 'Registration failed' });
            logStateChange('State after registration failure', get());
            return;
          }

          console.log('[Auth] Registration successful');
          
          // Set the auth token in a cookie for middleware
          document.cookie = `auth_token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
          
          const newState = {
            user: data.user,
            token: data.access_token,
            isLoading: false,
            isAuthenticated: true,
          };
          set(newState);
          logStateChange('State after successful registration', get());
        } catch (error) {
          console.error('[Auth] Registration error:', error);
          set({
            isLoading: false,
            error: 'An error occurred during registration. Please try again.',
          });
        }
      },

      // Logout action
      logout: async () => {
        try {
          console.log('[Auth] Logout attempt');
          logStateChange('State before logout', get());
          const token = get().token;
          
          // First clear the state immediately to prevent any further authenticated requests
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          logStateChange('State after clearing auth data', get());
          
          // Clear ALL localStorage items related to auth
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Clear ALL cookies with different path variations
          const paths = ['/', '/app', '/dashboard', ''];
          const cookieNames = ['auth_token', 'token', 'refresh_token', 'user'];
          
          cookieNames.forEach(name => {
            paths.forEach(path => {
              document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`;
              document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
            });
          });
          
          console.log('[Auth] Cleared all auth cookies and localStorage');
          
          // Call the backend logout endpoint
          if (token) {
            try {
              const response = await fetch(`${config.apiUrl}${config.logoutEndpoint}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                credentials: 'include' // Include cookies
              });
              
              console.log('[Auth] Logout response:', response.status);
            } catch (e) {
              console.error('[Auth] Backend logout failed:', e);
              // Continue with frontend logout even if backend fails
            }
          }
          
          console.log('[Auth] Logout successful');
          logStateChange('Final state after logout', get());
          
          // Force reload to clear any in-memory state
          setTimeout(() => {
            window.location.href = '/login';
          }, 100); // Small delay to ensure all state is cleared
          
        } catch (error) {
          console.error('[Auth] Logout error:', error);
          // Even if there's an error, clear everything and redirect
          window.location.href = '/login';
        }
      },

      // Clear error action
      clearError: () => {
        logStateChange('State before clearing error', get());
        set({ error: null });
        logStateChange('State after clearing error', get());
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Add storage event listener to handle logout across tabs
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Check if token exists in cookies
          const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
          };
          
          const cookieToken = getCookie('auth_token');
          
          // If no cookie token but we have a state token, clear the state
          if (!cookieToken && state.token) {
            console.log('[Auth] Token in state but not in cookie, clearing state');
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
          }
        }
      }
    }
  )
);
