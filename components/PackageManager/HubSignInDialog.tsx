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

import { hubLogin, isHubAuthenticated, getHubUser } from '@/lib/services/hub-auth-service'

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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setUsername('')
      setPassword('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error('Enter username and password')
      return
    }
    setIsLoading(true)
    try {
      const result = await hubLogin(username.trim(), password)
      if (result.success) {
        toast.success(`Signed in to Extension Hub as ${result.user?.username || username}`)
        onSignedIn?.()
        onClose()
      } else {
        toast.error(result.message || 'Sign in failed')
      }
    } catch (err: any) {
      toast.error(`Sign in failed: ${err.message}`)
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
            Sign in to Extension Hub
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Sign in to publish packages to the Extension Hub. Local packages
            work without signing in — you only need this to push (upload)
            to the cloud.
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

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs h-7 gap-1" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogIn className="h-3.5 w-3.5" />
              )}
              Sign in
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
