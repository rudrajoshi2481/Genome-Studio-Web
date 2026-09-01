/**
 * Extension Hub Authentication Service
 *
 * Manages a separate auth token for the Extension Hub. This is independent
 * from the local Genome Studio backend auth — local package management
 * (My Packages) never requires auth, but publishing (pushing to the Hub)
 * requires the user to sign in with their Extension Hub account.
 *
 * The token is stored in localStorage under `hub_auth_token` and sent as
 * `Authorization: Bearer <token>` on publish requests.
 */

const HUB_TOKEN_KEY = 'hub_auth_token'
const HUB_USER_KEY = 'hub_auth_user'
const HUB_TOKEN_EXPIRY_KEY = 'hub_auth_token_expiry'

export interface HubUser {
  username: string
  email?: string
  display_name?: string
}

export interface HubAuthResponse {
  success: boolean
  message?: string
  token?: string
  expires_in?: number
  user?: HubUser
}

/**
 * Get the Extension Hub base URL.
 * In dev mode this is the hub service directly; in production it goes
 * through the Genome Studio backend proxy.
 */
function getHubBaseUrl(): string {
  // Use the same API base as the rest of the app — the backend proxies
  // hub auth requests to the Extension Hub.
  // We import lazily to avoid circular deps.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getApiBaseUrl } = require('@/config/server')
  return `${getApiBaseUrl()}/extensions-hub`
}

/**
 * Register an account on the Extension Hub.
 */
export async function hubRegister(
  username: string,
  password: string,
  display_name?: string,
  email?: string,
): Promise<HubAuthResponse> {
  try {
    const resp = await fetch(`${getHubBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, display_name, email }),
    })

    const data = await resp.json()

    if (!resp.ok) {
      return { success: false, message: data.detail || data.message || 'Registration failed' }
    }

    if (!data.token) {
      return { success: false, message: 'No token returned' }
    }

    const token = data.token as string
    const expiresIn = data.expires_in || 86400 * 7
    localStorage.setItem(HUB_TOKEN_KEY, token)
    localStorage.setItem(HUB_USER_KEY, JSON.stringify(data.user || { username }))
    localStorage.setItem(HUB_TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000))

    return {
      success: true,
      token,
      expires_in: expiresIn,
      user: data.user || { username },
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' }
  }
}

/**
 * Sign in to the Extension Hub.
 * Sends credentials to the hub auth endpoint and stores the returned token.
 */
export async function hubLogin(username: string, password: string): Promise<HubAuthResponse> {
  try {
    const resp = await fetch(`${getHubBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await resp.json()

    if (!resp.ok) {
      return { success: false, message: data.detail || data.message || 'Login failed' }
    }

    if (!data.token) {
      return { success: false, message: 'No token returned' }
    }

    // Store token
    const token = data.token as string
    const expiresIn = data.expires_in || 86400 * 7 // default 7 days
    localStorage.setItem(HUB_TOKEN_KEY, token)
    localStorage.setItem(HUB_USER_KEY, JSON.stringify(data.user || { username }))
    localStorage.setItem(HUB_TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000))

    return {
      success: true,
      token,
      expires_in: expiresIn,
      user: data.user || { username },
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' }
  }
}

/**
 * Sign out of the Extension Hub.
 * Clears the stored token and user info.
 */
export function hubLogout(): void {
  localStorage.removeItem(HUB_TOKEN_KEY)
  localStorage.removeItem(HUB_USER_KEY)
  localStorage.removeItem(HUB_TOKEN_EXPIRY_KEY)
}

/**
 * Get the current Extension Hub auth token, or null if not signed in.
 */
export function getHubToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(HUB_TOKEN_KEY)
}

/**
 * Get the current Extension Hub user info, or null if not signed in.
 */
export function getHubUser(): HubUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(HUB_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as HubUser
  } catch {
    return null
  }
}

/**
 * Check if the user is signed in to the Extension Hub.
 * Verifies token presence and expiry.
 */
export function isHubAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  const token = localStorage.getItem(HUB_TOKEN_KEY)
  if (!token) return false
  const expiry = localStorage.getItem(HUB_TOKEN_EXPIRY_KEY)
  if (!expiry) return false
  return Date.now() < parseInt(expiry, 10)
}

/**
 * Get auth headers for Extension Hub requests.
 * Returns an object with the Authorization header if signed in.
 */
export function hubAuthHeaders(): Record<string, string> {
  const token = getHubToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
