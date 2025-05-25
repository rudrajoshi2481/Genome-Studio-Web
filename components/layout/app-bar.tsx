'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { FileTabs } from './file-tabs';
import { cn } from '@/lib/utils';

import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/components/auth/store/auth-store';

interface AppBarProps {
  className?: string;
}

// Cookie removal utility function
const removeCookie = (name: string) => {
  // Remove from current domain
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  // Remove from current domain with secure flag
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;`;
  // Remove from localhost specifically
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
};

export function AppBar({ className }: AppBarProps) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  
  const handleLogout = async () => {
    console.log('[AppBar] Logout initiated');
    try {
      // Disable the dropdown to prevent multiple clicks
      setOpen(false);
      
      // Remove auth cookies immediately
      removeCookie('auth_token');
      removeCookie('token');
      removeCookie('access_token');
      
      // Clear any localStorage/sessionStorage auth data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
      
      // Call the logout function from the auth store
      await logout();
      
      console.log('[AppBar] Logout completed, redirecting to login');
      
      // Force immediate redirect
      router.push('/login');
      
      // Fallback redirect with page refresh to ensure clean state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
    } catch (error) {
      console.error('[AppBar] Logout error:', error);
      
      // Even if logout fails, remove cookies and redirect
      removeCookie('auth_token');
      removeCookie('token');
      removeCookie('access_token');
      
      // Force redirect to login
      window.location.href = '/login';
    }
  };
  
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
        
        {isAuthenticated ? (
          <>
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>{user?.username?.substring(0, 2) || 'U'}</AvatarFallback>
                  </Avatar>
                  <ChevronUp className={cn("h-4 w-4 transition-transform", open ? "rotate-0" : "rotate-180")} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.username || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email || 'user@example.com'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
