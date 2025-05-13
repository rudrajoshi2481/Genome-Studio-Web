import { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { AIChat } from '@/components/ai/ai-chat';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

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

      <ResizableHandle />

      {/* Main Content Area */}
      <ResizablePanel defaultSize={60} className="h-screen bg-background">
        <div className="flex flex-col h-full">
          {/* App Bar */}
          <div className="h-12 border-b bg-muted/20 px-4 flex items-center justify-between backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <span className="text-sm text-muted-foreground">file-selector.tsx</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <a href="/settings">
                  <Settings className="h-4 w-4" />
                </a>
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Resizable Content Area */}
          <div className="flex-1">
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Canvas Area */}
              <ResizablePanel defaultSize={75}>
                <div className="h-full w-full overflow-auto">
                  {children}
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* Logs/Terminal Area */}
              <ResizablePanel defaultSize={25} minSize={10} maxSize={50}>
                <div className="h-full w-full border-t bg-muted/50 p-4">
                  <div className="text-sm text-muted-foreground">Logs / Terminal</div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Right Sidebar - AI Chat */}
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="h-screen bg-muted/30">
        <div className="h-full border-l">
          <AIChat />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
