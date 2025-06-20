/**
 * Test utility to verify authentication and file handling
 */

import { useAuthToken } from '@/lib/stores/auth-store';

export const testAuthAndFilePath = () => {
  const authToken = useAuthToken();
  
  console.log('=== Test Results ===');
  console.log('Auth token available:', !!authToken);
  console.log('Auth token value:', authToken ? 'PRESENT' : 'MISSING');
  
  // Test file path handling
  const testPaths = [
    '/home/user/pipeline.flow',
    '/workspace/project/data.flow',
    'simple.flow',
    null,
    undefined
  ];
  
  testPaths.forEach(path => {
    const filename = path ? path.split('/').pop() || 'pipeline.flow' : 'pipeline.flow';
    console.log(`Path: ${path} -> Filename: ${filename}`);
  });
  
  console.log('=== End Test Results ===');
  
  return {
    hasAuthToken: !!authToken,
    authToken: authToken
  };
};
