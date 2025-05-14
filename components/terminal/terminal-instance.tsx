'use client';

import { useRef, useEffect } from 'react';
import { useTerminal } from './use-terminal';
import { useThemePreferences } from '@/lib/states/theme-preferences';
import { themes } from '@/lib/themes';

export function TerminalInstance() {
  const terminalRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const { theme } = useThemePreferences();
  const themeColors = themes[theme];
  const { isConnected, dimensions, fitTerminal } = useTerminal(terminalRef);

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
