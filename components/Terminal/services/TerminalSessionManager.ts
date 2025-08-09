/**
 * Terminal Session Manager - Preserves terminal sessions across component lifecycle
 * This manager maintains persistent terminal instances and WebSocket connections
 * to prevent history loss during component remounts and resizes.
 */

interface XTerminal {
  dispose(): void;
  open(element: HTMLElement): void;
  write(data: string): void;
  writeln(data: string): void;
  clear(): void;
  onData(callback: (data: string) => void): void;
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
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#ffffff',
          foreground: '#333333',
          cursor: '#000000'
        },
        rows: 24,
        cols: 80,
        allowTransparency: true,
        allowProposedApi: true
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
        dataHandler: null
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
   * Resize terminal session
   */
  resizeTerminal(tabId: string, rows: number, cols: number): void {
    const session = this.sessions.get(tabId);
    if (!session) return;

    // Only resize if dimensions actually changed
    if (session.lastDimensions.rows !== rows || session.lastDimensions.cols !== cols) {
      session.terminal.resize(cols, rows);
      session.lastDimensions = { rows, cols };

      // Send resize to WebSocket if connected
      if (session.websocket?.readyState === WebSocket.OPEN) {
        const resizeMessage = `\x1b[8;${rows};${cols}t`;
        session.websocket.send(resizeMessage);
      }
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
  async connectWebSocket(tabId: string, token: string, host: string, port: string): Promise<boolean> {
    const session = this.sessions.get(tabId);
    if (!session) return false;

    // Close existing connection and clean up handlers
    if (session.websocket) {
      session.websocket.close();
      session.websocket = null;
      session.isConnected = false;
    }

    // Remove existing data handler to prevent duplicates
    if (session.dataHandler) {
      // Note: XTerm doesn't provide a way to remove specific handlers,
      // so we need to track and avoid adding multiple handlers
      session.dataHandler = null;
    }

    try {
      const { rows, cols } = session.lastDimensions;
      const wsUrl = `ws://${host}:${port}/api/v1/direct-terminal/ws?token=${encodeURIComponent(token)}&rows=${rows}&cols=${cols}`;
      
      const ws = new WebSocket(wsUrl);
      
      return new Promise((resolve) => {
        ws.onopen = () => {
          console.log(`Terminal WebSocket connected for tab ${tabId}`);
          session.websocket = ws;
          session.isConnected = true;
          
          // Clear terminal and show connection message
          session.terminal.clear();
          session.terminal.writeln('\x1b[32mTerminal connected successfully!\x1b[0m\r\n');
          
          resolve(true);
        };

        ws.onmessage = (event) => {
          if (session.terminal && session.isAttached) {
            session.terminal.write(event.data);
          }
        };

        ws.onclose = (event) => {
          console.log(`Terminal WebSocket disconnected for tab ${tabId}, code: ${event.code}`);
          session.websocket = null;
          session.isConnected = false;
          
          // Show disconnection message only for abnormal closures
          if (event.code !== 1000 && session.terminal && session.isAttached) {
            session.terminal.writeln('\r\n\x1b[33mConnection lost. Please refresh to reconnect.\x1b[0m\r\n');
          }
        };

        ws.onerror = (error) => {
          console.error(`Terminal WebSocket error for tab ${tabId}:`, error);
          session.websocket = null;
          session.isConnected = false;
          resolve(false);
        };

        // Handle terminal input - only add handler if we don't have one
        if (!session.dataHandler) {
          const dataHandler = (data: string) => {
            if (session.websocket?.readyState === WebSocket.OPEN) {
              session.websocket.send(data);
            }
          };
          
          session.dataHandler = dataHandler;
          session.terminal.onData(dataHandler);
        }

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
}

export default TerminalSessionManager;
