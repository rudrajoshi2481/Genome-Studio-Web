'use client';

import { useRef, useEffect } from 'react';
import { useTerminal } from './use-terminal';
import { useThemePreferences } from '@/lib/states/theme-preferences';
import { themes } from '@/lib/themes';
import { useTerminalStore } from './store/terminal-store';

interface TerminalInstanceProps {
  id: string;
}

export function TerminalInstance({ id }: TerminalInstanceProps) {
  const terminalRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const { theme } = useThemePreferences();
  const themeColors = themes[theme];
  const { appendLog } = useTerminalStore();
  const { isConnected, dimensions, fitTerminal, terminal } = useTerminal(terminalRef);

  useEffect(() => {
    if (terminal) {
      terminal.onData((data: string) => {
        appendLog(id, data);
      });
    }
  }, [terminal, id, appendLog]);

  useEffect(() => {
    // Ensure terminal fits container on mount and theme change
    fitTerminal();
  }, [theme, fitTerminal]);

  return (
    <div 
      className="flex-1 text-sm" 
      style={{ 
        background: `${themeColors.muted}10`,
        // fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        fontFamily: 'monospace',
        height: '100%',
        position: 'relative'
      }}
    >
      <div
        ref={terminalRef}
        className="absolute inset-0 overflow-y-auto"
        data-terminal-id={`terminal-${dimensions.cols}x${dimensions.rows}`}
        data-connected={isConnected}
      />
    </div>
  );
}
