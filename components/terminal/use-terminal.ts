'use client';

import { useEffect, useRef, useState } from 'react';

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
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dimensions, setDimensions] = useState<TerminalDimensions>({ cols: 80, rows: 24 });
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const currentCommandRef = useRef<string>('');
  const fitAddonRef = useRef<any>(null);
  const promptRef = useRef<string>('');

  useEffect(() => {
    // console.log('[Terminal] Initializing terminal...');
    if (!containerRef.current || typeof window === 'undefined') {
      // console.log('[Terminal] No container or not in browser, aborting');
      return;
    }

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "monospace",
      theme: {
        background: themeColors.background,
        foreground: themeColors.foreground,
        cursor: themeColors.primary,
      },
      allowProposedApi: true,
      scrollback: 10000,
      screenReaderMode: true,
      disableStdin: false,
      cursorStyle: 'block',
      scrollOnUserInput: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const unicode11Addon = new Unicode11Addon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = '11';

    // console.log('[Terminal] Opening terminal in container...');
    term.open(containerRef.current);
    fitAddon.fit();

    const { cols, rows } = term;
    // console.log(`[Terminal] Initial dimensions: ${cols}x${rows}`);
    setDimensions({ cols, rows });
    
    termRef.current = term;
    fitAddonRef.current = fitAddon;
    
    // Write initial prompt
    // console.log('[Terminal] Writing initial prompt...');
    // writePrompt(term);

    const socket = new WebSocket(
      `ws://${config.wsUrl}/ws?rows=${rows}&cols=${cols}`
    );
    socketRef.current = socket;

    socket.onopen = () => {
      // console.log('[Terminal] WebSocket connected');
      setIsConnected(true);
      // term.write('\r\n\x1b[32mConnected to server\x1b[0m\r\n');
      
    };

    socket.onmessage = (event: MessageEvent) => {
      const response = event.data.toString();
      // console.log('[Terminal] Received from server:', response);
      term.write(response);
      // if (!response.endsWith('\n')) {
      //   term.write('\r\n');
      // }
      // writePrompt(term);
    };

    socket.onclose = () => {
      setIsConnected(false);
      // term.write('\r\n\x1b[31mConnection closed. Refresh page to reconnect.\x1b[0m\r\n');
    };

    socket.onerror = (error: Event) => {
      // console.error('WebSocket Error:', error);
      // term.write('\r\n\x1b[31mConnection error. Refresh page.\x1b[0m\r\n');
    };

    const handleResize = () => {
      fitAddon.fit();
      const { cols, rows } = term;
      setDimensions({ cols, rows });
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(`\x1b[8;${rows};${cols}t`);
      }
    };

    const handleData = (data: string) => {
      // console.log('[Terminal] User input:', data, 'charCode:', data.charCodeAt(0));
      if (socket.readyState !== WebSocket.OPEN) {
        // console.log('[Terminal] WebSocket not connected');
        // term.write('\r\n\x1b[31mNot connected. Refresh page.\x1b[0m\r\n');
        return;
      }

      const charCode = data.charCodeAt(0);

      // Handle special keys
      switch (true) {
        case charCode === 3: // Ctrl+C
        socket.send('\x03'); // Send Ctrl+C character to server
          // term.write('^C\r\n');
          currentCommandRef.current = '';
          return;

        case charCode === 13: // Enter
          // console.log('[Terminal] Enter pressed, command:', currentCommandRef.current);
          term.write('\r'); // Add newline when user presses enter
          const command = currentCommandRef.current;
          if (command.trim()) {
            commandHistoryRef.current.push(command);
            historyIndexRef.current = commandHistoryRef.current.length;
            // console.log('[Terminal] Added to history, new length:', commandHistoryRef.current.length);
          }
          // console.log('[Terminal] Sending command to server:', command);
          socket.send(command + '\n'); // Send command with newline to server
          currentCommandRef.current = '';
          return;

        case charCode === 127: // Backspace
          // console.log('[Terminal] Backspace pressed, current command:', currentCommandRef.current);
          if (currentCommandRef.current.length > 0) {
            term.write('\b \b');
            currentCommandRef.current = currentCommandRef.current.slice(0, -1);
            // console.log('[Terminal] After backspace:', currentCommandRef.current);
          }
          return;

        case charCode === 27: // Arrow keys (first part of escape sequence)
          // We'd need to handle the full escape sequence for arrow keys
          return;

        default:
          // Printable characters
          if (charCode >= 32 && charCode <= 126) {
            term.write(data);
            currentCommandRef.current += data;
          }
      }
    };

    term.onData(handleData);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (socketRef.current) socketRef.current.close();
      if (termRef.current) termRef.current.dispose();
    };
  }, [containerRef, themeColors]);


  const fitTerminal = () => {
    // console.log('[Terminal] Fitting terminal...');
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  };

  return {
    isConnected,
    dimensions,
    fitTerminal,
    terminal: termRef.current
  };
}