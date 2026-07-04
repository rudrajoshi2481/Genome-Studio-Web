import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Search, Trash2, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
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

interface Package {
  name: string
  version: string
  build: string
  channel: string
  size: number
}

interface PackageSearchProps {
  packages: Package[]
  selectedEnvironment: string | null
  onUninstallPackage: (packageName: string) => void
  isLoading: boolean
}

const PackageSearch: React.FC<PackageSearchProps> = ({
  packages,
  selectedEnvironment,
  onUninstallPackage,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPackages = useMemo(() => {
    if (!searchQuery.trim()) {
      return packages
    }
    
    const query = searchQuery.toLowerCase()
    return packages.filter(pkg => 
      pkg.name.toLowerCase().includes(query) ||
      pkg.channel.toLowerCase().includes(query)
    )
  }, [packages, searchQuery])

  const formatSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  if (!selectedEnvironment) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <Package className="h-6 w-6 mb-1.5 opacity-50" />
        <p className="text-xs">Select an environment</p>
      </div>
    )
  }

  if (isLoading && packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mb-1" />
        <span className="text-xs">Loading packages...</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search installed packages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 h-7 text-xs"
        />
      </div>

      {/* Package List */}
      <div className="space-y-1">
        {filteredPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Package className="h-5 w-5 mb-1 opacity-50" />
            <p className="text-xs">
              {searchQuery ? 'No matches found' : 'No packages installed'}
            </p>
          </div>
        ) : (
          filteredPackages.map((pkg) => (
            <div
              key={`${pkg.name}-${pkg.version}`}
              className="flex items-center justify-between rounded-lg border p-2 hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate">{pkg.name}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 font-mono">
                    {pkg.version}
                  </Badge>
                </div>
                {pkg.channel && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{pkg.channel}</span>
                    {pkg.size > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-2.5" />
                        <span>{formatSize(pkg.size)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Uninstall Package</AlertDialogTitle>
                    <AlertDialogDescription>
                      Uninstall <strong>{pkg.name}</strong> from <strong>{selectedEnvironment}</strong>?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onUninstallPackage(pkg.name)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Uninstall
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default PackageSearch
