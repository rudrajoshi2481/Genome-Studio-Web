"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, Download, Package, Trash2, RefreshCw, CheckCircle2,
  Code2, AlertCircle, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  InstalledPackage,
  listInstalled,
  uninstallPackage,
  getPackageIconUrl,
} from '@/lib/services/package-manager-service'

export default function InstalledTab() {
  const [installed, setInstalled] = useState<InstalledPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uninstallingIds, setUninstallingIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const loadInstalled = useCallback(async () => {
    setIsLoading(true)
    try {
      const records = await listInstalled()
      setInstalled(records)
    } catch (err: any) {
      toast.error(`Failed to load installed packages: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInstalled()
  }, [loadInstalled])

  // Auto-refresh when a package is installed from the Browse tab
  useEffect(() => {
    const handler = () => loadInstalled()
    window.addEventListener('package-installed', handler)
    return () => window.removeEventListener('package-installed', handler)
  }, [loadInstalled])

  const handleUninstall = async (record: InstalledPackage) => {
    if (!confirm(`Uninstall "${record.package_display_name}"? This will remove ${record.node_count} node(s) from your Nodebar.`)) return
    setUninstallingIds(prev => new Set(prev).add(record.id))
    try {
      const result = await uninstallPackage(record.id)
      toast.success(result.message)
      loadInstalled()
    } catch (err: any) {
      toast.error(`Uninstall failed: ${err.message}`)
    } finally {
      setUninstallingIds(prev => {
        const next = new Set(prev)
        next.delete(record.id)
        return next
      })
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return installed
    const q = searchQuery.toLowerCase()
    return installed.filter(r =>
      r.package_display_name.toLowerCase().includes(q) ||
      r.package_name.toLowerCase().includes(q) ||
      (r.install_summary?.results || []).some(res => res.title?.toLowerCase().includes(q))
    )
  }, [installed, searchQuery])

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header with search */}
      <div className="flex-shrink-0 px-4 py-2 border-b flex items-center gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <h2 className="text-xs font-semibold">Installed Packages</h2>
          {installed.length > 0 && (
            <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{installed.length}</Badge>
          )}
        </div>
        {/* Search */}
        <div className="relative flex-1 max-w-[240px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search installed..."
            className="h-7 text-xs pl-7 pr-2"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={loadInstalled}>
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : installed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center mb-3">
                  <Download className="h-6 w-6 opacity-50" />
                </div>
                <p className="text-xs font-medium">No installed packages</p>
                <p className="text-[11px] mt-1 text-center max-w-sm opacity-70">
                  Packages you install from the Browse tab will appear here.
                  You can uninstall them to remove their nodes from your Nodebar.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-5 w-5 mb-2 opacity-50" />
                <p className="text-xs">No packages match "{searchQuery}"</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filtered.map(record => (
                  <InstalledPackageCard
                    key={record.id}
                    record={record}
                    isUninstalling={uninstallingIds.has(record.id)}
                    onUninstall={() => handleUninstall(record)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Installed Package Card — compact flex card matching Browse/My Packages style
// ---------------------------------------------------------------------------
function InstalledPackageCard({
  record, isUninstalling, onUninstall,
}: {
  record: InstalledPackage
  isUninstalling: boolean
  onUninstall: () => void
}) {
  const summary = record.install_summary
  const failedCount = summary?.failed || 0
  const successNodes = summary?.results?.filter(r => r.status === 'success') || []
  const nodeTitles = successNodes.map(r => r.title).join(', ')
  const condaEnvs = record.conda_envs || []
  const [iconError, setIconError] = useState(false)

  return (
    <div
      className="group relative flex flex-col rounded-md border bg-card px-2.5 py-2 hover:border-primary/40 hover:bg-accent/30 transition-colors min-w-[200px] flex-1 max-w-[280px]"
    >
      {/* Top: icon + name + version + checkmark */}
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden">
          {record.icon_url && !iconError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getPackageIconUrl(record.package_id)}
              alt={record.package_display_name}
              className="w-full h-full object-cover"
              onError={() => setIconError(true)}
            />
          ) : (
            <Package className="h-4 w-4 text-primary/70" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">{record.package_display_name}</span>
            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-muted-foreground font-mono">v{record.version}</span>
            <span className="text-[9px] text-muted-foreground/70 flex items-center gap-0.5">
              <Code2 className="h-2.5 w-2.5" />
              {record.node_count}
            </span>
            {failedCount > 0 && (
              <span className="text-[9px] text-amber-600 flex items-center gap-0.5">
                <AlertCircle className="h-2.5 w-2.5" />
                {failedCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Node titles */}
      {nodeTitles && (
        <p className="text-[10px] text-muted-foreground truncate mt-1.5 pl-10">
          {nodeTitles}
        </p>
      )}

      {/* Conda environment badges */}
      {condaEnvs.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 pl-10 flex-wrap">
          {condaEnvs.map(env => (
            <Badge key={env} className="text-[9px] h-3.5 px-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
              conda: {env}
            </Badge>
          ))}
        </div>
      )}

      {/* Uninstall button — appears on hover */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1.5 right-1.5 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
        onClick={onUninstall}
        disabled={isUninstalling}
        title="Uninstall"
      >
        {isUninstalling ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}
