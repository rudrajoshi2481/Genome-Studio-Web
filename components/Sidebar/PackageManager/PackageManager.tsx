import React, { useState, useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { RefreshCw, PackageSearch as PackageSearchIcon, Loader2, CheckCircle2, AlertCircle, Puzzle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea as DialogScrollArea } from '@/components/ui/scroll-area'
import EnvironmentList from './components/EnvironmentList'
import PackageSearch from './components/PackageSearch'
import CreateEnvironmentDialog from './components/CreateEnvironmentDialog'
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient'

import { usePackageManager } from './hooks/usePackageManager'
import GlobalPackageSearch from './components/GlobalPackageSearch'
import { host, port, getApiBaseUrl } from '@/config/server'
import * as authService from '@/lib/services/auth-service'

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

function PackageManager() {
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null)
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isWildcard, setIsWildcard] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoadingEnvs, setIsLoadingEnvs] = useState(false)
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSearchQuery, setLastSearchQuery] = useState<string | null>(null)
  const [installLogs, setInstallLogs] = useState<{ timestamp: string; message: string; type: 'info' | 'success' | 'error' }[]>([])
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle')
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [extensionInstalledEnvs, setExtensionInstalledEnvs] = useState<Record<string, { submissionTitle: string; condaEnvs: string[] }>>({})
  const searchAbortRef = useRef<AbortController | null>(null)

  const stopSearch = () => {
    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
      searchAbortRef.current = null
    }
    setIsSearching(false)
  }

  const addInstallLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setInstallLogs(prev => [...prev, { timestamp, message, type }])
  }

  // Auto-clear install status after 5 seconds
  useEffect(() => {
    if (installStatus === 'success' || installStatus === 'error') {
      const timer = setTimeout(() => setInstallStatus('idle'), 5000)
      return () => clearTimeout(timer)
    }
  }, [installStatus])

  const selectedEnvType = environments.find(e => e.name === selectedEnvironment)?.type || 'conda'

  const { 
    fetchEnvironments, 
    fetchPackagesInEnvironment, 
    searchPackages,
    installPackage,
    installBatch,
    uninstallPackage,
    createEnvironment,
    createVenv,
    deleteEnvironment
  } = usePackageManager()

  // Load environments on component mount
  useEffect(() => {
    loadEnvironments()
    loadExtensionInstalledEnvs()
  }, [])

  // Listen for extension install events
  useEffect(() => {
    const handler = () => loadExtensionInstalledEnvs()
    window.addEventListener('extension-installed', handler)
    return () => window.removeEventListener('extension-installed', handler)
  }, [])

  const loadExtensionInstalledEnvs = async () => {
    try {
      const token = authService.getToken()
      if (!token) {
        console.warn('[PackageManager] No auth token, skipping extension envs load')
        return
      }
      const resp = await fetch(`${getApiBaseUrl()}/genomic-hub/installed/list`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      })
      if (!resp.ok) {
        console.warn('[PackageManager] Failed to load extension installed envs:', resp.status)
        return
      }
      const data = await resp.json()
      const map: Record<string, { submissionTitle: string; condaEnvs: string[] }> = {}
      for (const item of data.installed || []) {
        for (const envName of item.condaEnvs || []) {
          map[envName] = { submissionTitle: item.submissionTitle, condaEnvs: item.condaEnvs }
        }
      }
      console.log('[PackageManager] Loaded extension installed envs:', map)
      setExtensionInstalledEnvs(map)
    } catch (e) {
      console.error('[PackageManager] Failed to load extension installed envs:', e)
    }
  }

  const loadEnvironments = async () => {
    try {
      setIsLoadingEnvs(true)
      setError(null)
      const envs = await fetchEnvironments()
      setEnvironments(envs)
      
      // Auto-select first environment and load its packages
      if (envs.length > 0 && !selectedEnvironment) {
        const firstEnv = envs[0].name
        setSelectedEnvironment(firstEnv)
        // Load packages for the first environment
        try {
          setIsLoadingPackages(true)
          const pkgs = await fetchPackagesInEnvironment(firstEnv)
          setPackages(pkgs)
        } catch (err) {
          console.error('Error loading packages for first env:', err)
        } finally {
          setIsLoadingPackages(false)
        }
      }
    } catch (err) {
      setError('Failed to load environments')
      console.error('Error loading environments:', err)
    } finally {
      setIsLoadingEnvs(false)
    }
  }

  const handleEnvironmentSelect = async (envName: string) => {
    // Abort any ongoing search
    stopSearch()
    setSelectedEnvironment(envName)
    try {
      setIsLoadingPackages(true)
      setError(null)
      const pkgs = await fetchPackagesInEnvironment(envName)
      setPackages(pkgs)
    } catch (err) {
      setError(`Failed to load packages for ${envName}`)
      console.error('Error loading packages:', err)
    } finally {
      setIsLoadingPackages(false)
    }

    // Clear search results when switching environments — user must press search again
    setSearchResults([])
    setLastSearchQuery(null)
  }

  const handleGlobalSearch = async (query: string, channel?: string) => {
    // Abort any previous search
    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
    }
    const controller = new AbortController()
    searchAbortRef.current = controller
    
    setLastSearchQuery(query)
    try {
      setIsSearching(true)
      setError(null)
      const result = await searchPackages(query, channel, selectedEnvironment || undefined, controller.signal)
      setSearchResults(result.packages)
      setIsWildcard(result.isWildcard)
      setTotalCount(result.totalCount)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Search was cancelled — ignore
        return
      }
      setError(`Failed to search for packages: ${query}`)
      console.error('Error searching packages:', err)
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null
      }
      setIsSearching(false)
    }
  }

  const handleInstallBatch = async (packageNames: string[], channel?: string) => {
    if (!selectedEnvironment) {
      setError('Please select an environment first')
      return
    }

    const savedQuery = lastSearchQuery
    setInstallLogs([])
    setInstallStatus('installing')
    setIsInstalling(true)
    addInstallLog(`Batch installing ${packageNames.length} package(s): ${packageNames.join(', ')}`)
    try {
      setError(null)
      await installBatch(packageNames, selectedEnvironment, channel)
      addInstallLog(`Successfully installed all packages`, 'success')
      setInstallStatus('success')
      
      // Refresh packages in current environment
      await handleEnvironmentSelect(selectedEnvironment)
      
      // Re-run search to update Installed badges
      if (savedQuery) {
        await handleGlobalSearch(savedQuery)
      }
    } catch (err) {
      addInstallLog(`Failed to install batch packages: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
      setInstallStatus('error')
      setError(`Failed to install batch packages`)
      console.error('Error batch installing packages:', err)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleInstallPackage = async (packageName: string, version?: string, channel?: string) => {
    if (!selectedEnvironment) {
      setError('Please select an environment first')
      return
    }

    const savedQuery = lastSearchQuery
    setInstallLogs([])
    setInstallStatus('installing')
    setIsInstalling(true)
    addInstallLog(`Installing ${packageName} in ${selectedEnvironment}...`)
    try {
      setError(null)
      const result = await installPackage(packageName, selectedEnvironment, version, channel)
      addInstallLog(result.message || `Successfully installed ${packageName}`, 'success')
      setInstallStatus('success')
      
      // Refresh packages in current environment
      await handleEnvironmentSelect(selectedEnvironment)
      
      // Re-run search to update Installed badges
      if (savedQuery) {
        await handleGlobalSearch(savedQuery)
      }
    } catch (err) {
      addInstallLog(`Failed to install ${packageName}: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
      setInstallStatus('error')
      setError(`Failed to install ${packageName}`)
      console.error('Error installing package:', err)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleUninstallPackage = async (packageName: string) => {
    if (!selectedEnvironment) {
      setError('Please select an environment first')
      return
    }

    const savedQuery = lastSearchQuery
    setInstallLogs([])
    setInstallStatus('installing')
    setIsInstalling(true)
    addInstallLog(`Uninstalling ${packageName} from ${selectedEnvironment}...`)
    try {
      setError(null)
      await uninstallPackage(packageName, selectedEnvironment)
      addInstallLog(`Successfully uninstalled ${packageName}`, 'success')
      setInstallStatus('success')
      
      // Refresh packages in current environment
      await handleEnvironmentSelect(selectedEnvironment)
      
      // Re-run search to update Installed badges
      if (savedQuery) {
        await handleGlobalSearch(savedQuery)
      }
    } catch (err) {
      addInstallLog(`Failed to uninstall ${packageName}: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
      setInstallStatus('error')
      setError(`Failed to uninstall ${packageName}`)
      console.error('Error uninstalling package:', err)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDeleteEnvironment = async (envName: string) => {
    try {
      setError(null)
      await deleteEnvironment(envName)
      if (selectedEnvironment === envName) {
        setSelectedEnvironment(null)
        setPackages([])
      }
      await loadEnvironments()
    } catch (err) {
      setError(`Failed to delete environment: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Error deleting environment:', err)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageSearchIcon className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-xs font-medium">Package Manager</h1>
            {installStatus !== 'idle' && (
              <button
                onClick={() => setShowInstallDialog(true)}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                title={installStatus === 'installing' ? 'Installing... Click to view logs' : installStatus === 'success' ? 'Successfully installed. Click to view logs' : 'Installation failed. Click to view logs'}
              >
                {installStatus === 'installing' && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                )}
                {installStatus === 'success' && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
                {installStatus === 'error' && (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedEnvironment && (
              <span className="text-xs text-muted-foreground">{selectedEnvironment}</span>
            )}
            <CreateEnvironmentDialog
              onCreate={async (envName, pythonVersion, envType) => {
                if (envType === 'conda') {
                  await createEnvironment(envName, pythonVersion)
                } else if (envType === 'venv') {
                  await createVenv(envName, pythonVersion)
                } else if (envType === 'r') {
                  await createEnvironment(envName, pythonVersion)
                }
                await loadEnvironments()
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={loadEnvironments}
              title="Refresh"
            >
              <RefreshCw className={cn('h-3 w-3', isLoadingEnvs && 'animate-spin')} />
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="vertical" className="h-full">
          {/* Environments */}
          <ResizablePanel defaultSize={20} minSize={10} maxSize={50}>
            <div className="h-full flex flex-col">
              <div className="px-3 py-1.5 bg-muted/30 border-b flex-shrink-0">
                <span className="text-xs font-medium">Environments ({environments.length})</span>
              </div>
              <div className="flex-1 p-2 min-h-0">
                <ScrollArea className="h-full">
                  <EnvironmentList
                    environments={environments}
                    selectedEnvironment={selectedEnvironment}
                    onEnvironmentSelect={handleEnvironmentSelect}
                    isLoading={isLoadingEnvs}
                    extensionInstalledEnvs={extensionInstalledEnvs}
                    onDeleteEnvironment={handleDeleteEnvironment}
                  />
                </ScrollArea>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Installed Packages */}
          <ResizablePanel defaultSize={40} minSize={15} maxSize={70}>
            <div className="h-full flex flex-col">
              <div className="px-3 py-1.5 bg-muted/30 border-b flex-shrink-0">
                <span className="text-xs font-medium">
                  Installed ({packages.length})
                  {selectedEnvironment && <span className="text-muted-foreground"> in {selectedEnvironment}</span>}
                </span>
              </div>
              <div className="flex-1 p-2 min-h-0">
                <ScrollArea className="h-full">
                  <PackageSearch
                    packages={packages}
                    selectedEnvironment={selectedEnvironment}
                    onUninstallPackage={handleUninstallPackage}
                    isLoading={isLoadingPackages}
                  />
                </ScrollArea>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Search & Install */}
          <ResizablePanel defaultSize={40} minSize={15} maxSize={70}>
            <div className="h-full flex flex-col">
              <div className="px-3 py-1.5 bg-muted/30 border-b flex-shrink-0">
                <span className="text-xs font-medium">
                  Search &amp; Install
                  {searchResults.length > 0 && <span className="text-muted-foreground"> ({searchResults.length})</span>}
                </span>
              </div>
              <div className="flex-1 p-2 min-h-0">
                <ScrollArea className="h-full">
                  <GlobalPackageSearch
                    searchResults={searchResults}
                    isWildcard={isWildcard}
                    totalCount={totalCount}
                    onSearch={handleGlobalSearch}
                    onStopSearch={stopSearch}
                    onInstallPackage={handleInstallPackage}
                    onInstallBatch={handleInstallBatch}
                    selectedEnvironment={selectedEnvironment}
                    isSearching={isSearching}
                    isInstalling={isInstalling}
                    installedPackageNames={packages.map(p => p.name)}
                    envType={selectedEnvType}
                  />
                </ScrollArea>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Install Logs Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {installStatus === 'installing' && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
              {installStatus === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
              {installStatus === 'error' && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
              Installation Logs
            </DialogTitle>
          </DialogHeader>
          <DialogScrollArea className="h-[200px] w-full rounded-md border p-2">
            <div className="space-y-1">
              {installLogs.length === 0 && (
                <p className="text-xs text-muted-foreground">No logs available.</p>
              )}
              {installLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground font-mono text-[10px] flex-shrink-0">{log.timestamp}</span>
                  <span className={
                    log.type === 'success' ? 'text-green-600 dark:text-green-400' :
                    log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                    'text-foreground'
                  }>
                    {log.message}
                  </span>
                </div>
              ))}
              {installStatus === 'installing' && (
                <div className="flex items-center gap-1.5 text-xs text-blue-500 pt-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Working...</span>
                </div>
              )}
            </div>
          </DialogScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PackageManager