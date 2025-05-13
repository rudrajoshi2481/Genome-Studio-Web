'use client';

import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, X, Terminal as TerminalIcon, Database, Split } from 'lucide-react';
import { useState } from 'react';
import { useThemePreferences } from '@/lib/states/theme-preferences';
import { themes } from '@/lib/themes';

interface TerminalProps {
  className?: string;
}

interface TerminalTab {
  id: string;
  name: string;
  type: 'WEB' | 'DB';
  content: string[];
}

export function Terminal({ className }: TerminalProps) {
  const { theme } = useThemePreferences();
  const themeColors = themes[theme];
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'web1',
      name: 'WEB1',
      type: 'WEB',
      content: [
        'Welcome to the oxide cloud shell! Type "help" to get started.',
        'You are now interacting through this shell on instance WEB1',
        'cameron@web1:~ $ ',
      ],
    },
  ]);
  const [activeTab, setActiveTab] = useState('web1');

  const addTab = () => {
    const newTab: TerminalTab = {
      id: `db${tabs.length + 1}`,
      name: `DB${tabs.length + 1}`,
      type: 'DB',
      content: [
        'Welcome to the oxide cloud shell! Type "help" to get started.',
        `You are now interacting through this shell on instance DB${tabs.length + 1}`,
        `cameron@db${tabs.length + 1}:~ $ `,
      ],
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
      className={cn('flex flex-col h-full', className)}
      style={{
        background: themeColors.background,
        color: themeColors.foreground
      }}>
      {/* Terminal Header */}
      <div className="border-b" style={{ borderColor: themeColors.accent }}>
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
                className="p-0 h-7 border rounded-sm"
                style={{
                  background: themeColors.muted,
                  borderColor: themeColors.accent
                }}
              >
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="px-3 h-6 data-[state=active]:shadow-none rounded-none group hover:bg-accent/10"
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
            <div className="flex items-center gap-1">
              <div 
                role="button"
                className="h-7 px-2 rounded-sm hover:bg-accent/10 flex items-center gap-1.5 border cursor-pointer"
                style={{
                  borderColor: themeColors.accent,
                  color: themeColors.foreground,
                  background: themeColors.muted
                }}
                onClick={addTab}
              >
                <Plus className="h-3.5 w-3.5" style={{ color: themeColors.accent }} />
                <span className="text-xs font-medium">New Tab</span>
              </div>

              <div
                role="button"
                className="h-7 px-2 rounded-sm hover:bg-accent/10 flex items-center gap-1.5 border cursor-pointer"
                style={{
                  borderColor: themeColors.accent,
                  color: themeColors.foreground,
                  background: themeColors.muted
                }}
                onClick={() => {
                  // Here you can handle opening a new terminal instance
                  // This could involve splitting the panel or opening in a new window
                  console.log('Open new terminal instance');
                }}
              >
                <Split className="h-3.5 w-3.5" style={{ color: themeColors.accent }} />
                <span className="text-xs font-medium">Split</span>
              </div>
            </div>
          </div>

          {activeInstance && (
            <div className="flex items-center gap-6 px-2">
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

      {/* Terminal Content */}
      <div className="flex-1 p-4 font-mono text-sm overflow-auto">
        {activeInstance?.content.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
