"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import TerminalInstance from '@/components/Terminal/TerminalInstance'
import { useTerminalStore, type TerminalType } from '@/components/Terminal/store/terminal-store'
import { getToken } from '@/lib/services/auth-service'
import { useAuthStore } from '@/lib/stores/auth-store'
import { getServerConfig } from '@/config/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Terminal as TerminalIcon } from 'lucide-react'

/**
 * /terminal-window — Standalone terminal window for a single terminal tab.
 *
 * Opened from the terminal tab context menu ("Move to New Window") via the
 * Electron IPC openWindow mechanism. The terminal tab ID and type are passed
 * as query params (?tabId=...&type=...&name=...). Auth state is shared from
 * the main window via localStorage (same origin).
 */
function TerminalWindowContent() {
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const config = getServerConfig()

  const tabId = searchParams.get('tabId') || ''
  const tabType = (searchParams.get('type') as TerminalType) || 'tmux'
  const tabName = searchParams.get('name') || 'Terminal'

  useEffect(() => {
    // Check for token passed via URL query param (for new windows where
    // SameSite=Strict cookies aren't sent on initial navigation)
    const urlToken = searchParams.get('token')

    if (urlToken) {
      // Store token in cookie and localStorage so API calls work
      const maxAge = 7 * 24 * 60 * 60
      document.cookie = `${config.auth.tokenStorageKey}=${urlToken}; path=/; max-age=${maxAge}; SameSite=Strict`
      localStorage.setItem(config.auth.tokenStorageKey, urlToken)
      const expiryTime = Date.now() + maxAge * 1000
      localStorage.setItem(config.auth.tokenExpiryKey, expiryTime.toString())
      useAuthStore.setState({ isAuthenticated: true, token: urlToken, isLoading: false })

      // Clean the URL so the token doesn't stay visible
      if (typeof window !== 'undefined') {
        const cleanUrl = window.location.pathname + `?tabId=${encodeURIComponent(tabId)}&type=${encodeURIComponent(tabType)}&name=${encodeURIComponent(tabName)}`
        window.history.replaceState({}, '', cleanUrl)
      }
    } else {
      // No token in URL — check if already authenticated via auth store
      const authState = useAuthStore.getState()
      if (authState.isAuthenticated && authState.token) {
        const maxAge = 7 * 24 * 60 * 60
        document.cookie = `${config.auth.tokenStorageKey}=${authState.token}; path=/; max-age=${maxAge}; SameSite=Strict`
      } else {
        const token = getToken()
        if (token) {
          useAuthStore.setState({ isAuthenticated: true, token, isLoading: false })
        }
      }
    }

    // Register this terminal as a tab in the terminal store so
    // TerminalInstance can find it via useTerminalStore.
    if (tabId) {
      const terminalStore = useTerminalStore.getState()
      const existing = terminalStore.tabs.find(t => t.id === tabId)
      if (!existing) {
        // Create a tab with the provided ID — we need to use createTab then
        // rename it to match the requested ID.
        const newId = terminalStore.createTab(tabName, tabType)
        if (newId !== tabId) {
          // Replace the generated ID with the requested one
          useTerminalStore.setState((state) => {
            const updatedTabs = state.tabs.map(t =>
              t.id === newId ? { ...t, id: tabId } : t
            )
            return {
              tabs: updatedTabs,
              activeTabId: tabId,
            }
          })
        }
      } else {
        terminalStore.setActiveTab(tabId)
      }
    }

    setReady(true)
  }, [config.auth.tokenStorageKey, config.auth.tokenExpiryKey, searchParams, tabId, tabName, tabType])

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!tabId) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-muted-foreground">No terminal specified</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Minimal header bar for the standalone terminal window */}
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        <TerminalIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{tabName}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {tabType === 'tmux' ? 'Persistent (tmux)' : 'Bash'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => typeof window !== 'undefined' && window.close()}
        >
          <ArrowLeft className="size-3" />
          Close
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <TerminalInstance tabId={tabId} />
      </div>
    </div>
  )
}

function TerminalWindowPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <TerminalWindowContent />
    </Suspense>
  )
}

export default TerminalWindowPage
