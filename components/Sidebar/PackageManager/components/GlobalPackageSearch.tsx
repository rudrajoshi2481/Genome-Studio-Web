import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, Download, Package2, AlertCircle } from 'lucide-react'
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
}

interface GlobalPackageSearchProps {
  searchResults: SearchResult[]
  onSearch: (query: string, channel?: string) => void
  onInstallPackage: (packageName: string, version?: string, channel?: string) => void
  selectedEnvironment: string | null
  isLoading: boolean
}

const GlobalPackageSearch: React.FC<GlobalPackageSearchProps> = ({
  searchResults,
  onSearch,
  onInstallPackage,
  selectedEnvironment,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<string>('all')

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    const channel = selectedChannel === 'all' ? undefined : selectedChannel
    onSearch(searchQuery.trim(), channel)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
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

  const commonChannels = [
    { value: 'all', label: 'All Channels' },
    { value: 'conda-forge', label: 'conda-forge' },
    { value: 'bioconda', label: 'bioconda' },
    { value: 'defaults', label: 'defaults' },
    { value: 'anaconda', label: 'anaconda' },
    { value: 'pytorch', label: 'pytorch' },
    { value: 'nvidia', label: 'nvidia' },
  ]

  return (
    <div className="space-y-2">
      {/* Compact Search Controls */}
      <div className="space-y-2">
        <div className="flex space-x-1">
          <Input
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 h-7 text-xs"
          />
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !searchQuery.trim()}
            size="sm"
            className="h-7 px-2"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
        </div>

        <Select value={selectedChannel} onValueChange={setSelectedChannel}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {commonChannels.map((channel) => (
              <SelectItem key={channel.value} value={channel.value}>
                {channel.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Environment Warning */}
      {!selectedEnvironment && (
        <div className="flex items-center space-x-1 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
          <AlertCircle className="h-3 w-3 text-amber-600 flex-shrink-0" />
          <span className="text-amber-700">Select environment first</span>
        </div>
      )}

      {/* Compact Search Results */}
      <div className="space-y-1">
        {searchResults.length === 0 && searchQuery && !isLoading && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">No packages found</p>
          </div>
        )}

        {searchResults.map((pkg) => (
          <div
            key={`${pkg.name}-${pkg.version}-${pkg.channel}`}
            className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted/50 text-xs"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <span className="font-medium truncate">{pkg.name}</span>
                <span className="text-muted-foreground">{pkg.version}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1 rounded">{pkg.channel}</span>
              </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  disabled={isLoading || !selectedEnvironment}
                >
                  <Download className="h-3 w-3" />
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
        ))}
      </div>

      {/* Compact Instructions */}
      {searchResults.length === 0 && !searchQuery && (
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground">Search for packages to install</p>
        </div>
      )}
    </div>
  )
}

export default GlobalPackageSearch
