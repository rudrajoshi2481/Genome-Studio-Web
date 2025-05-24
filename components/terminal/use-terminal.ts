'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Dynamic imports to avoid SSR issues
interface ITerminal {
  new(options?: any): any;
}

interface IFitAddon {
  new(): any;
}

interface IWebLinksAddon {
  new(): any;
}

interface IUnicode11Addon {
  new(): any;
}

let Terminal: ITerminal;
let FitAddon: IFitAddon;
let WebLinksAddon: IWebLinksAddon;
let Unicode11Addon: IUnicode11Addon;

if (typeof window !== 'undefined') {
  Terminal = require('xterm').Terminal;
  FitAddon = require('xterm-addon-fit').FitAddon;
  WebLinksAddon = require('xterm-addon-web-links').WebLinksAddon;
  Unicode11Addon = require('xterm-addon-unicode11').Unicode11Addon;
}

import { useThemePreferences } from '@/lib/states/theme-preferences';
import { themes } from '@/lib/themes';
import { config } from '@/lib/config';
import { createAuthenticatedWebSocket } from '@/lib/api-client';

export interface TerminalDimensions {
  cols: number;
  rows: number;
}

export interface UseTerminalReturn {
  isConnected: boolean;
  dimensions: TerminalDimensions;
  fitTerminal: () => void;
  terminal: any;
}

export function useTerminal(containerRef: React.RefObject<HTMLDivElement>): UseTerminalReturn {
  const { theme } = useThemePreferences();
  const themeColors = themes[theme];

  const termRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [dimensions, setDimensions] = useState<TerminalDimensions>({ cols: 80, rows: 24 });

  const maxReconnectAttempts = 5;

  const handleResize = useCallback(() => {
    if (fitAddonRef.current && termRef.current) {
      fitAddonRef.current.fit();
      const { cols, rows } = termRef.current;
      setDimensions({ cols, rows });
      
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(`\x1b[8;${rows};${cols}t`);
      }
    }
  }, []);

  const fitTerminal = useCallback(() => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
      if (termRef.current) {
        const { cols, rows } = termRef.current;
        setDimensions({ cols, rows });
      }
    }
  }, []);

  const connectSocket = useCallback(() => {
    if (isReconnectingRef.current || !termRef.current) {
      return;
    }

    try {
      isReconnectingRef.current = true;
      const { cols, rows } = termRef.current;
      
      const socketUrl = `${config.wsUrl}${config.wsTerminalEndpoint}/ws`;
      const socketOptions = {
        rows: rows.toString(),
        cols: cols.toString()
      };
      
      const socket = createAuthenticatedWebSocket(socketUrl, socketOptions);
      socketRef.current = socket;
      
      setupSocketEventHandlers(socket, termRef.current);
    } catch (error) {
      console.error('[Terminal] Error creating WebSocket connection:', error);
      if (termRef.current) {
        termRef.current.writeln('\r\n\x1b[31mFailed to create WebSocket connection. Please try refreshing the page.\x1b[0m');
      }
      isReconnectingRef.current = false;
    }
  }, []);

  const setupSocketEventHandlers = useCallback((socket: WebSocket, terminal: any) => {
    socket.onopen = () => {
      console.log('[Terminal] WebSocket connected');
      terminal.writeln('\r\n\x1b[32mConnected to terminal server\x1b[0m');
      terminal.focus();
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      isReconnectingRef.current = false;
    };
    
    socket.onmessage = (event) => {
      terminal.write(event.data);
    };
    
    socket.onclose = (event) => {
      console.log(`[Terminal] WebSocket closed: ${event.code}`);
      setIsConnected(false);
      
      if (event.code !== 1000 && event.code !== 1008) {
        const attempts = reconnectAttemptsRef.current;
        if (attempts < maxReconnectAttempts) {
          const delay = Math.min(3000 * Math.pow(1.5, attempts), 30000);
          terminal.writeln(`\r\n\x1b[33mConnection closed. Attempting to reconnect in ${Math.round(delay/1000)}s...\x1b[0m`);
          
          reconnectAttemptsRef.current++;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (termRef.current) {
              connectSocket();
            }
          }, delay);
        } else {
          terminal.writeln('\r\n\x1b[31mFailed to reconnect after multiple attempts. Please refresh the page.\x1b[0m');
        }
      } else {
        terminal.writeln('\r\n\x1b[33mConnection closed by server.\x1b[0m');
      }
      
      isReconnectingRef.current = false;
    };
    
    socket.onerror = (error) => {
      console.error('[Terminal] WebSocket error:', error);
      terminal.writeln('\r\n\x1b[31mConnection error. Please try refreshing the page.\x1b[0m');
      setIsConnected(false);
    };
    
    terminal.onData((data: string) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      } else {
        terminal.write('\r\n\x1b[31mNot connected. Refresh page.\x1b[0m\r\n');
      }
    });
  }, [connectSocket, maxReconnectAttempts]);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') {
      return;
    }

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "JetBrains Mono, Fira Code, Monaco, Consolas, monospace",
      theme: {
        background: themeColors.background || '#1a1b26',
        foreground: themeColors.foreground || '#c0caf5',
        cursor: themeColors.primary || '#f7768e',
        cursorAccent: '#1a1b26',
        selectionBackground: '#33467c',
        selectionForeground: '#c0caf5',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
      allowProposedApi: true,
      scrollback: 10000,
      screenReaderMode: true,
      disableStdin: false,
      cursorStyle: 'block',
      scrollOnUserInput: true,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const unicode11Addon = new Unicode11Addon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = '11';

    term.open(containerRef.current);
    fitAddon.fit();

    const { cols, rows } = term;
    setDimensions({ cols, rows });
    
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const connectionTimeout = setTimeout(() => {
      connectSocket();
      
      const initTimeout = setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send('\n');
        }
      }, 500);

      return () => clearTimeout(initTimeout);
    }, 100);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      clearTimeout(connectionTimeout);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close(1000);
      }
      
      if (termRef.current) {
        termRef.current.dispose();
      }
    };
  }, [containerRef, themeColors, handleResize, connectSocket]);

  return {
    isConnected,
    dimensions,
    fitTerminal,
    terminal: termRef.current
  };
}
