import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import EnvironmentList from './components/EnvironmentList'
import PackageSearch from './components/PackageSearch'

import { usePackageManager } from './hooks/usePackageManager'
import GlobalPackageSearch from './components/GlobalPackageSearch'

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

function PackageManager() {
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null)
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { 
    fetchEnvironments, 
    fetchPackagesInEnvironment, 
    searchPackages,
    installPackage,
    uninstallPackage
  } = usePackageManager()

  // Load environments on component mount
  useEffect(() => {
    loadEnvironments()
  }, [])

  const loadEnvironments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const envs = await fetchEnvironments()
      setEnvironments(envs)
      
      // Auto-select first environment if available
      if (envs.length > 0 && !selectedEnvironment) {
        setSelectedEnvironment(envs[0].name)
      }
    } catch (err) {
      setError('Failed to load environments')
      console.error('Error loading environments:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnvironmentSelect = async (envName: string) => {
    setSelectedEnvironment(envName)
    try {
      setIsLoading(true)
      setError(null)
      const pkgs = await fetchPackagesInEnvironment(envName)
      setPackages(pkgs)
    } catch (err) {
      setError(`Failed to load packages for ${envName}`)
      console.error('Error loading packages:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGlobalSearch = async (query: string, channel?: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const results = await searchPackages(query, channel)
      setSearchResults(results)
    } catch (err) {
      setError(`Failed to search for packages: ${query}`)
      console.error('Error searching packages:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInstallPackage = async (packageName: string, version?: string, channel?: string) => {
    if (!selectedEnvironment) {
      setError('Please select an environment first')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      await installPackage(packageName, selectedEnvironment, version, channel)
      
      // Refresh packages in current environment
      await handleEnvironmentSelect(selectedEnvironment)
    } catch (err) {
      setError(`Failed to install ${packageName}`)
      console.error('Error installing package:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUninstallPackage = async (packageName: string) => {
    if (!selectedEnvironment) {
      setError('Please select an environment first')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      await uninstallPackage(packageName, selectedEnvironment)
      
      // Refresh packages in current environment
      await handleEnvironmentSelect(selectedEnvironment)
    } catch (err) {
      setError(`Failed to uninstall ${packageName}`)
      console.error('Error uninstalling package:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-medium">Package Manager</h1>
          {selectedEnvironment && (
            <span className="text-xs text-muted-foreground">{selectedEnvironment}</span>
          )}
        </div>
        {error && (
          <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Compact Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Environments */}
        <div className="border-b">
          <div className="px-3 py-1 bg-muted/30 border-b">
            <span className="text-xs font-medium">Environments ({environments.length})</span>
          </div>
          <div className="h-24 p-2">
            <ScrollArea className="h-full">
              <EnvironmentList
                environments={environments}
                selectedEnvironment={selectedEnvironment}
                onEnvironmentSelect={handleEnvironmentSelect}
                isLoading={isLoading}
              />
            </ScrollArea>
          </div>
        </div>

        {/* Installed Packages */}
        <div className="flex-1 border-b min-h-0 flex flex-col">
          <div className="px-3 py-1 bg-muted/30 border-b flex-shrink-0">
            <span className="text-xs font-medium">
              Installed ({packages.length})
              {selectedEnvironment && <span className="text-muted-foreground"> in {selectedEnvironment}</span>}
            </span>
          </div>
          <div className="flex-1 p-2 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <PackageSearch
                packages={packages}
                selectedEnvironment={selectedEnvironment}
                onUninstallPackage={handleUninstallPackage}
                isLoading={isLoading}
              />
            </ScrollArea>
          </div>
        </div>

        {/* Search & Install */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-3 py-1 bg-muted/30 border-b flex-shrink-0">
            <span className="text-xs font-medium">
              Search & Install
              {searchResults.length > 0 && <span className="text-muted-foreground"> ({searchResults.length})</span>}
            </span>
          </div>
          <div className="flex-1 p-2 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <GlobalPackageSearch
                searchResults={searchResults}
                onSearch={handleGlobalSearch}
                onInstallPackage={handleInstallPackage}
                selectedEnvironment={selectedEnvironment}
                isLoading={isLoading}
              />
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PackageManager