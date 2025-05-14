'use client';

import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, X, Terminal as TerminalIcon, Database, Split } from 'lucide-react';
import { useState } from 'react';
import { useThemePreferences } from '@/lib/states/theme-preferences';
import { themes } from '@/lib/themes';
import { TerminalProps, TerminalTab } from './types';
import { TerminalInstance } from './terminal-instance';
import 'xterm/css/xterm.css';



export function Terminal({ className, defaultHeight = 300 }: TerminalProps) {
  const { theme } = useThemePreferences();
  const themeColors = themes[theme];
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'web1',
      name: 'WEB1',
      type: 'WEB',
    },
  ]);
  const [activeTab, setActiveTab] = useState('web1');

  const addTab = () => {
    const newTab: TerminalTab = {
      id: `db${tabs.length + 1}`,
      name: `DB${tabs.length + 1}`,
      type: 'DB',
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId && newTabs.length > 0) {
      setActiveTab(newTabs[0].id);
    }
  };

  const activeInstance = tabs.find(t => t.id === activeTab);

  return (
    <div 
      className={cn('flex flex-col rounded-lg border h-[calc(100vh-2rem)]', className)}
      style={{
        background: themeColors.background,
        color: themeColors.foreground,
        borderColor: themeColors.accent,
        minHeight: defaultHeight
      }}>
            {/* Terminal Header */}
      <div className="border-b " style={{ borderColor: themeColors.accent }}>

        {/* Instance Header */}
       

        {/* Tabs and Info Bar */}
        <div 
          className="flex items-center justify-between px-2 py-1"
          style={{
            background: `${themeColors.muted}80`,
          }}
        >
          <div className="flex items-center">
            <Tabs value={activeTab} className="w-[400px]">
              <TabsList 
                className="p-0.5 h-8 border rounded-md gap-1"
                style={{
                  background: themeColors.muted,
                  borderColor: themeColors.accent
                }}
              >
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="px-3 h-7 data-[state=active]:shadow-none rounded-md group hover:bg-accent/10 transition-colors"
                    style={{
                      backgroundColor: activeTab === tab.id ? themeColors.primary : 'transparent',
                      borderRight: `1px solid ${themeColors.accent}40`,
                      color: activeTab === tab.id ? themeColors.background : themeColors.foreground
                    }}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {tab.type === 'WEB' ? (
                          <TerminalIcon className="h-3 w-3" style={{ color: themeColors.accent }} />
                        ) : (
                          <Database className="h-3 w-3" style={{ color: themeColors.accent }} />
                        )}
                        <span className="text-xs font-medium">{tab.name}</span>
                      </div>
                      <div 
                        role="button"
                        className="h-4 w-4 p-0 hover:bg-transparent group-hover:opacity-100 opacity-60 cursor-pointer flex items-center justify-center"
                        onClick={(e: React.MouseEvent) => closeTab(tab.id, e)}
                      >
                        <X className="h-3 w-3 hover:text-destructive" />
                      </div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          
          </div>

          {activeInstance && (
            <div className="flex items-center gap-4 px-3">
              <div className="h-4 w-[1px]" style={{ background: themeColors.accent }} />
              {/* Buttons to create new instance */}
              <div className="flex items-center gap-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-accent/10"
                  onClick={addTab}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                {/* <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-accent/10"
                  onClick={() => {}}
                >
                  <Split className="h-4 w-4" />
                </Button> */}
              </div>

             
            </div>
              <div className="space-y-0.5">
                <span 
                  className="text-[10px] font-medium tracking-wider"
                  style={{ color: themeColors.secondary }}
                >
                  PUBLIC IP ADDRESS
                </span>
                <div className="text-xs font-mono">35.289.97.966</div>
              </div>
              <div className="space-y-0.5">
                <span 
                  className="text-[10px] font-medium tracking-wider"
                  style={{ color: themeColors.secondary }}
                >
                  PRIVATE IP ADDRESS
                </span>
                <div className="text-xs font-mono">10.495.720.325</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeInstance && (
        <TerminalInstance key={activeInstance.id} />
      )}
    </div>
  );
}
