import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, X, Terminal as TerminalIcon, Database } from 'lucide-react';
import { TerminalTab } from '../types';
import { themes } from '@/lib/themes';

interface TerminalToolbarProps {
  tabs: TerminalTab[];
  activeTab: string;
  themeColors: typeof themes[keyof typeof themes];
  onAddTab: () => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onTabChange: (tabId: string) => void;
}

function TerminalToolbar({
  tabs,
  activeTab,
  themeColors,
  onAddTab,
  onCloseTab,
  onTabChange
}: TerminalToolbarProps) {
  return (
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
                    onClick={() => onTabChange(tab.id)}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {tab.type === 'tty' ? (
                          <TerminalIcon 
                            className="h-3 w-3" 
                            style={{ 
                              color: activeTab === tab.id ? themeColors.background : themeColors.foreground,
                              opacity: activeTab === tab.id ? 1 : 0.7
                            }} 
                          />
                        ) : (
                          <Database 
                            className="h-3 w-3" 
                            style={{ 
                              color: activeTab === tab.id ? themeColors.background : themeColors.foreground,
                              opacity: activeTab === tab.id ? 1 : 0.7
                            }} 
                          />
                        )}
                        <span className="text-xs font-medium">{tab.name}</span>
                      </div>
                      <div 
                        role="button"
                        className="h-4 w-4 p-0 hover:bg-transparent group-hover:opacity-100 opacity-60 cursor-pointer flex items-center justify-center"
                        onClick={(e: React.MouseEvent) => onCloseTab(tab.id, e)}
                      >
                        <X 
                          className="h-3 w-3 hover:text-destructive" 
                          style={{ 
                            color: activeTab === tab.id ? themeColors.background : themeColors.foreground,
                            opacity: 0.7
                          }} 
                        />
                      </div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          
          </div>

     
            <div className="flex items-center gap-4 px-3">
              <div className="h-4 w-[1px]" style={{ background: themeColors.accent }} />
              {/* Buttons to create new instance */}
              <div className="flex items-center gap-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-accent/10"
                  onClick={onAddTab}
                >
                  <Plus className="h-4 w-4" style={{ color: themeColors.foreground }} />
                </Button>
              
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
          
        </div>
      </div>
  )
}

export default TerminalToolbar
