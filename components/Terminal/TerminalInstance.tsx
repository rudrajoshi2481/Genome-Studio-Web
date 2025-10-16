"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTerminalStore } from './store/terminal-store'
import TerminalSessionManager from './services/TerminalSessionManager';
// import CompactSystemStats from './SystemStats/CompactSystemStats';
import 'xterm/css/xterm.css'
import { host, port } from '@/config/server';

interface TerminalInstanceProps {
  tabId: string;
}

// Custom hook for dynamic dimension tracking
const useDimensions = (ref: React.RefObject<HTMLDivElement | null>) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const updateDimensions = () => {
      if (ref.current) {
        const { clientWidth, clientHeight } = ref.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    // Use ResizeObserver for better performance than window resize events
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(ref.current);
    
    // Initial measurement
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return dimensions;
};

function TerminalInstance({ tabId }: TerminalInstanceProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const { token } = useAuthStore()
  const { tabs } = useTerminalStore()
  
  // Get current tab info
  const currentTab = tabs.find(tab => tab.id === tabId)
  const terminalType = currentTab?.type || 'tmux'
  
  // Track container dimensions dynamically
  const containerDimensions = useDimensions(terminalRef);
  
  // Get session manager instance
  const sessionManager = TerminalSessionManager.getInstance()

  // Function to calculate terminal dimensions based on container size
  const calculateTerminalDimensions = useCallback((width: number, height: number) => {
    // Character size approximation (in pixels)
    const CHAR_WIDTH = 9;  // Average width of a character in pixels
    const CHAR_HEIGHT = 17; // Average height of a character in pixels
    const PADDING = 20; // Account for any padding/margins
    
    // Get available dimensions accounting for padding
    const availableWidth = Math.max(width - PADDING, 0);
    const availableHeight = Math.max(height - PADDING, 0);
    
    // Calculate how many rows and columns can fit
    const cols = Math.floor(availableWidth / CHAR_WIDTH);
    const rows = Math.floor(availableHeight / CHAR_HEIGHT);
    
    return {
      cols: Math.max(cols, 40),  // Ensure minimum width
      rows: Math.max(rows, 10)   // Ensure minimum height
    };
  }, []);

  // Initialize terminal session
  useEffect(() => {
    if (!terminalRef.current) return;

    let isMounted = true; // Prevent state updates if component unmounts

    const initializeSession = async () => {
      if (!isMounted) return;
      
      setIsInitializing(true);
      setError(null);

      try {
        // Get or create session
        const session = await sessionManager.getSession(tabId);
        if (!session || !isMounted) {
          if (isMounted) {
            setError('Failed to create terminal session');
            setIsInitializing(false);
          }
          return;
        }

        // Attach terminal to DOM
        sessionManager.attachTerminal(tabId, terminalRef.current!);
        
        if (!isMounted) return;
        setIsInitializing(false);

        // Connect WebSocket if we have a token and not already connected
        if (token && !session.isConnected) {
          const connected = await sessionManager.connectWebSocket(tabId, token, host, port, terminalType);
          if (isMounted) {
            setConnected(connected);
            if (!connected) {
              setError('Failed to connect to terminal server');
            }
          }
        } else if (session.isConnected) {
          // Already connected, just update state
          if (isMounted) {
            setConnected(true);
          }
        }

      } catch (error) {
        console.error('Failed to initialize terminal session:', error);
        if (isMounted) {
          setError('Failed to initialize terminal: ' + String(error));
          setIsInitializing(false);
        }
      }
    };

    initializeSession();

    // Cleanup: detach terminal but keep session alive
    return () => {
      isMounted = false;
      sessionManager.detachTerminal(tabId);
    };
  }, [tabId, token, sessionManager]);

  // Effect to handle dynamic dimension changes
  useEffect(() => {
    if (!containerDimensions.width || !containerDimensions.height || isInitializing) return;

    const newDimensions = calculateTerminalDimensions(
      containerDimensions.width, 
      containerDimensions.height
    );

    console.log(`Container dimensions: ${containerDimensions.width}x${containerDimensions.height}`);
    console.log(`Calculated terminal dimensions: ${newDimensions.rows} rows × ${newDimensions.cols} columns`);

    // Resize terminal using session manager
    sessionManager.resizeTerminal(tabId, newDimensions.rows, newDimensions.cols);
    
  }, [containerDimensions, calculateTerminalDimensions, tabId, sessionManager, isInitializing]);

  // Handle window resize as backup for session manager
  useEffect(() => {
    const handleWindowResize = () => {
      if (!isInitializing && sessionManager.hasSession(tabId)) {
        // Use session manager to fit terminal
        sessionManager.fitTerminal(tabId);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [tabId, sessionManager, isInitializing]);



  // Get connection status from session manager
  useEffect(() => {
    const updateConnectionStatus = async () => {
      const session = await sessionManager.getSession(tabId);
      if (session) {
        setConnected(session.isConnected);
        // Error handling is managed by the session manager internally
      }
    };

    // Update status immediately
    updateConnectionStatus();

    // Set up periodic status updates
    const interval = setInterval(updateConnectionStatus, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [tabId, sessionManager]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} className="w-full h-full">
        <div 
          ref={terminalRef} 
          style={{ 
            width: '100%', 
            height: '100%',
            userSelect: 'text',
            cursor: 'text'
          }}  
          data-testid="terminal"
        />
        {/* Show loading state */}
        {isInitializing && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#666',
            fontSize: '14px'
          }}>
            Initializing terminal...
          </div>
        )}
        {/* Show error state */}
        {error && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(255, 0, 0, 0.1)',
            color: '#ff0000',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            maxWidth: '300px'
          }}>
            {error}
          </div>
        )}
        {/* Connection status indicator */}
        {!isInitializing && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: connected ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 0, 0.1)',
            color: connected ? '#00aa00' : '#aa6600',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        )}
        {/* Optional: Display current dimensions for debugging */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            position: 'absolute', 
            bottom: 0, 
            right: 0, 
            background: 'rgba(0,0,0,0.8)', 
            color: 'white', 
            padding: '4px', 
            fontSize: '12px',
            zIndex: 1000
          }}>
            {containerDimensions.width}×{containerDimensions.height}
          </div>
        )}
        
        {/* Compact System Stats - positioned in top left */}
        {/* <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '8px 12px',
          borderRadius: '6px',
          backdropFilter: 'blur(4px)'
        }}> */}
          {/* <CompactSystemStats 
            refreshInterval={3000}
            showIP={true}
          /> */}
        {/* </div> */}
    </div>
  )
}

export default TerminalInstance
