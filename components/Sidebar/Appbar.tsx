import React from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

function Appbar() {
  // Get user data from auth store
  const { user, isAuthenticated, logout } = useAuthStore();
  
  // Generate initials for avatar fallback
  const getInitials = () => {
    if (!user || !user.full_name) return 'GS';
    
    return user.full_name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  return (
    <div className="p-2 border-b flex justify-between items-center relative">
      <div className=''>
      <span className="font-semibold text-sm">Genome Studio<span className="text-xs text-muted-foreground ml-2">v1.0.0</span></span>
      </div>
     
    </div>
  )
}

export default Appbar