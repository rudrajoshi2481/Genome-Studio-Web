"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTerminalStore } from './store/terminal-store'
import 'xterm/css/xterm.css'

// Define proper types
interface XTerminal {
  dispose(): void;
  open(element: HTMLElement): void;
  write(data: string): void;
  writeln(data: string): void;
  onData(callback: (data: string) => void): void;
  loadAddon(addon: any): void;
  cols: number;
  rows: number;
}

interface FitAddon {
  fit(): void;
}

interface ConnectionState {
  isConnecting: boolean;
  attemptCount: number;
  maxAttempts: number;
  retryDelay: number;
  retryTimeout: NodeJS.Timeout | null;
}

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
  const [terminal, setTerminal] = useState<XTerminal | null>(null)
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuthStore()
  const { updateTabCwd } = useTerminalStore()
  
  // Track container dimensions dynamically
  const containerDimensions = useDimensions(terminalRef);
  
  // Use ref to avoid dependency issues
  const socketRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const connectionRef = useRef<ConnectionState>({
    isConnecting: false,
    attemptCount: 0,
    maxAttempts: 5,
    retryDelay: 2000,
    retryTimeout: null
  })

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

  // Effect to handle dynamic dimension changes
  useEffect(() => {
    if (!terminal || !containerDimensions.width || !containerDimensions.height) return;

    const newDimensions = calculateTerminalDimensions(
      containerDimensions.width, 
      containerDimensions.height
    );

    console.log(`Container dimensions: ${containerDimensions.width}x${containerDimensions.height}`);
    console.log(`Calculated terminal dimensions: ${newDimensions.rows} rows × ${newDimensions.cols} columns`);

    // Check if dimensions changed significantly to avoid unnecessary updates
    const currentCols = terminal.cols;
    const currentRows = terminal.rows;
    
    if (Math.abs(currentCols - newDimensions.cols) > 1 || 
        Math.abs(currentRows - newDimensions.rows) > 1) {
      
      console.log(`Resizing terminal from ${currentRows}x${currentCols} to ${newDimensions.rows}x${newDimensions.cols}`);
      
      // Use fit addon to resize terminal
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        
        // Get actual dimensions after fitting
        const actualDimensions = { cols: terminal.cols, rows: terminal.rows };
        
        // Send resize message to WebSocket if connected
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          const resizeMessage = `\x1b[8;${actualDimensions.rows};${actualDimensions.cols}t`;
          socketRef.current.send(resizeMessage);
        }
      }
    }
  }, [containerDimensions, terminal, calculateTerminalDimensions]);

  // Initialize terminal - fixed cleanup issue
  useEffect(() => {
    if (!terminalRef.current) return

    let terminal: XTerminal | null = null
    let fitAddon: FitAddon | null = null
    let isCleanedUp = false

    const loadXTerm = async () => {
      if (isCleanedUp) return

      try {
        const [
          xtermModule,
          fitAddonModule,
          webLinksAddonModule,
          unicode11AddonModule
        ] = await Promise.all([
          import('xterm'),
          import('xterm-addon-fit'),
          import('xterm-addon-web-links'),
          import('xterm-addon-unicode11')
        ])

        if (isCleanedUp) return

        const { Terminal } = xtermModule
        const { FitAddon } = fitAddonModule
        const { WebLinksAddon } = webLinksAddonModule
        const { Unicode11Addon } = unicode11AddonModule

        // Calculate initial dimensions based on current container size
        const initialDimensions = containerDimensions.width && containerDimensions.height 
          ? calculateTerminalDimensions(containerDimensions.width, containerDimensions.height)
          : { rows: 24, cols: 80 }; // fallback
        
        console.log(`Initial terminal dimensions: ${initialDimensions.rows} rows × ${initialDimensions.cols} columns`);
        
        terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: '#ffffff',
            foreground: '#333333',
            cursor: '#000000'
          },
          rows: initialDimensions.rows,
          cols: initialDimensions.cols,
          allowTransparency: true,
          allowProposedApi: true
        }) as XTerminal

        fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)
        terminal.loadAddon(new WebLinksAddon())
        terminal.loadAddon(new Unicode11Addon())

        // Store fitAddon reference for dynamic resizing
        fitAddonRef.current = fitAddon;

        if (terminalRef.current && !isCleanedUp) {
          terminal.open(terminalRef.current)
          
          // Fit terminal to container immediately
          fitAddon.fit()
          
          // Also fit after a short delay to ensure proper sizing after DOM is fully rendered
          setTimeout(() => {
            if (!isCleanedUp && fitAddon) {
              fitAddon.fit()
              
              // Log the initial dimensions
              if (terminal) {
                console.log(`Initial terminal size after fit: ${terminal.rows} rows × ${terminal.cols} columns`)
              }
            }
          }, 100)
          
          setTerminal(terminal)
        }

        // Handle window resize as backup (though ResizeObserver should handle most cases)
        const handleWindowResize = () => {
          if (fitAddon && terminal && !isCleanedUp && terminalRef.current) {
            setTimeout(() => {
              if (!isCleanedUp && fitAddon && terminal) {
                fitAddon.fit()
                
                // Send the new dimensions to the server
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                  const actualDimensions = { cols: terminal.cols, rows: terminal.rows }
                  const resizeMessage = `\x1b[8;${actualDimensions.rows};${actualDimensions.cols}t`
                  socketRef.current.send(resizeMessage)
                }
              }
            }, 50);
          }
        }

        window.addEventListener('resize', handleWindowResize)
        
        return () => {
          window.removeEventListener('resize', handleWindowResize)
        }
      } catch (err) {
        if (!isCleanedUp) {
          console.error('Failed to load terminal modules:', err)
          setError('Failed to load terminal: ' + String(err))
        }
      }
    }

    loadXTerm()

    return () => {
      isCleanedUp = true
      if (terminal) {
        terminal.dispose()
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
      fitAddonRef.current = null;
    }
  }, [calculateTerminalDimensions, containerDimensions])

  // Check server health
  const checkServerHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8000/health')
      if (response.ok) {
        return true
      } else {
        return false
      }
    } catch (err) {
      setError(`Backend server may not be running: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }, [])

  // WebSocket connection function
  const connectWebSocket = useCallback(async () => {
    if (!terminal || !token || connectionRef.current.isConnecting) {
      return
    }

    connectionRef.current.isConnecting = true
    connectionRef.current.attemptCount = 0

    // Close existing connection
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
    }

    setError(null)
    
    const attemptConnection = async () => {
      const isServerRunning = await checkServerHealth()
      
      if (!isServerRunning && connectionRef.current.attemptCount > 0) {
        connectionRef.current.attemptCount++
        if (connectionRef.current.attemptCount < connectionRef.current.maxAttempts) {
          connectionRef.current.retryTimeout = setTimeout(attemptConnection, connectionRef.current.retryDelay)
        } else {
          setError(`Failed to connect after ${connectionRef.current.maxAttempts} attempts. Please check that the backend server is running.`)
          connectionRef.current.isConnecting = false
        }
        return
      }

      // Calculate optimal dimensions based on current container size
      let dimensions;
      if (containerDimensions.width && containerDimensions.height) {
        dimensions = calculateTerminalDimensions(containerDimensions.width, containerDimensions.height);
        console.log(`Using calculated dimensions for WebSocket: ${dimensions.rows} rows × ${dimensions.cols} columns`);
      } else {
        // Fallback to terminal dimensions or defaults
        dimensions = { 
          cols: Math.max(terminal.cols || 80, 40), 
          rows: Math.max(terminal.rows || 24, 10)
        };
        console.log(`Using fallback dimensions for WebSocket: ${dimensions.rows} rows × ${dimensions.cols} columns`);
      }

      const wsUrl = `ws://localhost:8000/api/v1/direct-terminal/ws?token=${token}&rows=${dimensions.rows}&cols=${dimensions.cols}&tabId=${tabId}`

      try {
        const ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          console.log('Terminal WebSocket connection established')
          setConnected(true)
          setError(null)
          connectionRef.current.attemptCount = 0
          connectionRef.current.isConnecting = false
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'system') {
              terminal.writeln(`\r\n\x1b[33m${data.message}\x1b[0m\r\n`)
            } else if (data.type === 'error') {
              terminal.writeln(`\r\n\x1b[31mError: ${data.message}\x1b[0m\r\n`)
            } else if (data.type === 'cwd') {
              // Update the current working directory in the store
              updateTabCwd(tabId, data.cwd)
            }
          } catch {
            terminal.write(event.data)
          }
        }

        ws.onclose = (event) => {
          console.log(`Terminal WebSocket connection closed: ${event.code} ${event.reason}`)
          setConnected(false)
          socketRef.current = null
          setSocket(null)

          if (event.code === 1000) {
            terminal.writeln('\r\n\x1b[33mConnection closed normally.\x1b[0m\r\n')
            connectionRef.current.isConnecting = false
            return
          }

          // Handle different close codes
          const closeMessages: Record<number, string> = {
            1006: 'Connection closed abnormally. The server might be down or unreachable.',
            1008: 'Connection rejected: Authentication failed. Your token may be invalid.'
          }

          const message = closeMessages[event.code] || `Connection closed with code ${event.code}${event.reason ? ': ' + event.reason : ''}`
          terminal.writeln(`\r\n\x1b[31m${message}\x1b[0m\r\n`)

          // Retry logic
          connectionRef.current.attemptCount++
          if (connectionRef.current.attemptCount < connectionRef.current.maxAttempts) {
            connectionRef.current.retryTimeout = setTimeout(attemptConnection, connectionRef.current.retryDelay)
          } else {
            setError(`Failed to connect after ${connectionRef.current.maxAttempts} attempts. Please check your token and server status.`)
            connectionRef.current.isConnecting = false
          }
        }

        ws.onerror = (event) => {
          
          // setError('Failed to connect to terminal server. Check that the backend server is running at localhost:8000')
        }

        // Handle user input
        terminal.onData((data: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data)
          }
        })

        socketRef.current = ws
        setSocket(ws)
      } catch (err) {
        console.error('Error connecting to terminal WebSocket:', err)
        setError(`Connection error: ${err instanceof Error ? err.message : String(err)}`)
        connectionRef.current.isConnecting = false
      }
    }

    attemptConnection()
  }, [terminal, token, checkServerHealth, calculateTerminalDimensions, containerDimensions])

  // Connect when terminal and token are ready
  useEffect(() => {
    if (terminal && token) {
      connectWebSocket()
    }

    return () => {
      if (connectionRef.current.retryTimeout) {
        clearTimeout(connectionRef.current.retryTimeout)
        connectionRef.current.retryTimeout = null
      }
      connectionRef.current.isConnecting = false
    }
  }, [terminal, token, connectWebSocket])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ width: '100%', height: '100%' }}>
        <div 
          ref={terminalRef} 
          style={{ width: '100%', height: '100%' }}  
          data-testid="terminal"
        />
        {/* Optional: Display current dimensions for debugging */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            right: 0, 
            background: 'rgba(0,0,0,0.8)', 
            color: 'white', 
            padding: '4px', 
            fontSize: '12px',
            zIndex: 1000
          }}>
            {containerDimensions.width}×{containerDimensions.height}
            {terminal && (
              <div>{terminal.rows}r×{terminal.cols}c</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TerminalInstance
