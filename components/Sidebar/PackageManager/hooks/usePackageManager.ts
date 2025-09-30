import { useState } from 'react'

interface Environment {
  name: string
  path: string
  is_active: boolean
}

interface Package {
  name: string
  version: string
  build: string
  channel: string
  size: number
}

interface SearchResult {
  name: string
  version: string
  build: string
  channel: string
  subdir: string
  size: number
  timestamp: number
  all_versions: number
}

import { host } from '@/config/server'
import { port } from '@/config/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://${host}:${port}`

export const usePackageManager = () => {
  const [isLoading, setIsLoading] = useState(false)

  const getAuthToken = () => {
    if (typeof window === 'undefined') {
      return null
    }
    
    // Get token from cookies using the correct storage key
    const cookies = document.cookie.split(';')
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('genome_studio_token='))
    
    if (!tokenCookie) {
      return null
    }
    
    return tokenCookie.split('=')[1]
  }

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken()
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(errorData.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  const fetchEnvironments = async (): Promise<Environment[]> => {
    try {
      setIsLoading(true)
      const data = await makeAuthenticatedRequest('/api/v1/package-manager/environments')
      return data.environments || []
    } catch (error) {
      console.error('Error fetching environments:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPackagesInEnvironment = async (envName: string): Promise<Package[]> => {
    try {
      setIsLoading(true)
      const data = await makeAuthenticatedRequest(`/api/v1/package-manager/environments/${encodeURIComponent(envName)}/packages`)
      return data.packages || []
    } catch (error) {
      console.error('Error fetching packages:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const searchPackages = async (query: string, channel?: string): Promise<SearchResult[]> => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ query })
      if (channel) {
        params.append('channel', channel)
      }
      
      const data = await makeAuthenticatedRequest(`/api/v1/package-manager/search?${params.toString()}`)
      return data.packages || []
    } catch (error) {
      console.error('Error searching packages:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const installPackage = async (
    packageName: string,
    envName: string,
    version?: string,
    channel?: string
  ): Promise<void> => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        package_name: packageName,
        env_name: envName,
      })
      
      if (version) {
        params.append('version', version)
      }
      if (channel) {
        params.append('channel', channel)
      }

      await makeAuthenticatedRequest(`/api/v1/package-manager/install?${params.toString()}`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Error installing package:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const uninstallPackage = async (packageName: string, envName: string): Promise<void> => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        package_name: packageName,
        env_name: envName,
      })

      await makeAuthenticatedRequest(`/api/v1/package-manager/uninstall?${params.toString()}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Error uninstalling package:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    fetchEnvironments,
    fetchPackagesInEnvironment,
    searchPackages,
    installPackage,
    uninstallPackage,
    isLoading,
  }
}
