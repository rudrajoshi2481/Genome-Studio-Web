"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Toolbar from "./toolbar";
import { useState } from "react";

interface SidebarProps {
  /** Optional className for styling */
  className?: string;
}

/**
 * Sidebar component that manages the navigation toolbar and content area
 * Displays tools like File Explorer and AI Chat in a resizable panel
 */
export function Sidebar({ className }: SidebarProps) {
  // State for the currently active sidebar component
  const [activeComponent, setActiveComponent] = useState<React.ReactNode>(
    <div className="text-sm text-muted-foreground p-4">
      Select a tool from the sidebar
    </div>
  );

  return (
    <aside className={cn("flex h-screen", className)}>
      {/* Navigation Toolbar */}
      <Toolbar onComponentChange={setActiveComponent} />

      {/* Content Area */}
      <div className="flex flex-col flex-1 border-r bg-background">
         <div className="h-9 border-b bg-muted/30 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Genome Studio</span>
                      <span className="text-xs text-muted-foreground">v1.0.0</span>
                    </div>
                  </div>
        <ScrollArea className="flex-1">
          {activeComponent}
        </ScrollArea>
      </div>
    </aside>
  );
}
