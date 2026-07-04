import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Search, Download, Package2, AlertCircle, Calendar, HardDrive, Layers, Sparkles, CheckCircle2, Square } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface SearchResult {
  name: string
  version: string
  build: string
  channel: string
  subdir: string
  size: number
  timestamp: number
  all_versions: number
  description?: string
}

interface GlobalPackageSearchProps {
  searchResults: SearchResult[]
  isWildcard: boolean
  totalCount: number
  onSearch: (query: string, channel?: string) => void
  onStopSearch: () => void
  onInstallPackage: (packageName: string, version?: string, channel?: string) => void
  onInstallBatch: (packageNames: string[], channel?: string) => void
  selectedEnvironment: string | null
  isSearching: boolean
  isInstalling: boolean
  installedPackageNames: string[]
  envType: string
}

const GlobalPackageSearch: React.FC<GlobalPackageSearchProps> = ({
  searchResults,
  isWildcard,
  totalCount,
  onSearch,
  onStopSearch,
  onInstallPackage,
  onInstallBatch,
  selectedEnvironment,
  isSearching,
  isInstalling,
  installedPackageNames,
  envType
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [installingBatch, setInstallingBatch] = useState(false)
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)

  const installedSet = new Set(installedPackageNames.map(n => n.toLowerCase()))
  const isSystemPM = envType === 'linux' || envType === 'mac' || envType === 'r'

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    onSearch(searchQuery.trim())
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleInstallAll = async () => {
    setShowBatchConfirm(false)
    if (!selectedEnvironment || searchResults.length === 0) return
    const packageNames = searchResults.map(p => p.name)
    setInstallingBatch(true)
    try {
      await onInstallBatch(packageNames)
    } finally {
      setInstallingBatch(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown'
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="space-y-2">
      {/* Search Controls — search bar | search button in one row */}
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="e.g. *gatk*"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-7 h-7 text-xs"
          />
        </div>
        
        <Button 
          onClick={isSearching ? onStopSearch : handleSearch} 
          disabled={!isSearching && !searchQuery.trim()}
          size="sm"
          className="h-7 px-2 flex-shrink-0"
        >
          {isSearching ? (
            <Square className="h-3 w-3 fill-current" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Loading warning / Wildcard hint */}
      {isSearching ? (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-500 px-1">
          <AlertCircle className="h-2.5 w-2.5" />
          <span>{isSystemPM ? 'Searching system packages — this may take a moment...' : 'Searching all channels — conda can be slow, this may take a moment...'}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
          <Sparkles className="h-2.5 w-2.5" />
          <span>{isSystemPM ? 'Tip: search by package name, e.g. tree or btop' : <>Tip: use <code className="font-mono bg-muted px-0.5 rounded">*scikit*</code> to find all matching packages</>}</span>
        </div>
      )}

      {/* Environment Warning */}
      {!selectedEnvironment && (
        <div className="flex items-center gap-1.5 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md text-xs">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          <span className="text-amber-700 dark:text-amber-400">Select an environment first</span>
        </div>
      )}

      {/* Batch Install Bar */}
      {searchResults.length > 0 && selectedEnvironment && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Layers className="h-3 w-3" />
            <span>
              {searchResults.length} package{searchResults.length !== 1 ? 's' : ''}
              {isWildcard && totalCount > searchResults.length && ` (of ${totalCount})`}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] gap-1"
            disabled={isInstalling || installingBatch || !selectedEnvironment}
            onClick={() => setShowBatchConfirm(true)}
          >
            {installingBatch ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            Install All
          </Button>
        </div>
      )}

      {/* Batch Install Confirmation */}
      <AlertDialog open={showBatchConfirm} onOpenChange={setShowBatchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Install All Packages</AlertDialogTitle>
            <AlertDialogDescription>
              Install all <strong>{searchResults.length}</strong> packages
              {isWildcard && totalCount > searchResults.length && ` (showing ${searchResults.length} of ${totalCount})`}
              into <strong>{selectedEnvironment}</strong>?
              <br /><br />
              <span className="text-muted-foreground">This will run: <code className="font-mono text-xs">conda install -n {selectedEnvironment} {searchResults.slice(0, 5).map(p => p.name).join(' ')}{searchResults.length > 5 ? ' ...' : ''}</code></span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInstallAll}
              className="bg-green-600 hover:bg-green-700"
            >
              Install All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search Results */}
      <div className="space-y-1">
        {searchResults.length === 0 && searchQuery && !isSearching && (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Package2 className="h-5 w-5 mb-1 opacity-50" />
            <p className="text-xs">No packages found</p>
          </div>
        )}

        {searchResults.map((pkg) => {
          const isInstalled = installedSet.has(pkg.name.toLowerCase())
          return (
          <div
            key={`${pkg.name}-${pkg.version}-${pkg.channel}`}
            className="rounded-lg border p-2 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate">{pkg.name}</span>
                  {pkg.version && (
                    <span className="font-mono text-[9px] text-muted-foreground">{pkg.version}</span>
                  )}
                  {pkg.size > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <HardDrive className="h-2.5 w-2.5" />
                      {formatSize(pkg.size)}
                    </span>
                  )}
                  {isInstalled && (
                    <Badge className="text-[9px] h-4 px-1 bg-green-600 text-white hover:bg-green-600">
                      Installed
                    </Badge>
                  )}
                </div>
                {pkg.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">{pkg.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                    {pkg.channel}
                  </Badge>
                  {pkg.timestamp > 0 && (
                    <>
                      <Separator orientation="vertical" className="h-2.5" />
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDate(pkg.timestamp)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                    disabled={isInstalling || installingBatch || !selectedEnvironment || isInstalled}
                  >
                    {isInstalling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isInstalled ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Install Package</AlertDialogTitle>
                    <AlertDialogDescription>
                      Install <strong>{pkg.name} {pkg.version}</strong> from <strong>{pkg.channel}</strong> into <strong>{selectedEnvironment}</strong>?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onInstallPackage(pkg.name, pkg.version, pkg.channel)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Install
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          )
        })}
      </div>

      {/* Empty State */}
      {searchResults.length === 0 && !searchQuery && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Package2 className="h-6 w-6 mb-1.5 opacity-50" />
          <p className="text-xs">Search for packages to install</p>
        </div>
      )}
    </div>
  )
}

export default GlobalPackageSearch
