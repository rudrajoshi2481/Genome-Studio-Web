'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useThemePreferences } from '@/lib/states/theme-preferences';
import { themes } from '@/lib/themes';
import { TerminalProps } from './types';
import { TerminalInstance } from './terminal-instance';
import TerminalToolbar from './components/Terminal-toolbar';
import { useTerminalStore } from './store/terminal-store';
import 'xterm/css/xterm.css';



export function Terminal({ className, defaultHeight = 300 }: TerminalProps) {
  const { theme } = useThemePreferences();
  const themeColors = themes[theme];
  const { instances, activeInstanceId, addInstance, removeInstance, setActiveInstance } = useTerminalStore();
  
  // Initialize a default terminal instance if none exists
  React.useEffect(() => {
    if (instances.length === 0) {
      const defaultInstance = {
        id: 'tty-01',
        name: 'tty 01',
        type: 'tty' as const
      };
      addInstance(defaultInstance);
      setActiveInstance(defaultInstance.id);
    } else if (!activeInstanceId && instances.length > 0) {
      // If there are instances but no active one, set the first one as active
      setActiveInstance(instances[0].id);
    }
  }, [instances, activeInstanceId, addInstance, setActiveInstance]);

  const addTab = () => {
    const number = (instances.length + 1).toString().padStart(2, '0');
    const newInstance = {
      id: `tty-${number}`,
      name: `tty ${number}`,
      type: 'tty' as const
    };
    addInstance(newInstance);
    setActiveInstance(newInstance.id);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeInstance(tabId);
  };

  const activeInstance = instances.find(t => t.id === activeInstanceId);

  return (
    <div 
      className={cn('flex flex-col rounded-lg border h-full', className)}
      style={{
        background: themeColors.background,
        color: themeColors.foreground,
        borderColor: themeColors.accent,
        minHeight: defaultHeight
      }}>
      <TerminalToolbar
        tabs={instances}
        activeTab={activeInstanceId}
        themeColors={themeColors}
        onAddTab={addTab}
        onCloseTab={closeTab}
        onTabChange={setActiveInstance}
      />

      {activeInstance && (
        <TerminalInstance key={activeInstance.id} id={activeInstance.id} />
      )}
    </div>
  );
}
