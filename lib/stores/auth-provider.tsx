'use client';

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuthStore } from './auth-store';

// Create context for auth state
const AuthContext = createContext<ReturnType<typeof useAuthStore> | null>(null);

// Provider component
export function AuthStoreProvider({ children }: { children: ReactNode }) {
  // Get auth state from Zustand store
  const authState = useAuthStore();
  
  // Check authentication status on mount
  useEffect(() => {
    authState.checkAuth();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthStoreProvider');
  }
  return context;
}

const authProvider = { AuthStoreProvider, useAuth };

export default authProvider;
