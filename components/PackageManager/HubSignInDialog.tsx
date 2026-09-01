"use client"

import React, { useState, useEffect } from 'react'
import { Loader2, LogIn, Cloud, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

import { hubLogin, hubRegister, isHubAuthenticated, getHubUser } from '@/lib/services/hub-auth-service'

export interface HubSignInDialogProps {
  isOpen: boolean
  onClose: () => void
  onSignedIn?: () => void
  /** Optional message shown above the form */
  message?: string
}

export default function HubSignInDialog({
  isOpen,
  onClose,
  onSignedIn,
  message,
}: HubSignInDialogProps) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMode('signin')
      setUsername('')
      setPassword('')
      setConfirmPassword('')
      setDisplayName('')
      setEmail('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error('Enter username and password')
      return
    }
    if (mode === 'register') {
      if (password !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }
    }
    setIsLoading(true)
    try {
      const result = mode === 'register'
        ? await hubRegister(username.trim(), password, displayName.trim() || undefined, email.trim() || undefined)
        : await hubLogin(username.trim(), password)
      if (result.success) {
        toast.success(mode === 'register'
          ? `Created Extension Hub account for ${result.user?.username || username}`
          : `Signed in to Extension Hub as ${result.user?.username || username}`)
        onSignedIn?.()
        onClose()
      } else {
        toast.error(result.message || (mode === 'register' ? 'Registration failed' : 'Sign in failed'))
      }
    } catch (err: any) {
      toast.error(`${mode === 'register' ? 'Registration' : 'Sign in'} failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[380px] p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            {mode === 'register' ? 'Create Extension Hub account' : 'Sign in to Extension Hub'}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {mode === 'register'
              ? 'Create a free account to publish and manage packages on the Extension Hub.'
              : 'Sign in to publish packages to the Extension Hub. Local packages work without signing in.'}
          </DialogDescription>
        </DialogHeader>

        {message && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-muted-foreground">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="h-8 text-xs mt-1"
              autoFocus
              disabled={isLoading}
            />
          </div>
          {mode === 'register' && (
            <>
              <div>
                <Label className="text-xs">Display name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="h-8 text-xs mt-1"
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label className="text-xs">Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-8 text-xs mt-1"
                  disabled={isLoading}
                />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-8 text-xs mt-1"
              disabled={isLoading}
            />
          </div>
          {mode === 'register' && (
            <div>
              <Label className="text-xs">Confirm password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-8 text-xs mt-1"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}
              className="text-[11px] text-muted-foreground hover:text-foreground underline"
            >
              {mode === 'signin' ? 'Create an account' : 'Already have an account? Sign in'}
            </button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs h-7 gap-1" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : mode === 'register' ? (
                  <LogIn className="h-3.5 w-3.5" />
                ) : (
                  <LogIn className="h-3.5 w-3.5" />
                )}
                {mode === 'register' ? 'Create account' : 'Sign in'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
