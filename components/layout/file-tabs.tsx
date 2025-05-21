'use client';

import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { FileIcon, X } from 'lucide-react';
import { useState } from 'react';

interface FileTab {
  id: string;
  name: string;
  path: string;
  isDirty?: boolean;
}

import { useFileTabsStore } from '@/store/fileTabsStore';

interface FileTabsProps {
  className?: string;
}

export function FileTabs({ className }: FileTabsProps) {
  const { openTabs, activeTabId, removeTab, setActiveTab } = useFileTabsStore();

  const handleCloseTab = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTab(fileId);
  };

  return (
    <ScrollArea className={cn('w-full', className)}>
      <div className="flex h-9">
        {openTabs.map((file) => (
          <div
            key={file.id}
            role="button"
            className={cn(
              'group relative h-8 rounded-none border-r px-2 hover:bg-muted/50 flex items-center cursor-pointer',
              activeTabId === file.id && 'bg-background'
            )}
            onClick={() => setActiveTab(file.id)}
          >
            <div className="flex items-center gap-1.5">
              <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="max-w-[120px] truncate text-xs">
                {file.name}
                {file.isDirty && <span className="ml-1 text-muted-foreground text-[10px]">●</span>}
              </span>
              <div
                role="button"
                className="h-3 w-3 p-0 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
                onClick={(e) => handleCloseTab(file.id, e)}
              >
                <X className="h-3 w-3" />
              </div>
            </div>
            {activeTabId === file.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}