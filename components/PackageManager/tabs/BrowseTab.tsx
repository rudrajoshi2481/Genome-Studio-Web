"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, Search, Package, Boxes, Download, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Package as PackageType,
  PackageDetail,
  listPackages,
  getPackage,
  installPackage,
  InstallResult,
  getPackageIconUrl,
} from '@/lib/services/package-manager-service'

interface BrowseTabProps {
  onOpenPackage?: (pkg: PackageDetail) => void
}

export default function BrowseTab({ onOpenPackage }: BrowseTabProps) {
  const [packages, setPackages] = useState<PackageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [installingIds, setInstallingIds] = useState<Set<number>>(new Set())
  const [installResult, setInstallResult] = useState<{ pkg: PackageType; result: InstallResult } | null>(null)

  const loadPackages = useCallback(async () => {
    setIsLoading(true)
    try {
      const pkgs = await listPackages(searchQuery ? { q: searchQuery } : undefined)
      setPackages(pkgs)
    } catch (err: any) {
      toast.error(`Failed to load packages: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => loadPackages(), 300)
    return () => clearTimeout(timer)
  }, [loadPackages])

  const handleInstall = async (pkg: PackageType) => {
    if (installingIds.has(pkg.id)) return
    if (!pkg.latest_version) {
      toast.error(`"${pkg.display_name}" has no published versions`)
      return
    }
    setInstallingIds(prev => new Set(prev).add(pkg.id))
    try {
      const result = await installPackage(pkg.id)
      setInstallResult({ pkg, result })
      if (result.failed === 0) {
        toast.success(`Installed "${pkg.display_name}" — ${result.installed} node(s) added to your Nodebar`)
      } else {
        toast.warning(`Installed ${result.installed}/${result.total} nodes from "${pkg.display_name}"`)
      }
      // Notify InstalledTab to refresh
      window.dispatchEvent(new Event('package-installed'))
    } catch (err: any) {
      toast.error(`Install failed: ${err.message}`)
    } finally {
      setInstallingIds(prev => {
        const next = new Set(prev)
        next.delete(pkg.id)
        return next
      })
    }
  }

  const handleOpen = async (pkg: PackageType) => {
    try {
      const detail = await getPackage(pkg.id)
      if (onOpenPackage) {
        onOpenPackage(detail)
      }
    } catch (err: any) {
      toast.error(`Failed to load package: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Search bar */}
      <div className="flex-shrink-0 px-4 py-2 border-b">
        <div className="relative max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Package grid */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : packages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Boxes className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs font-medium">No packages found</p>
                <p className="text-[11px] mt-1">
                  {searchQuery ? 'Try a different search' : 'Create one with the "New Project" button'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {packages.map(pkg => (
                  <BrowsePackageCard
                    key={pkg.id}
                    pkg={pkg}
                    isInstalling={installingIds.has(pkg.id)}
                    onOpen={() => handleOpen(pkg)}
                    onInstall={() => handleInstall(pkg)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Install result dialog */}
      {installResult && (
        <InstallResultDialog
          pkg={installResult.pkg}
          result={installResult.result}
          onClose={() => setInstallResult(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Browse Package Card — compact VS Code-style tile
// ---------------------------------------------------------------------------
function BrowsePackageCard({
  pkg, isInstalling, onOpen, onInstall,
}: {
  pkg: PackageType
  isInstalling: boolean
  onOpen: () => void
  onInstall: () => void
}) {
  const hasPublished = !!pkg.latest_version
  return (
    <div
      className="group relative flex items-center gap-2.5 rounded-md border bg-card px-2.5 py-2 hover:border-primary/40 hover:bg-accent/30 transition-colors cursor-pointer"
      onClick={onOpen}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden">
        {pkg.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getPackageIconUrl(pkg.id)} alt={pkg.display_name} className="w-full h-full object-cover" />
        ) : (
          <Package className="h-4 w-4 text-primary/70" />
        )}
      </div>

      {/* Name + version + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{pkg.display_name}</span>
          {pkg.latest_version && (
            <span className="text-[9px] text-muted-foreground font-mono flex-shrink-0">v{pkg.latest_version}</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {pkg.description || 'No description'}
        </p>
        {/* Tags inline */}
        {pkg.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            {pkg.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] text-muted-foreground/70">{tag}</span>
            ))}
            {pkg.tags.length > 2 && (
              <span className="text-[9px] text-muted-foreground/50">+{pkg.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Install button — appears on hover, always visible on touch */}
      <Button
        size="sm"
        variant={hasPublished ? "secondary" : "ghost"}
        className="flex-shrink-0 h-6 px-2 text-[10px] gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onInstall() }}
        disabled={isInstalling || !hasPublished}
      >
        {isInstalling ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : hasPublished ? (
          <>
            <Download className="h-3 w-3" />
            Install
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">No version</span>
        )}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Install Result Dialog — shows which nodes were installed
// ---------------------------------------------------------------------------
function InstallResultDialog({
  pkg, result, onClose,
}: {
  pkg: PackageType
  result: InstallResult
  onClose: () => void
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[40vw] max-w-[50vw] p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Install Result — {pkg.display_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Total Nodes</p>
              <p className="text-sm font-semibold">{result.total}</p>
            </div>
            <div className="rounded-md border p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Installed</p>
              <p className="text-sm font-semibold text-green-600">{result.installed}</p>
            </div>
            <div className="rounded-md border p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Failed</p>
              <p className="text-sm font-semibold text-red-600">{result.failed}</p>
            </div>
          </div>

          {/* Node results */}
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {result.results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-[11px] rounded-md border px-2 py-1.5 ${
                  r.status === 'success' ? 'border-green-500/30 bg-green-500/5' :
                  r.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                  'border-muted'
                }`}
              >
                {r.status === 'success' ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : (
                  <span className="text-red-500 flex-shrink-0">!</span>
                )}
                <span className="font-medium flex-1 truncate">{r.title || `Node ${r.index + 1}`}</span>
                {r.error && <span className="text-red-500 text-[10px] truncate max-w-[200px]">{r.error}</span>}
                {r.status === 'success' && (
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 text-green-600 border-green-500/30">
                    Added
                  </Badge>
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Installed nodes are now available in your Nodebar. Restart the workflow editor
            if you don't see them immediately.
          </p>
        </div>

        <DialogFooter>
          <Button size="sm" className="text-xs" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
