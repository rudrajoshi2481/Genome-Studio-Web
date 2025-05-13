'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { FileTabs } from './file-tabs';
import { cn } from '@/lib/utils';

interface AppBarProps {
  className?: string;
}

export function AppBar({ className }: AppBarProps) {
  return (
    <div className={cn(
      'flex h-9 items-center justify-between bg-muted/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b',
      className
    )}>
      <FileTabs />
      <div className="flex items-center gap-2 px-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings" prefetch>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <Avatar className="h-6 w-6">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
