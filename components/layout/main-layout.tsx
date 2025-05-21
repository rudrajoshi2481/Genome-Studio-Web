import { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { AIChat } from '@/components/ai/ai-chat';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { AppBar } from './app-bar';
import { Terminal } from '../terminal/terminal';
import { FileTabs } from './file-tabs';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      {/* Left Sidebar - File Manager */}
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="h-screen bg-muted/30">
        <div className="h-full border-r">
          <Sidebar />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Main Content Area */}
      <ResizablePanel defaultSize={60} className="h-screen bg-background">
        <div className="flex flex-col h-full">
          {/* Title Bar */}
         

          <AppBar />

          {/* Resizable Content Area */}
          <div className="flex-1">
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Canvas Area */}
              <ResizablePanel defaultSize={75}>
                <div className="h-full w-full overflow-auto ">
                  {children}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Logs/Terminal Area */}
              <ResizablePanel defaultSize={4} minSize={4} maxSize={80}>
                <Terminal />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </ResizablePanel>


     
    </ResizablePanelGroup>
  );
}
