import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Trash2, Package } from 'lucide-react'
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
      <div className="text-center py-2">
        <p className="text-xs text-muted-foreground">Select an environment</p>
      </div>
    )
  }

  if (isLoading && packages.length === 0) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Compact Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          placeholder="Search packages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 h-7 text-xs"
        />
      </div>

      {/* Compact Package List */}
      <div className="space-y-1">
        {filteredPackages.length === 0 ? (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              {searchQuery ? 'No matches' : 'No packages'}
            </p>
          </div>
        ) : (
          filteredPackages.map((pkg) => (
            <div
              key={`${pkg.name}-${pkg.version}`}
              className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted/50 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <span className="font-medium truncate">{pkg.name}</span>
                  <span className="text-muted-foreground">{pkg.version}</span>
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-3 w-3" />
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
