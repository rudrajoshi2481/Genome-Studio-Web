'use client';

import { useEffect, useRef, useState } from 'react';
// Dynamic imports to avoid SSR issues
let XTerm: typeof import('xterm').Terminal;
let FitAddon: typeof import('xterm-addon-fit').FitAddon;
let WebLinksAddon: typeof import('xterm-addon-web-links').WebLinksAddon;
let Unicode11Addon: typeof import('xterm-addon-unicode11').Unicode11Addon;

if (typeof window !== 'undefined') {
  // Only import on client side
  Promise.all([
    import('xterm'),
    import('xterm-addon-fit'),
    import('xterm-addon-web-links'),
    import('xterm-addon-unicode11')
  ]).then(([xtermModule, fitModule, webLinksModule, unicode11Module]) => {
    XTerm = xtermModule.Terminal;
    FitAddon = fitModule.FitAddon;
    WebLinksAddon = webLinksModule.WebLinksAddon;
    Unicode11Addon = unicode11Module.Unicode11Addon;
  });
}
import { TerminalDimensions } from './types';
import { useThemePreferences } from '@/lib/states/theme-preferences';
import { themes } from '@/lib/themes';
import { config } from '@/lib/config';

export function useTerminal(containerRef: React.RefObject<HTMLDivElement>) {
  const { theme } = useThemePreferences();
  const themeColors = themes[theme];
  const termRef = useRef<InstanceType<typeof XTerm> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dimensions, setDimensions] = useState<TerminalDimensions>({ cols: 80, rows: 24 });
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const currentLineBufferRef = useRef<string>('');
  const fitAddonRef = useRef<InstanceType<typeof FitAddon> | null>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    if (!XTerm) return;

    const term = new XTerm({
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
      rows: 24,
      cols: 80,
      disableStdin: false,
      scrollOnUserInput: true,
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

    const socket = new WebSocket(
      `ws://${config.wsUrl}/ws?rows=${rows}&cols=${cols}`
    );
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      term.write('\x1b[32m$\x1b[0m ');
    };

    socket.onmessage = (event) => {
      term.write(event.data);
    };

    socket.onclose = () => {
      setIsConnected(false);
      term.write('\r\n\x1b[31mConnection closed. Refresh page to reconnect.\x1b[0m\r\n');
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      term.write('\r\n\x1b[31mConnection error. Refresh page.\x1b[0m\r\n');
    };

    const handleResize = () => {
      requestAnimationFrame(() => {
        fitAddon.fit();
        const { cols, rows } = term;
        setDimensions({ cols, rows });
        
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(`\x1b[8;${rows};${cols}t`);
        }
      });
    };

    const handleData = (data: string) => {
      if (socket.readyState !== WebSocket.OPEN) {
        term.write('\r\n\x1b[31mNot connected. Refresh page.\x1b[0m\r\n');
        return;
      }

      const charCode = data.charCodeAt(0);

      if (charCode === 3) { // Ctrl+C
        socket.send('\x03');
        currentLineBufferRef.current = '';
        term.write('^C\r\n\x1b[32m$\x1b[0m ');
        return;
      }

      if (charCode === 13) { // Enter
        const currentLine = currentLineBufferRef.current;
        if (currentLine.trim().length > 0) {
          commandHistoryRef.current.push(currentLine);
          historyIndexRef.current = commandHistoryRef.current.length;
          socket.send(currentLine + '\n');
        } else {
          socket.send('\n');
        }
        currentLineBufferRef.current = '';
        return;
      }

      if (charCode === 127 || charCode === 8) { // Backspace
        if (currentLineBufferRef.current.length > 0) {
          term.write('\b \b');
          currentLineBufferRef.current = currentLineBufferRef.current.slice(0, -1);
        }
        return;
      }

      if (charCode === 27 && data.length >= 2 && data[1] === '[') { // Arrow Keys
        const arrowKey = data[2];
        if (arrowKey === 'A' || arrowKey === 'B') {
          if (commandHistoryRef.current.length === 0) return;
          
          term.write('\x1b[2K\r\x1b[32m$\x1b[0m ');
          
          if (arrowKey === 'A') {
            if (historyIndexRef.current > 0) {
              historyIndexRef.current--;
            }
          } else {
            if (historyIndexRef.current < commandHistoryRef.current.length - 1) {
              historyIndexRef.current++;
            } else {
              historyIndexRef.current = commandHistoryRef.current.length;
            }
          }
          
          if (historyIndexRef.current < commandHistoryRef.current.length) {
            currentLineBufferRef.current = commandHistoryRef.current[historyIndexRef.current];
            term.write(currentLineBufferRef.current);
          } else {
            currentLineBufferRef.current = '';
          }
        }
        return;
      }

      if (charCode >= 32) { // Printable characters
        currentLineBufferRef.current += data;
        term.write(data);
      }
    };

    term.onData(handleData);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [theme]);

  return {
    isConnected,
    dimensions,
    fitTerminal: () => fitAddonRef.current?.fit(),
  };
}
