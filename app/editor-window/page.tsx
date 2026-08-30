"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import EditorFactory from '@/components/Editorwindow_new/components/EditorFactory'
import { EditorProvider } from '@/components/Editorwindow_new/context/EditorContext'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import { getToken } from '@/lib/services/auth-service'
import { useAuthStore } from '@/lib/stores/auth-store'
import { getServerConfig } from '@/config/server'

/**
 * /editor-window — Standalone editor window for a single file.
 *
 * Opened from the file tab context menu ("Move to New Window") via the
 * Electron IPC openWindow mechanism. The file path is passed as a query
 * param (?path=...). Auth state is shared from the main window via
 * localStorage (same origin).
 */
function EditorWindowContent() {
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const config = getServerConfig()

  const filePath = searchParams.get('path') || ''
  const fileName = filePath.split('/').pop() || 'Untitled'
  const extension = fileName.includes('.') ? fileName.split('.').pop() : undefined
  const tabId = `editor-window-${filePath}`

  useEffect(() => {
    // Ensure auth is available in this new window (shared via localStorage)
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

    // Register this file as a tab so EditorFactory/Canvas can find it
    // via useTabStore (some editors look up tab data from the store).
    const tabStore = useTabStore.getState()
    if (filePath && !tabStore.tabs.has(tabId)) {
      tabStore.addTab(filePath)
      // addTab generates its own id; rename to our predictable id
      // by setting active tab
      const state = useTabStore.getState()
      const realId = state.activeTabId
      if (realId && realId !== tabId) {
        // Rename the tab id by creating a new entry
        const tab = state.tabs.get(realId)
        if (tab) {
          useTabStore.setState({
            tabs: new Map(state.tabs).set(tabId, { ...tab, id: tabId }),
            activeTabId: tabId,
            tabOrder: [tabId],
          })
        }
      }
    }

    setReady(true)
  }, [config.auth.tokenStorageKey, filePath, tabId])

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!filePath) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-muted-foreground">No file specified</div>
      </div>
    )
  }

  return (
    <EditorProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div className="flex-1 min-h-0">
          <EditorFactory
            tabId={tabId}
            filePath={filePath}
            extension={extension}
            isActive={true}
          />
        </div>
      </div>
    </EditorProvider>
  )
}

function EditorWindowPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <EditorWindowContent />
    </Suspense>
  )
}

export default EditorWindowPage
