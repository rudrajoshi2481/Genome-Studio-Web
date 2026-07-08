interface Environment {
  name: string
  path: string
  is_active: boolean
  type?: string
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

interface SearchResponse {
  packages: SearchResult[]
  is_wildcard: boolean
  total_count: number
  count: number
}

import { host } from '@/config/server'
import { port } from '@/config/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `http://${host}:${port}`

export const usePackageManager = () => {
  const getAuthToken = () => {
    if (typeof window === 'undefined') {
      return null
    }
    
    // Get token from cookies using the correct storage key
    const cookies = document.cookie.split(';')
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('bioinformatics_studio_token='))
    
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
    const data = await makeAuthenticatedRequest('/api/v1/package-manager/environments')
    return data.environments || []
  }

  const fetchPackagesInEnvironment = async (envName: string): Promise<Package[]> => {
    const data = await makeAuthenticatedRequest(`/api/v1/package-manager/environments/${encodeURIComponent(envName)}/packages`)
    return data.packages || []
  }

  const searchPackages = async (query: string, channel?: string, envName?: string, signal?: AbortSignal): Promise<{ packages: SearchResult[]; isWildcard: boolean; totalCount: number }> => {
    const params = new URLSearchParams({ query })
    if (channel) {
      params.append('channel', channel)
    }
    if (envName) {
      params.append('env_name', envName)
    }
    
    const data = await makeAuthenticatedRequest(`/api/v1/package-manager/search?${params.toString()}`, { signal })
    return {
      packages: data.packages || [],
      isWildcard: data.is_wildcard || false,
      totalCount: data.total_count || 0,
    }
  }

  const installPackage = async (
    packageName: string,
    envName: string,
    version?: string,
    channel?: string
  ): Promise<{ message: string; package: string; environment: string }> => {
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

    return await makeAuthenticatedRequest(`/api/v1/package-manager/install?${params.toString()}`, {
      method: 'POST',
    })
  }

  const uninstallPackage = async (packageName: string, envName: string): Promise<void> => {
    const params = new URLSearchParams({
      package_name: packageName,
      env_name: envName,
    })

    await makeAuthenticatedRequest(`/api/v1/package-manager/uninstall?${params.toString()}`, {
      method: 'DELETE',
    })
  }

  const installBatch = async (
    packageNames: string[],
    envName: string,
    channel?: string
  ): Promise<void> => {
    const params = new URLSearchParams({
      package_names: packageNames.join(','),
      env_name: envName,
    })
    if (channel) {
      params.append('channel', channel)
    }

    await makeAuthenticatedRequest(`/api/v1/package-manager/install-batch?${params.toString()}`, {
      method: 'POST',
    })
  }

  const createEnvironment = async (envName: string, pythonVersion?: string): Promise<void> => {
    const params = new URLSearchParams({
      env_name: envName,
    })
    if (pythonVersion) {
      params.append('python_version', pythonVersion)
    }

    await makeAuthenticatedRequest(`/api/v1/package-manager/create-environment?${params.toString()}`, {
      method: 'POST',
    })
  }

  const createVenv = async (envName: string, pythonVersion?: string): Promise<void> => {
    const params = new URLSearchParams({
      env_name: envName,
    })
    if (pythonVersion) {
      params.append('python_version', pythonVersion)
    }

    await makeAuthenticatedRequest(`/api/v1/package-manager/create-venv?${params.toString()}`, {
      method: 'POST',
    })
  }

  const deleteEnvironment = async (envName: string): Promise<void> => {
    await makeAuthenticatedRequest(`/api/v1/package-manager/environments/${encodeURIComponent(envName)}`, {
      method: 'DELETE',
    })
  }

  return {
    fetchEnvironments,
    fetchPackagesInEnvironment,
    searchPackages,
    installPackage,
    installBatch,
    uninstallPackage,
    createEnvironment,
    createVenv,
    deleteEnvironment,
  }
}
