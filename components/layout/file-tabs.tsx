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

interface FileTabsProps {
  className?: string;
}

export function FileTabs({ className }: FileTabsProps) {
  // Example files - in real app, this would come from a store
  const [files, setFiles] = useState<FileTab[]>([
    { id: '1', name: 'file-selector.tsx', path: '/components/file-selector.tsx' },
    { id: '2', name: 'main-layout.tsx', path: '/components/layout/main-layout.tsx' },
    { id: '3', name: 'sidebar.tsx', path: '/components/sidebar/sidebar.tsx', isDirty: true },
    { id: '4', name: 'terminal.tsx', path: '/components/terminal/terminal.tsx' },
    { id: '5', name: 'app-bar.tsx', path: '/components/app-bar.tsx' },

    
  ]);
  const [activeFile, setActiveFile] = useState<string>(files[0].id);

  const handleCloseTab = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(files.filter(f => f.id !== fileId));
    if (activeFile === fileId && files.length > 1) {
      // Set the next file as active, or the previous if we're closing the last file
      const index = files.findIndex(f => f.id === fileId);
      const nextIndex = index === files.length - 1 ? index - 1 : index + 1;
      setActiveFile(files[nextIndex].id);
    }
  };

  return (
    <ScrollArea className={cn('w-full', className)}>
      <div className="flex h-9">
        {files.map((file) => (
          <div
            key={file.id}
            role="button"
            className={cn(
              'group relative h-8 rounded-none border-r px-2 hover:bg-muted/50 flex items-center cursor-pointer',
              activeFile === file.id && 'bg-background'
            )}
            onClick={() => setActiveFile(file.id)}
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
            {activeFile === file.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}