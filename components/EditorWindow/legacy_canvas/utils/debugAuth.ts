/**
 * Debug utility for authentication and file path issues
 */

import { getServerConfig } from '@/config/server';

export const debugAuth = () => {
  const config = getServerConfig();
  
  console.log('=== Auth Debug Info ===');
  console.log('Browser environment:', typeof window !== 'undefined');
  console.log('Document cookies:', typeof document !== 'undefined' ? document.cookie : 'N/A');
  
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    console.log('All cookies:', cookies);
    
    const tokenCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${config.auth.tokenStorageKey}=`)
    );
    console.log('Token cookie:', tokenCookie);
    console.log('Token storage key:', config.auth.tokenStorageKey);
  }
  
  console.log('=== End Auth Debug ===');
};

export const debugFilePath = (activePath: string | null | undefined, storeActivePath: string | null | undefined) => {
  console.log('=== File Path Debug Info ===');
  console.log('activePath prop:', activePath);
  console.log('storeActivePath:', storeActivePath);
  console.log('Final path:', activePath || storeActivePath);
  console.log('=== End File Path Debug ===');
};
