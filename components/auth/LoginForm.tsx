'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Use auth store
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  // Ensure the redirect path doesn't start with a slash if it's already in the URL
  const redirectParam = searchParams.get('redirect');
  const redirect = redirectParam ? redirectParam.replace(/^\//, '') : 'dashboard';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Attempting login with username:', username);
    
    // Use the login function from auth store
    const success = await login(username, password);
    
    if (success) {
      // Redirect to the original destination or dashboard
      // Ensure we use the correct path format
      router.push(`/dashboard`);
      console.log(`Redirecting to: /dashboard`);
    }
  };
  
  return (
    <div className="w-full max-w-md space-y-8 rounded-lg border p-6 shadow-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Genome Studio</h1>
        <h2 className="mt-2 text-xl">Sign in to your account</h2>
      </div>
      
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-md shadow-sm">
          <div>
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
