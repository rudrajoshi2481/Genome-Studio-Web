"use client"

import React, { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PackageManagerPage from '@/components/PackageManager/PackageManagerPage'
import { getServerConfig } from '@/config/server'
import { getCurrentUser, getToken } from '@/lib/services/auth-service'
import { useAuthStore } from '@/lib/stores/auth-store'

/**
 * /extensions-hub — Package Manager page.
 *
 * Opens as a standalone page (no app shell). The Toolbar's "Extensions Hub"
 * entry (page type) opens this in a new tab.
 *
 * When opened from the Toolbar via window.open(), the auth token is passed
 * as a query param (?token=...) so the new window is authenticated without
 * requiring a separate login.
 */
function ExtensionsHubContent() {
  const openNewProjectRef = useRef<(() => void) | null>(null)
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const config = getServerConfig()

  useEffect(() => {
    const token = searchParams.get('token')

    if (token) {
      console.log('[extensions-hub] Token received from URL, storing...')

      // Store token in cookie (same format as auth-service login)
      const maxAge = 7 * 24 * 60 * 60 // 7 days default
      document.cookie = `${config.auth.tokenStorageKey}=${token}; path=/; max-age=${maxAge}; SameSite=Strict`

      // Store expiry in localStorage
      const expiryTime = Date.now() + maxAge * 1000
      localStorage.setItem(config.auth.tokenExpiryKey, expiryTime.toString())

      // Set auth store state so components that useAuthStore work
      useAuthStore.setState({
        isAuthenticated: true,
        token,
        isLoading: false,
      })

      // Fetch user data with the new token
      getCurrentUser(token).then(user => {
        if (user) {
          console.log('[extensions-hub] User data fetched:', user.username)
          useAuthStore.setState({ user, isAuthenticated: true })
        }
      }).catch(err => {
        console.error('[extensions-hub] Failed to fetch user:', err)
      }).finally(() => {
        setReady(true)
      })

      // Clean the URL so the token doesn't stay visible
      if (typeof window !== 'undefined') {
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
      }
    } else {
      // No token in URL — check if already authenticated via auth store
      // (zustand persist rehydrates from localStorage, shared across Electron windows)
      console.log('[extensions-hub] No token in URL, checking auth store...')
      const authState = useAuthStore.getState()
      if (authState.isAuthenticated && authState.token) {
        console.log('[extensions-hub] Already authenticated via auth store')
        // Ensure cookie is set from the store token
        const maxAge = 7 * 24 * 60 * 60
        document.cookie = `${config.auth.tokenStorageKey}=${authState.token}; path=/; max-age=${maxAge}; SameSite=Strict`
        setReady(true)
      } else {
        // Try getting token from cookie directly
        const cookieToken = getToken()
        if (cookieToken) {
          console.log('[extensions-hub] Found token in cookie')
          useAuthStore.setState({ isAuthenticated: true, token: cookieToken, isLoading: false })
          setReady(true)
        } else {
          console.log('[extensions-hub] No auth found, proceeding anyway — API calls may fail')
          setReady(true)
        }
      }
    }
  }, [searchParams, config.auth.tokenStorageKey, config.auth.tokenExpiryKey])

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex-1 min-h-0">
        <PackageManagerPage onRegisterNewProjectOpener={(open) => { openNewProjectRef.current = open }} />
      </div>
    </div>
  )
}

function ExtensionsHubPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <ExtensionsHubContent />
    </Suspense>
  )
}

export default ExtensionsHubPage
