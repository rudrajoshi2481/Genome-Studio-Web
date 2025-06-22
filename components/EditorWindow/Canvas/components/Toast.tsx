"use client"

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

// Toast types
export type ToastType = 'success' | 'error' | 'loading';

// Toast interface
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Toast context interface
interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

// Create toast context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast provider component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add toast
  const addToast = useCallback((message: string, type: ToastType, duration = 5000) => {
    const id = `toast-${Date.now()}`;
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast after duration (except for loading toasts)
    if (type !== 'loading' && duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  }, []);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast container component
const ToastContainer: React.FC = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  const { toasts, removeToast } = context;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-md shadow-md text-sm font-medium animate-slide-in-right ${
            toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            toast.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
          style={{ minWidth: '300px', maxWidth: '450px' }}
        >
          {toast.type === 'success' && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          {toast.type === 'loading' && (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

// Custom hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return {
    toast: context.addToast,
    dismiss: context.removeToast,
    toasts: context.toasts
  };
};
