'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/components/auth/store/auth-store';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Auth] Login form submitted');
    
    // Clear previous errors
    setValidationError(null);
    clearError();
    
    // Validate form
    if (!email || !password) {
      setValidationError('Please fill in all fields');
      return;
    }
    
    // Submit login request
    await login(email, password);
    
    // Redirect on success (the store will update isAuthenticated)
    if (useAuthStore.getState().isAuthenticated) {
      console.log('[Auth] Login successful, redirecting to home');
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/');
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        
        {/* Error display */}
        {(error || validationError) && (
          <Alert variant="destructive">
            <AlertDescription>
              {validationError || error}
            </AlertDescription>
          </Alert>
        )}
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </div>
    </form>
  );
}
