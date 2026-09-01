/**
 * Terminal Session Manager - Preserves terminal sessions across component lifecycle
 * This manager maintains persistent terminal instances and WebSocket connections
 * to prevent history loss during component remounts and resizes.
 */

interface IDisposable {
  dispose(): void;
}

interface XTerminal {
  dispose(): void;
  open(element: HTMLElement): void;
  write(data: string): void;
  writeln(data: string): void;
  clear(): void;
  onData(callback: (data: string) => void): IDisposable;
  loadAddon(addon: any): void;
  cols: number;
  rows: number;
  resize(cols: number, rows: number): void;
}

interface FitAddon {
  fit(): void;
}

interface TerminalSession {
  terminal: XTerminal;
  fitAddon: FitAddon;
  websocket: WebSocket | null;
  isConnected: boolean;
  lastDimensions: { rows: number; cols: number };
  buffer: string; // Store terminal output for persistence
  isAttached: boolean; // Track if terminal is currently attached to DOM
  dataHandler: ((data: string) => void) | null; // Track data handler for cleanup
  dataHandlerDisposable: IDisposable | null; // Disposable for the onData listener
  reconnectAttempts: number; // Track reconnection attempts
  tmuxUnavailable: boolean; // Track if tmux is not available on the server
  cwd?: string; // Working directory for the terminal session
}

class TerminalSessionManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private static instance: TerminalSessionManager;

  static getInstance(): TerminalSessionManager {
    if (!TerminalSessionManager.instance) {
      TerminalSessionManager.instance = new TerminalSessionManager();
    }
    return TerminalSessionManager.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get or create a terminal session for a given tab ID
   */
  async getSession(tabId: string): Promise<TerminalSession | null> {
    // Return existing session if available
    const existingSession = this.sessions.get(tabId);
    if (existingSession) {
      console.log(`Reusing existing terminal session for tab ${tabId}`);
      return existingSession;
    }

    // Create new session
    console.log(`Creating new terminal session for tab ${tabId}`);
    return this.createSession(tabId);
  }

  /**
   * Create a new terminal session
   */
  private async createSession(tabId: string): Promise<TerminalSession | null> {
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
      ]);

      const { Terminal } = xtermModule;
      const { FitAddon } = fitAddonModule;
      const { WebLinksAddon } = webLinksAddonModule;
      const { Unicode11Addon } = unicode11AddonModule;

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", Menlo, Monaco, "Courier New", monospace',
        fontWeight: '400',
        fontWeightBold: '500',
        letterSpacing: 0.5,
        theme: {
          background: '#ffffff',
          foreground: '#343b58',
          cursor: '#343b58',
          cursorAccent: '#ffffff',
          // Selection colors for better visibility
          selectionBackground: 'rgba(122, 162, 247, 0.25)',
          selectionForeground: '#000000',
          selectionInactiveBackground: 'rgba(122, 162, 247, 0.15)',
          // Tokyo Night-inspired ANSI palette (adapted for white bg)
          black: '#0f0f14',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#9d7cd8',
          cyan: '#7dcfff',
          white: '#a9b1d6',
          brightBlack: '#565f89',
          brightRed: '#ff7a93',
          brightGreen: '#b9f27c',
          brightYellow: '#ffc777',
          brightBlue: '#7da6ff',
          brightMagenta: '#bb9af7',
          brightCyan: '#89ddff',
          brightWhite: '#c0caf5',
        },
        // Don't set fixed rows/cols - let fitAddon calculate based on container
        allowTransparency: true,
        allowProposedApi: true,
        // Enable text selection
        disableStdin: false,
        convertEol: true
      }) as XTerminal;

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());
      terminal.loadAddon(new Unicode11Addon());

      const session: TerminalSession = {
        terminal,
        fitAddon,
        websocket: null,
        isConnected: false,
        lastDimensions: { rows: 24, cols: 80 },
        buffer: '',
        isAttached: false,
        dataHandler: null,
        dataHandlerDisposable: null,
        reconnectAttempts: 0,
        tmuxUnavailable: false,
        cwd: undefined
      };

      // Store terminal output for persistence
      terminal.onData((data) => {
        session.buffer += data;
        // Keep buffer size reasonable (last 10KB)
        if (session.buffer.length > 10000) {
          session.buffer = session.buffer.slice(-10000);
        }
      });

      this.sessions.set(tabId, session);
      return session;

    } catch (error) {
      console.error('Failed to create terminal session:', error);
      return null;
    }
  }

  /**
   * Attach terminal to DOM element
   */
  attachTerminal(tabId: string, element: HTMLElement): TerminalSession | null {
    const session = this.sessions.get(tabId);
    if (!session) return null;

    if (!session.isAttached) {
      session.terminal.open(element);
      session.isAttached = true;
      
      // Fit terminal to container
      setTimeout(() => {
        session.fitAddon.fit();
      }, 100);
    }

    return session;
  }

  /**
   * Detach terminal from DOM (but keep session alive)
   */
  detachTerminal(tabId: string): void {
    const session = this.sessions.get(tabId);
    if (session) {
      session.isAttached = false;
      // Note: We don't dispose the terminal, just mark it as detached
    }
  }

  /**
   * Resize terminal session - uses fitAddon for automatic container-based sizing
   */
  resizeTerminal(tabId: string, rows: number, cols: number): void {
    const session = this.sessions.get(tabId);
    if (!session || !session.isAttached) return;

    // Use fitAddon for automatic sizing based on container
    session.fitAddon.fit();
    
    // Update stored dimensions with actual values after fit
    session.lastDimensions = {
      rows: session.terminal.rows,
      cols: session.terminal.cols
    };

    // Send resize to WebSocket if connected
    if (session.websocket?.readyState === WebSocket.OPEN) {
      const resizeMessage = `\x1b[8;${session.terminal.rows};${session.terminal.cols}t`;
      session.websocket.send(resizeMessage);
    }
  }

  /**
   * Fit terminal to container
   */
  fitTerminal(tabId: string): void {
    const session = this.sessions.get(tabId);
    if (session && session.isAttached) {
      session.fitAddon.fit();
      
      // Update stored dimensions
      session.lastDimensions = {
        rows: session.terminal.rows,
        cols: session.terminal.cols
      };

      // Send resize to WebSocket if connected
      if (session.websocket?.readyState === WebSocket.OPEN) {
        const resizeMessage = `\x1b[8;${session.terminal.rows};${session.terminal.cols}t`;
        session.websocket.send(resizeMessage);
      }
    }
  }

  /**
   * Connect WebSocket for a session
   */
  async connectWebSocket(tabId: string, token: string, host: string, port: string, terminalType: string = 'tmux', isReconnect = false, cwd?: string): Promise<boolean> {
    const session = this.sessions.get(tabId);
    if (!session) return false;

    // Store cwd in session for reconnections
    if (cwd) {
      session.cwd = cwd;
    }

    // Close existing connection and clean up handlers
    if (session.websocket) {
      session.websocket.close();
      session.websocket = null;
      session.isConnected = false;
    }

    // Remove existing data handler to prevent duplicates
    if (session.dataHandlerDisposable) {
      try {
        session.dataHandlerDisposable.dispose();
      } catch (e) {
        console.warn('Failed to dispose terminal data handler:', e);
      }
      session.dataHandlerDisposable = null;
      session.dataHandler = null;
    }

    try {
      // Fit terminal to get current dimensions before connecting
      if (session.isAttached) {
        session.fitAddon.fit();
        session.lastDimensions = {
          rows: session.terminal.rows,
          cols: session.terminal.cols
        };
      }
      
      const { rows: rawRows, cols: rawCols } = session.lastDimensions;
      // Clamp to backend minimums (ge=10 for rows, ge=40 for cols) to avoid 422 rejection
      const rows = Math.max(rawRows, 10);
      const cols = Math.max(rawCols, 40);
      // Use the browser's current hostname for WebSocket, falling back to config host
      const wsHost = typeof window !== 'undefined' ? window.location.hostname : host;
      const cwdParam = cwd ? `&cwd=${encodeURIComponent(cwd)}` : '';
      const wsUrl = `ws://${wsHost}:${port}/api/v1/terminal/ws?token=${encodeURIComponent(token)}&rows=${rows}&cols=${cols}&tab_id=${encodeURIComponent(tabId)}&terminal_type=${encodeURIComponent(terminalType)}${cwdParam}`;
      
      const ws = new WebSocket(wsUrl);
      
      return new Promise((resolve) => {
        ws.onopen = () => {
          session.websocket = ws;
          session.isConnected = true;
          session.reconnectAttempts = 0;
          
          if (isReconnect && session.terminal && session.isAttached) {
            session.terminal.writeln('\r\n\x1b[32mReconnected.\x1b[0m\r\n');
          }
          
          resolve(true);
        };

        ws.onmessage = (event) => {
          if (session.terminal && session.isAttached) {
            session.terminal.write(event.data);
          }
        };

        ws.onclose = (event) => {
          session.websocket = null;
          session.isConnected = false;
          
          // tmux not available on server - don't reconnect, just inform the user
          if (event.code === 4001) {
            session.tmuxUnavailable = true;
            if (session.terminal && session.isAttached) {
              session.terminal.writeln('\r\n\x1b[33mCannot connect to TMUX. TMUX is not installed on the server.\x1b[0m\r\n');
              session.terminal.writeln('\x1b[33mInstall tmux for persistent sessions: sudo apt-get install tmux\x1b[0m\r\n');
            }
            resolve(false);
            return;
          }
          
          // Attempt automatic reconnection for abnormal closures
          if (event.code !== 1000 && session.reconnectAttempts < 3) {
            session.reconnectAttempts++;
            const delay = 2000 * session.reconnectAttempts;
            
            if (session.terminal && session.isAttached) {
              session.terminal.writeln(`\r\n\x1b[33mReconnecting (attempt ${session.reconnectAttempts}/3)...\x1b[0m\r\n`);
            }
            
            setTimeout(() => {
              this.connectWebSocket(tabId, token, host, port, terminalType, true, session.cwd).catch(() => {});
            }, delay);
          } else if (event.code !== 1000 && session.terminal && session.isAttached) {
            session.terminal.writeln('\r\n\x1b[31mConnection lost. Click refresh or restart the terminal to reconnect.\x1b[0m\r\n');
          }
        };

        ws.onerror = () => {
          session.websocket = null;
          session.isConnected = false;
          resolve(false);
        };

        // Handle terminal input - always re-register after disposing the old one
        const dataHandler = (data: string) => {
          if (session.websocket?.readyState === WebSocket.OPEN) {
            session.websocket.send(data);
          }
        };

        session.dataHandler = dataHandler;
        session.dataHandlerDisposable = session.terminal.onData(dataHandler);

        // Timeout for connection
        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            resolve(false);
          }
        }, 5000);
      });

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      return false;
    }
  }

  /**
   * Disconnect WebSocket but keep session
   */
  disconnectWebSocket(tabId: string): void {
    const session = this.sessions.get(tabId);
    if (session && session.websocket) {
      session.websocket.close();
      session.websocket = null;
      session.isConnected = false;
    }
  }

  /**
   * Completely destroy a session (only when tab is closed)
   */
  destroySession(tabId: string): void {
    const session = this.sessions.get(tabId);
    if (session) {
      if (session.websocket) {
        session.websocket.close();
      }
      session.terminal.dispose();
      this.sessions.delete(tabId);
    }
  }

  /**
   * Get session connection status
   */
  isSessionConnected(tabId: string): boolean {
    const session = this.sessions.get(tabId);
    return session?.isConnected || false;
  }

  /**
   * Check if session exists
   */
  hasSession(tabId: string): boolean {
    return this.sessions.has(tabId);
  }

  /**
   * Check if tmux is unavailable for a session
   */
  isTmuxUnavailable(tabId: string): boolean {
    const session = this.sessions.get(tabId);
    return session?.tmuxUnavailable || false;
  }
}

export default TerminalSessionManager;
