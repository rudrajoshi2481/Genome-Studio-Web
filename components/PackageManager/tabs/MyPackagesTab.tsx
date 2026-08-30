"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2, Plus, Package, Trash2, Edit3,
  Code2, FileText, Tag as TagIcon, Calendar, GitBranch, Upload, Save,
  ArrowLeft, CheckCircle2, Settings2, RefreshCw, AlertTriangle,
  ImageIcon, X, Terminal, Download, FolderTree,
  Cloud, LogIn, LogOut,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Markdown } from '@/components/Sidebar/Traybar/Ai-Chat/components/Markdown'
import { cn } from '@/lib/utils'
import TagInput from '@/components/Sidebar/Nodebar/CustomNode/TagInput'
import NodeEditor from '../NodeEditor'
import CanvasStyleNodeCard from '../CanvasStyleNodeCard'
import {
  Package as PackageType,
  PackageDetail,
  PackageNode,
  PackageFile,
  listLocalPackages as listPackages,
  getLocalPackage as getPackage,
  updateLocalPackage as updatePackage,
  deleteLocalPackage as deletePackage,
  listLocalNodes as listNodes,
  uploadLocalFile as uploadFile,
  deleteLocalFile as deleteFile,
  uploadLocalPackageIcon as uploadPackageIcon,
  deleteLocalPackageIcon as deletePackageIcon,
  getLocalPackageIconUrl as getPackageIconUrl,
  getLocalInstallSh as getInstallSh,
  updateLocalInstallSh as updateInstallSh,
  backupLocalPackages as backupPackages,
  publishLocalPackage,
  PublishResult,
  getLocalTree,
  getLocalFile,
  getLocalReadme,
  updateLocalReadme,
} from '@/lib/services/local-package-manager-service'
import {
  listPackages as listHubPackages,
  getPackage as getHubPackage,
  deletePackage as deleteHubPackage,
  getPackageIconUrl as getHubIconUrl,
  getInstallSh as getHubInstallSh,
  getReadme as getHubReadme,
  getTree as getHubTree,
  getFileByPath as getHubFile,
} from '@/lib/services/package-manager-service'
import FileTreeViewer from '../FileTreeViewer'
import HubSignInDialog from '../HubSignInDialog'
import {
  isHubAuthenticated,
  getHubUser,
  hubLogout,
  type HubUser,
} from '@/lib/services/hub-auth-service'

export default function MyPackagesTab() {
  const [packages, setPackages] = useState<PackageType[]>([])
  const [cloudPackages, setCloudPackages] = useState<PackageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCloud, setIsLoadingCloud] = useState(false)
  const [filter, setFilter] = useState<'all' | 'local' | 'cloud'>('all')
  const [selectedPkg, setSelectedPkg] = useState<PackageDetail | null>(null)
  const [selectedSource, setSelectedSource] = useState<'local' | 'cloud'>('local')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [editingNode, setEditingNode] = useState<PackageNode | null>(null)
  const [isNodeEditorOpen, setIsNodeEditorOpen] = useState(false)
  const [isEditMetadataOpen, setIsEditMetadataOpen] = useState(false)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)

  // Hub auth state
  const [hubAuthed, setHubAuthed] = useState(false)
  const [hubUser, setHubUser] = useState<HubUser | null>(null)
  const [isHubSignInOpen, setIsHubSignInOpen] = useState(false)
  const [pendingPublish, setPendingPublish] = useState(false)

  // Check hub auth on mount
  useEffect(() => {
    setHubAuthed(isHubAuthenticated())
    setHubUser(getHubUser())
  }, [])

  const refreshHubAuth = () => {
    setHubAuthed(isHubAuthenticated())
    setHubUser(getHubUser())
  }

  const loadCloudPackages = useCallback(async () => {
    if (!isHubAuthenticated()) {
      setCloudPackages([])
      return
    }
    setIsLoadingCloud(true)
    try {
      const pkgs = await listHubPackages()
      setCloudPackages(pkgs)
    } catch (err: any) {
      // Silent fail — cloud packages are optional
      console.warn('Failed to load cloud packages:', err.message)
    } finally {
      setIsLoadingCloud(false)
    }
  }, [])

  const handleHubSignedIn = () => {
    refreshHubAuth()
    loadCloudPackages()
    // If the user was trying to publish, open the publish dialog now
    if (pendingPublish) {
      setPendingPublish(false)
      setIsPublishOpen(true)
    }
  }

  const handleHubLogout = () => {
    hubLogout()
    refreshHubAuth()
    setCloudPackages([])
    toast.info('Signed out of Extension Hub')
  }

  // Gate publish behind hub auth
  const handlePublishClick = () => {
    if (!isHubAuthenticated()) {
      setPendingPublish(true)
      setIsHubSignInOpen(true)
    } else {
      setIsPublishOpen(true)
    }
  }

  const loadPackages = useCallback(async () => {
    setIsLoading(true)
    try {
      const pkgs = await listPackages()
      setPackages(pkgs)
    } catch (err: any) {
      toast.error(`Failed to load packages: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPackages()
    if (isHubAuthenticated()) {
      loadCloudPackages()
    }
  }, [loadPackages, loadCloudPackages])

  const loadPackageDetail = async (id: number) => {
    try {
      const detail = await getPackage(id)
      setSelectedPkg(detail)
    } catch (err: any) {
      toast.error(`Failed to load package: ${err.message}`)
    }
  }

  const loadCloudPackageDetail = async (id: number) => {
    try {
      const detail = await getHubPackage(id)
      setSelectedPkg(detail)
    } catch (err: any) {
      toast.error(`Failed to load cloud package: ${err.message}`)
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleOpenPackage = (pkg: PackageType, source: 'local' | 'cloud') => {
    setSelectedSource(source)
    if (source === 'local') {
      loadPackageDetail(pkg.id)
    } else {
      loadCloudPackageDetail(pkg.id)
    }
  }

  const handleBackToList = () => {
    setSelectedPkg(null)
    loadPackages()
    if (isHubAuthenticated()) loadCloudPackages()
  }

  const handleAddNode = () => {
    setEditingNode(null)
    setIsNodeEditorOpen(true)
  }

  const handleEditNode = (node: PackageNode) => {
    setEditingNode(node)
    setIsNodeEditorOpen(true)
  }

  const handleNodeSaved = () => {
    if (selectedPkg) {
      loadPackageDetail(selectedPkg.id)
    }
  }

  const handleDeletePackage = async (pkg: PackageType, source: 'local' | 'cloud') => {
    if (!confirm(`Delete ${source} package "${pkg.display_name}"? This cannot be undone.`)) return
    try {
      if (source === 'local') {
        await deletePackage(pkg.id)
      } else {
        await deleteHubPackage(pkg.id)
      }
      toast.success('Package deleted')
      loadPackages()
      if (isHubAuthenticated()) loadCloudPackages()
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`)
    }
  }

  const handleDeleteCloudPackage = async (pkg: PackageDetail) => {
    if (!confirm(`Delete cloud package "${pkg.display_name}"? This removes it from the Extension Hub permanently.`)) return
    try {
      await deleteHubPackage(pkg.id)
      toast.success('Cloud package deleted')
      setSelectedPkg(null)
      loadPackages()
      if (isHubAuthenticated()) loadCloudPackages()
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`)
    }
  }

  const refreshNodes = async () => {
    if (selectedPkg) {
      // Reload the full package detail so has_unpushed_changes is fresh
      const detail = await getPackage(selectedPkg.id)
      setSelectedPkg(detail)
    }
  }

  const handleBackup = async () => {
    if (isBackingUp) return
    if (packages.length === 0) {
      toast.error('No packages to back up')
      return
    }
    setIsBackingUp(true)
    try {
      await backupPackages()
      toast.success(`Backed up ${packages.length} package${packages.length === 1 ? '' : 's'}`)
    } catch (err: any) {
      toast.error(`Backup failed: ${err.message}`)
    } finally {
      setIsBackingUp(false)
    }
  }

  // Merged list with source tag
  const allPackages = [
    ...packages.map(p => ({ ...p, source: 'local' as const })),
    ...cloudPackages.map(p => ({ ...p, source: 'cloud' as const })),
  ]
  const filteredPackages = filter === 'all' ? allPackages
    : filter === 'local' ? allPackages.filter(p => p.source === 'local')
    : allPackages.filter(p => p.source === 'cloud')

  // --- Detail View ---
  if (selectedPkg) {
    if (selectedSource === 'cloud') {
      return (
        <>
          <CloudPackageDetailView
            pkg={selectedPkg}
            onBack={handleBackToList}
            onDelete={() => handleDeleteCloudPackage(selectedPkg)}
            canDelete={hubAuthed}
          />
          <HubSignInDialog
            isOpen={isHubSignInOpen}
            onClose={() => {
              setIsHubSignInOpen(false)
              setPendingPublish(false)
            }}
            onSignedIn={handleHubSignedIn}
          />
        </>
      )
    }
    return (
      <>
        <PackageDetailView
          pkg={selectedPkg}
          onBack={handleBackToList}
          onAddNode={handleAddNode}
          onEditNode={handleEditNode}
          onEditMetadata={() => setIsEditMetadataOpen(true)}
          onPublish={handlePublishClick}
          hubAuthed={hubAuthed}
          onRefresh={refreshNodes}
        />
        <NodeEditorDialog
          packageId={selectedPkg.id}
          node={editingNode}
          isOpen={isNodeEditorOpen}
          onClose={() => setIsNodeEditorOpen(false)}
          onSaved={handleNodeSaved}
        />
        <EditMetadataDialog
          pkg={selectedPkg}
          isOpen={isEditMetadataOpen}
          onClose={() => setIsEditMetadataOpen(false)}
          onSaved={(updated) => {
            setSelectedPkg(updated)
            loadPackages()
          }}
        />
        <PublishVersionDialog
          pkg={selectedPkg}
          isOpen={isPublishOpen}
          onClose={() => setIsPublishOpen(false)}
          onPublished={() => {
            // Small delay to let the hub service index the new published version
            setTimeout(() => loadPackageDetail(selectedPkg.id), 500)
            loadPackages()
          }}
        />
        <HubSignInDialog
          isOpen={isHubSignInOpen}
          onClose={() => {
            setIsHubSignInOpen(false)
            setPendingPublish(false)
          }}
          onSignedIn={handleHubSignedIn}
          message="You need to sign in to the Extension Hub before publishing."
        />
      </>
    )
  }

  // --- Package List View ---
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b flex items-center justify-between">
        <h2 className="text-xs font-semibold">My Packages</h2>
        <div className="flex items-center gap-1">
          {/* Hub auth status indicator */}
          {hubAuthed && hubUser ? (
            <div className="flex items-center gap-1 mr-2 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <Cloud className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {hubUser.display_name || hubUser.username}
              </span>
              <button
                onClick={handleHubLogout}
                className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                title="Sign out of Extension Hub"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] gap-1 text-muted-foreground"
              onClick={() => setIsHubSignInOpen(true)}
              title="Sign in to Extension Hub to manage cloud packages"
            >
              <LogIn className="h-3.5 w-3.5" />
              Hub Sign in
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleBackup}
            disabled={isBackingUp || isLoading}
            title="Backup all local packages (download as JSON)"
          >
            {isBackingUp ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { loadPackages(); loadCloudPackages() }} title="Refresh">
            <RefreshCw className={cn('h-3.5 w-3.5', (isLoading || isLoadingCloud) && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex-shrink-0 px-4 py-1.5 border-b flex items-center gap-1.5">
        {(['all', 'local', 'cloud'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors capitalize',
              filter === f
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted text-muted-foreground hover:border-primary/40 hover:bg-accent/30'
            )}
          >
            {f === 'all' ? `All (${allPackages.length})` : f === 'local' ? `Local (${packages.length})` : `Cloud (${cloudPackages.length})`}
          </button>
        ))}
        {isLoadingCloud && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs font-medium">
              {filter === 'cloud' && !hubAuthed ? 'Sign in to see cloud packages' : 'No packages yet'}
            </p>
            <p className="text-[11px] mt-1">
              {filter === 'cloud' && !hubAuthed ? 'Click "Hub Sign in" above' : 'Click "New Project" to create one'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {filteredPackages.map(pkg => (
              <PackageListItem
                key={`${pkg.source}-${pkg.id}`}
                pkg={pkg}
                source={pkg.source}
                onOpen={() => handleOpenPackage(pkg, pkg.source)}
                onDelete={() => handleDeletePackage(pkg, pkg.source)}
              />
            ))}
          </div>
        )}
      </div>
      </ScrollArea>
      <HubSignInDialog
        isOpen={isHubSignInOpen}
        onClose={() => {
          setIsHubSignInOpen(false)
          setPendingPublish(false)
        }}
        onSignedIn={handleHubSignedIn}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Package List Item
// ---------------------------------------------------------------------------
function PackageListItem({ pkg, source, onOpen, onDelete }: {
  pkg: PackageType
  source: 'local' | 'cloud'
  onOpen: () => void
  onDelete: () => void
}) {
  const isLocal = source === 'local'
  const iconUrl = isLocal ? getPackageIconUrl(pkg.id) : getHubIconUrl(pkg.id)
  return (
    <div
      className="group relative flex items-center gap-2.5 rounded-md border bg-card px-2.5 py-2 hover:border-primary/40 hover:bg-accent/30 transition-colors cursor-pointer"
      onClick={onOpen}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden">
        {pkg.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt={pkg.display_name} className="w-full h-full object-cover" />
        ) : (
          <Package className="h-4 w-4 text-primary/70" />
        )}
      </div>

      {/* Name + version + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{pkg.display_name}</span>
          {/* Source badge */}
          {isLocal ? (
            <span className="text-[8px] font-medium px-1 py-0 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 flex-shrink-0">LOCAL</span>
          ) : (
            <span className="text-[8px] font-medium px-1 py-0 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex-shrink-0 flex items-center gap-0.5">
              <Cloud className="h-2 w-2" />CLOUD
            </span>
          )}
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

      {/* Delete button — appears on hover */}
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 h-6 w-6 opacity-70 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Package Detail View
// ---------------------------------------------------------------------------
function PackageDetailView({
  pkg, onBack, onAddNode, onEditNode, onEditMetadata, onPublish, onRefresh, hubAuthed,
}: {
  pkg: PackageDetail
  onBack: () => void
  onAddNode: () => void
  onEditNode: (node: PackageNode) => void
  onEditMetadata: () => void
  onPublish: () => void
  onRefresh: () => void
  hubAuthed: boolean
}) {
  const workingVersion = pkg.working_version
  const publishedVersions = pkg.versions.filter(v => v.published)
  const [activeTab, setActiveTab] = useState('readme')
  // "working" = editable working version; otherwise a published version string
  const [selectedVersion, setSelectedVersion] = useState('working')

  // install.sh state
  const [installSh, setInstallSh] = useState('')
  const [installShDraft, setInstallShDraft] = useState('')
  const [isEditingInstall, setIsEditingInstall] = useState(false)
  const [isSavingInstall, setIsSavingInstall] = useState(false)
  const [isLoadingInstall, setIsLoadingInstall] = useState(false)

  // Icon state
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [iconVersion, setIconVersion] = useState(0) // cache-busting for icon URL
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Icon file too large (max 2MB)')
      return
    }
    setIsUploadingIcon(true)
    try {
      await uploadPackageIcon(pkg.id, file)
      setIconVersion(v => v + 1)
      toast.success('Icon updated')
    } catch (err: any) {
      toast.error(`Failed to upload icon: ${err.message}`)
    } finally {
      setIsUploadingIcon(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleIconDelete = async () => {
    setIsUploadingIcon(true)
    try {
      await deletePackageIcon(pkg.id)
      setIconVersion(v => v + 1)
      toast.success('Icon removed')
    } catch (err: any) {
      toast.error(`Failed to remove icon: ${err.message}`)
    } finally {
      setIsUploadingIcon(false)
    }
  }

  // README.md editing state
  const [readme, setReadme] = useState('')
  const [readmeDraft, setReadmeDraft] = useState('')
  const [isLoadingReadme, setIsLoadingReadme] = useState(false)
  const [isEditingReadme, setIsEditingReadme] = useState(false)
  const [isSavingReadme, setIsSavingReadme] = useState(false)
  const [readmeEditorMode, setReadmeEditorMode] = useState<'write' | 'preview'>('write')

  // install.sh handlers
  const handleLoadInstallSh = async () => {
    setIsLoadingInstall(true)
    try {
      const result = await getInstallSh(pkg.id)
      setInstallSh(result.content)
      setInstallShDraft(result.content)
    } catch (err: any) {
      toast.error(`Failed to load install.sh: ${err.message}`)
    } finally {
      setIsLoadingInstall(false)
    }
  }

  const handleEditInstallSh = () => {
    setInstallShDraft(installSh)
    setIsEditingInstall(true)
  }

  const handleSaveInstallSh = async () => {
    setIsSavingInstall(true)
    try {
      await updateInstallSh(pkg.id, installShDraft)
      setInstallSh(installShDraft)
      setIsEditingInstall(false)
      toast.success('install.sh updated')
      onRefresh()
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`)
    } finally {
      setIsSavingInstall(false)
    }
  }

  const handleCancelInstallSh = () => {
    setIsEditingInstall(false)
    setInstallShDraft(installSh)
  }

  // Load install.sh on mount
  useEffect(() => {
    handleLoadInstallSh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg.id])

  // README handlers
  const handleLoadReadme = async () => {
    setIsLoadingReadme(true)
    try {
      const result = await getLocalReadme(pkg.id)
      setReadme(result.content)
      setReadmeDraft(result.content)
    } catch (err: any) {
      toast.error(`Failed to load README: ${err.message}`)
    } finally {
      setIsLoadingReadme(false)
    }
  }

  const handleEditReadme = () => {
    setReadmeDraft(readme)
    setReadmeEditorMode('write')
    setIsEditingReadme(true)
  }

  const handleSaveReadme = async () => {
    setIsSavingReadme(true)
    try {
      await updateLocalReadme(pkg.id, readmeDraft)
      setReadme(readmeDraft)
      setIsEditingReadme(false)
      toast.success('README.md updated')
      onRefresh()
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`)
    } finally {
      setIsSavingReadme(false)
    }
  }

  const handleCancelReadme = () => {
    setIsEditingReadme(false)
    setReadmeDraft(readme)
  }

  // Load README on mount
  useEffect(() => {
    handleLoadReadme()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg.id])

  // The version data currently being displayed
  const selectedVersionData = selectedVersion === 'working'
    ? workingVersion
    : publishedVersions.find(v => v.version === selectedVersion)
  const isWorkingSelected = selectedVersion === 'working'

  // Detect unpublished changes by comparing the working version against the
  // latest published version. If anything differs (or there is no published
  // version yet), the draft banner is shown.
  // Find the latest published version — try latest_version field first, then
  // fall back to sorting by semver.
  const latestPublished = (() => {
    if (publishedVersions.length === 0) return undefined
    const byLatest = publishedVersions.find(v => v.version === pkg.latest_version)
    if (byLatest) return byLatest
    // Sort by semver descending
    return [...publishedVersions].sort((a, b) => {
      try {
        const ap = a.version.split('.').map(Number)
        const bp = b.version.split('.').map(Number)
        for (let i = 0; i < 3; i++) {
          const d = (bp[i] || 0) - (ap[i] || 0)
          if (d !== 0) return d
        }
        return 0
      } catch {
        return b.version.localeCompare(a.version)
      }
    })[0]
  })()
  // Use the backend's git-based check: HEAD commit vs latest tag commit
  const hasUnpublishedChanges = pkg.has_unpushed_changes ?? true

  return (
    <div className="h-full flex flex-col">
      {/* ── Top bar: back ── */}
      <div className="flex-shrink-0 flex items-center px-4 py-2 border-b">
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
      </div>

      {/* ── Scrollable content ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Draft banner — only shown when viewing the working version AND
              there are unpublished changes compared to the latest published version */}
          {isWorkingSelected && hasUnpublishedChanges && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-green-700 dark:text-green-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium">
                You are viewing a draft (local, unpublished). Changes here are tracked by git but not yet pushed to the Extension Hub.
              </span>
            </div>
          )}
          {/* Package Header */}
          <div className="flex items-start gap-3 rounded-lg bg-card p-4">
            {/* Icon with upload overlay */}
            <div className="flex-shrink-0 relative group/icon">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                {pkg.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${getPackageIconUrl(pkg.id)}?v=${iconVersion}`}
                    alt={pkg.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-6 w-6 text-primary/70" />
                )}
              </div>
              {isWorkingSelected && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingIcon}
                    className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover/icon:opacity-100 transition-opacity flex items-center justify-center disabled:opacity-50"
                    title="Change icon"
                  >
                    {isUploadingIcon ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-white" />
                    )}
                  </button>
                  {pkg.icon_url && !isUploadingIcon && (
                    <button
                      onClick={handleIconDelete}
                      className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity"
                      title="Remove icon"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/x-icon"
                    onChange={handleIconUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">{pkg.display_name}</h2>
                {pkg.latest_version && (
                  <Badge variant="secondary" className="text-[10px]">v{pkg.latest_version}</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{pkg.name}</p>
              {pkg.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{pkg.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                {pkg.author && <span>{pkg.author}</span>}
                {pkg.license && <span>{pkg.license}</span>}
              </div>
              {pkg.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {pkg.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[9px] h-3.5 px-1">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            {/* Edit + Publish actions */}
            <div className="flex-shrink-0 flex items-center gap-1">
              <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={onEditMetadata}>
                <Settings2 className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="default" size="sm" className="text-xs gap-1 h-7" onClick={onPublish} title={hubAuthed ? 'Publish to Extension Hub' : 'Sign in to Extension Hub to publish'}>
                {hubAuthed ? (
                  <GitBranch className="h-3.5 w-3.5" />
                ) : (
                  <LogIn className="h-3.5 w-3.5" />
                )}
                Publish
              </Button>
            </div>
          </div>

          {/* Flex layout: aside (versions) + content (tabs) */}
          <div className="flex gap-4 items-start">
            {/* Aside: Published Versions */}
            <div className="flex-shrink-0 w-64 space-y-3">
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="px-3 py-2 border-b bg-muted/30">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" /> Versions
                    <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{publishedVersions.length}</Badge>
                  </h3>
                </div>
                <div className="p-3 space-y-1">
                  {/* Working version (editable) */}
                  {workingVersion && (
                    <div
                      onClick={() => setSelectedVersion('working')}
                      className={`flex items-center gap-2 text-[11px] rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
                        isWorkingSelected
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/40 hover:bg-accent/30'
                      }`}
                    >
                      <Edit3 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      <span className="font-mono font-medium">Draft (local)</span>
                      <span className="text-muted-foreground truncate flex-1">editable</span>
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 flex-shrink-0">{workingVersion.nodes.length}</Badge>
                    </div>
                  )}
                  {/* Published versions (read-only) */}
                  {publishedVersions.map(v => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVersion(v.version)}
                      className={`flex items-center gap-2 text-[11px] rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
                        v.version === selectedVersion
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/40 hover:bg-accent/30'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="font-mono font-medium">v{v.version}</span>
                      {v.changelog && <span className="text-muted-foreground truncate flex-1">{v.changelog}</span>}
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 flex-shrink-0">{v.nodes.length}</Badge>
                    </div>
                  ))}
                  {publishedVersions.length === 0 && !workingVersion && (
                    <p className="text-[11px] text-muted-foreground py-2 text-center">No versions yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Content: Tabs (README / Nodes) */}
            <div className="flex-1 min-w-0 rounded-lg border bg-card flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
                {/* Tab header with same bg-muted/30 style */}
                <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                  <TabsList className="h-7 bg-transparent border-0 p-0 gap-1">
                    <TabsTrigger value="readme" className="text-xs gap-1 h-6 px-2">
                      <FileText className="h-3 w-3" /> README
                    </TabsTrigger>
                    <TabsTrigger value="nodes" className="text-xs gap-1 h-6 px-2">
                      <Code2 className="h-3 w-3" /> Nodes
                      {selectedVersionData && (
                        <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-1">
                          {selectedVersionData.nodes.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    {isWorkingSelected && (
                      <TabsTrigger value="install" className="text-xs gap-1 h-6 px-2">
                        <Terminal className="h-3 w-3" /> install.sh
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="files" className="text-xs gap-1 h-6 px-2">
                      <FolderTree className="h-3 w-3" /> Files
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    {selectedVersionData && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {isWorkingSelected ? 'Draft (local)' : `v${selectedVersionData.version}`}
                      </span>
                    )}
                    {/* Node actions — only on Nodes tab AND working version */}
                    {activeTab === 'nodes' && isWorkingSelected && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={onAddNode}>
                          <Plus className="h-3.5 w-3.5" /> Add Node
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* README tab */}
                <TabsContent value="readme" className="mt-0">
                  <div className="p-4">
                    {isLoadingReadme ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : isEditingReadme ? (
                      <div className="space-y-2">
                        {/* Write / Preview toggle */}
                        <div className="flex items-center gap-1 border-b pb-1">
                          <button
                            onClick={() => setReadmeEditorMode('write')}
                            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${readmeEditorMode === 'write' ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            Write
                          </button>
                          <button
                            onClick={() => setReadmeEditorMode('preview')}
                            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${readmeEditorMode === 'preview' ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            Preview
                          </button>
                        </div>
                        {/* Editor / Preview content */}
                        {readmeEditorMode === 'write' ? (
                          <Textarea
                            value={readmeDraft}
                            onChange={(e) => setReadmeDraft(e.target.value)}
                            placeholder="# Project Title&#10;&#10;Write your README markdown here…"
                            className="text-xs min-h-[300px] font-mono resize-y"
                            autoFocus
                          />
                        ) : readmeDraft.trim() ? (
                          <div className="min-h-[200px] border rounded-md p-3">
                            <Markdown>{readmeDraft}</Markdown>
                          </div>
                        ) : (
                          <div className="min-h-[200px] border rounded-md p-3 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Nothing to preview yet.</span>
                          </div>
                        )}
                        {/* Footer: char count + actions */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            Markdown · {readmeDraft.length} chars
                          </span>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleCancelReadme} disabled={isSavingReadme}>
                              Cancel
                            </Button>
                            <Button size="sm" className="text-xs gap-1 h-7" onClick={handleSaveReadme} disabled={isSavingReadme}>
                              {isSavingReadme ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : readme.trim() ? (
                      <div className="relative group/readme">
                        <Markdown>{readme}</Markdown>
                        {isWorkingSelected && (
                          <button
                            onClick={handleEditReadme}
                            className="absolute top-0 right-0 z-50 size-6 rounded-md bg-background/80 border border-border shadow-sm flex items-center justify-center opacity-0 group-hover/readme:opacity-100 transition-opacity hover:bg-accent"
                            title="Edit README"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : isWorkingSelected ? (
                      <div className="text-center py-8">
                        <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] text-muted-foreground mb-3">No README.md yet.</p>
                        <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={handleEditReadme}>
                          <Edit3 className="h-3.5 w-3.5" /> Add README
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] text-muted-foreground">No README for this version.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Nodes tab */}
                <TabsContent value="nodes" className="mt-0">
                  <div className="p-4">
                    {selectedVersionData && selectedVersionData.nodes.length > 0 ? (
                      <div className="flex flex-wrap gap-4">
                        {selectedVersionData.nodes.map(node => (
                          <div key={node.id} className="relative group">
                            <CanvasStyleNodeCard node={node} />
                            {isWorkingSelected && onEditNode && (
                              <button
                                onClick={() => onEditNode(node)}
                                className="absolute top-1.5 right-1.5 z-50 size-6 rounded-md bg-background/80 border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                                title="Edit node"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Code2 className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] text-muted-foreground">
                          {isWorkingSelected ? 'No nodes yet. Click "Add Node" to create one.' : 'No nodes in this version.'}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* install.sh tab — only for working version */}
                {isWorkingSelected && (
                  <TabsContent value="install" className="mt-0">
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Terminal className="h-3 w-3" />
                          <span>Runs before nodes are installed into the Nodebar</span>
                        </div>
                        {!isEditingInstall ? (
                          <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={handleEditInstallSh}>
                            <Edit3 className="h-3 w-3" /> Edit
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleCancelInstallSh} disabled={isSavingInstall}>
                              Cancel
                            </Button>
                            <Button size="sm" className="text-xs gap-1 h-7" onClick={handleSaveInstallSh} disabled={isSavingInstall}>
                              {isSavingInstall ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                      {isLoadingInstall ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : isEditingInstall ? (
                        <Textarea
                          value={installShDraft}
                          onChange={(e) => setInstallShDraft(e.target.value)}
                          className="text-xs font-mono min-h-[300px] resize-y"
                          autoFocus
                        />
                      ) : (
                        <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 rounded-md p-3 min-h-[200px]">
                          {installSh || '# install.sh not set'}
                        </pre>
                      )}
                    </div>
                  </TabsContent>
                )}

                {/* Files tab — git file tree browser */}
                <TabsContent value="files" className="mt-0 h-full min-h-0">
                  <div className="h-full min-h-0">
                    <FileTreeViewer
                      onFetchTree={(ref) => getLocalTree(pkg.id, ref)}
                      onFetchFile={(path, ref) => getLocalFile(pkg.id, path, ref)}
                      ref={isWorkingSelected ? undefined : `v${selectedVersionData?.version}`}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Node Editor Dialog Wrapper
// ---------------------------------------------------------------------------
function NodeEditorDialog({
  packageId, node, isOpen, onClose, onSaved,
}: {
  packageId: number
  node: PackageNode | null
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}) {
  if (!isOpen) return null
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <NodeEditor
        packageId={packageId}
        node={node}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Edit Metadata Dialog
// ---------------------------------------------------------------------------
function EditMetadataDialog({
  pkg, isOpen, onClose, onSaved,
}: {
  pkg: PackageDetail
  isOpen: boolean
  onClose: () => void
  onSaved: (updated: PackageDetail) => void
}) {
  const [displayName, setDisplayName] = useState(pkg.display_name)
  const [description, setDescription] = useState(pkg.description)
  const [author, setAuthor] = useState(pkg.author)
  const [tags, setTags] = useState<string[]>(pkg.tags)
  const [license, setLicense] = useState(pkg.license)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setDisplayName(pkg.display_name)
    setDescription(pkg.description)
    setAuthor(pkg.author)
    setTags(pkg.tags)
    setLicense(pkg.license)
  }, [pkg])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updated = await updatePackage(pkg.id, {
        display_name: displayName,
        description,
        author,
        tags,
        license,
      })
      toast.success('Package updated')
      onSaved(updated)
      onClose()
    } catch (err: any) {
      toast.error(`Failed to update: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[50vw] max-h-[80vh] overflow-hidden flex flex-col p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm">Edit Package Metadata</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-3 pr-4">
            <div>
              <Label className="text-xs">Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-xs mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">Short summary shown in package cards. Use README.md for full documentation.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Author</Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">License</Label>
                <Input value={license} onChange={(e) => setLicense(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Tags</Label>
              <div className="mt-1">
                <TagInput tags={tags} onAddTag={(t: string) => setTags([...tags, t])} onRemoveTag={(t: string) => setTags(tags.filter(x => x !== t))} />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs gap-1" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Publish Version Dialog
// ---------------------------------------------------------------------------
function PublishVersionDialog({
  pkg, isOpen, onClose, onPublished,
}: {
  pkg: PackageDetail
  isOpen: boolean
  onClose: () => void
  onPublished: () => void
}) {
  const [version, setVersion] = useState('')
  const [changelog, setChangelog] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const workingNodes = pkg.working_version?.nodes.length || 0

  useEffect(() => {
    // Suggest next version
    if (pkg.latest_version) {
      const parts = pkg.latest_version.split('.').map(Number)
      if (parts.length === 3) {
        setVersion(`${parts[0]}.${parts[1]}.${parts[2] + 1}`)
      } else {
        setVersion('1.0.0')
      }
    } else {
      setVersion('0.1.0')
    }
    setChangelog('')
  }, [pkg])

  const handlePublish = async () => {
    if (!version.match(/^\d+\.\d+\.\d+/)) {
      toast.error('Version must be semver (e.g. 1.0.0)')
      return
    }
    setIsPublishing(true)
    try {
      const result = await publishLocalPackage(pkg.id, version, changelog)
      if (result.pushed) {
        toast.success(`v${version} published & pushed to Extension Hub!`)
      } else {
        toast.warning(`v${version} tagged locally, but push to hub failed: ${result.push_error || 'unknown error'}`)
      }
      onPublished()
      onClose()
    } catch (err: any) {
      toast.error(`Failed to publish: ${err.message}`)
    } finally {
      setIsPublishing(false)
    }
  }

  if (!isOpen) return null
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[40vw] p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm">Publish New Version</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2 text-[11px] text-muted-foreground">
            This will tag the current draft ({workingNodes} node{workingNodes === 1 ? '' : 's'})
            as v{version || '...'} and push it to the Extension Hub (like git push to GitHub).
            The draft will remain editable locally for future changes.
            {workingNodes === 0 && ' You can publish a docs-only version without any nodes.'}
          </div>
          <div>
            <Label className="text-xs">Version (semver)</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className="h-8 text-xs mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs">Changelog</Label>
            <Textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="What changed in this version?" className="text-xs mt-1 min-h-[80px]" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs gap-1" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />}
            Publish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Cloud Package Detail View — read-only, with delete when signed in
// ---------------------------------------------------------------------------
function CloudPackageDetailView({
  pkg, onBack, onDelete, canDelete,
}: {
  pkg: PackageDetail
  onBack: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const publishedVersions = pkg.versions.filter(v => v.published)
  const [selectedVersion, setSelectedVersion] = useState(pkg.latest_version || '')
  const [activeTab, setActiveTab] = useState('readme')
  const [readme, setReadme] = useState('')
  const [isLoadingReadme, setIsLoadingReadme] = useState(false)
  const [installSh, setInstallSh] = useState('')
  const [isLoadingInstallSh, setIsLoadingInstallSh] = useState(false)

  const selectedVersionData = publishedVersions.find(v => v.version === selectedVersion) || publishedVersions[0]

  // Load README for the selected version
  useEffect(() => {
    if (!selectedVersionData) { setReadme(''); return }
    setIsLoadingReadme(true)
    getHubReadme(pkg.id, `v${selectedVersionData.version}`)
      .then(r => setReadme(r.content || ''))
      .catch(() => setReadme(''))
      .finally(() => setIsLoadingReadme(false))
  }, [pkg.id, selectedVersionData?.version])

  // Load install.sh for the selected version
  useEffect(() => {
    if (!selectedVersionData) { setInstallSh(''); return }
    setIsLoadingInstallSh(true)
    getHubInstallSh(pkg.id, selectedVersionData.version)
      .then(r => setInstallSh(r.content || ''))
      .catch(() => setInstallSh(''))
      .finally(() => setIsLoadingInstallSh(false))
  }, [pkg.id, selectedVersionData?.version])

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b">
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
            <Cloud className="h-2.5 w-2.5" /> CLOUD
          </span>
          {canDelete && (
            <Button variant="destructive" size="sm" className="text-xs gap-1 h-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Header card */}
          <div className="flex items-start gap-3 rounded-lg bg-card p-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
              {pkg.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getHubIconUrl(pkg.id)} alt={pkg.display_name} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-6 w-6 text-primary/70" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{pkg.display_name}</h2>
                {pkg.latest_version && (
                  <Badge variant="secondary" className="text-[10px]">v{pkg.latest_version}</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{pkg.name}</p>
              {pkg.description && (
                <p className="text-xs text-muted-foreground mt-2">{pkg.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                {pkg.author && <span>{pkg.author}</span>}
                {pkg.license && <span>{pkg.license}</span>}
                <span className="flex items-center gap-0.5">
                  <Download className="h-2.5 w-2.5" /> {pkg.download_count}
                </span>
              </div>
              {pkg.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {pkg.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[9px] h-3.5 px-1">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Flex layout: aside (versions) + content (tabs) */}
          <div className="flex gap-4 items-start">
            {/* Aside: Published Versions */}
            <div className="flex-shrink-0 w-64 space-y-3">
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="px-3 py-2 border-b bg-muted/30">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" /> Versions
                    <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{publishedVersions.length}</Badge>
                  </h3>
                </div>
                <div className="p-3 space-y-1">
                  {publishedVersions.map(v => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVersion(v.version)}
                      className={`flex items-center gap-2 text-[11px] rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
                        v.version === selectedVersion
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/40 hover:bg-accent/30'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="font-mono font-medium">v{v.version}</span>
                      {v.changelog && <span className="text-muted-foreground truncate flex-1">{v.changelog}</span>}
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 flex-shrink-0">{v.nodes.length}</Badge>
                    </div>
                  ))}
                  {publishedVersions.length === 0 && (
                    <p className="text-[11px] text-muted-foreground py-2 text-center">No published versions.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Content: Tabs */}
            <div className="flex-1 min-w-0 rounded-lg border bg-card flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
                <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                  <TabsList className="h-7 bg-transparent border-0 p-0 gap-1">
                    <TabsTrigger value="readme" className="text-xs gap-1 h-6 px-2">
                      <FileText className="h-3 w-3" /> README
                    </TabsTrigger>
                    <TabsTrigger value="nodes" className="text-xs gap-1 h-6 px-2">
                      <Code2 className="h-3 w-3" /> Nodes
                      {selectedVersionData && (
                        <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-1">
                          {selectedVersionData.nodes.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="install" className="text-xs gap-1 h-6 px-2">
                      <Terminal className="h-3 w-3" /> install.sh
                    </TabsTrigger>
                    <TabsTrigger value="files" className="text-xs gap-1 h-6 px-2">
                      <FolderTree className="h-3 w-3" /> Files
                    </TabsTrigger>
                  </TabsList>
                  {selectedVersionData && (
                    <span className="text-[10px] text-muted-foreground font-mono">v{selectedVersionData.version}</span>
                  )}
                </div>

                <TabsContent value="readme" className="mt-0">
                  <div className="p-4">
                    {isLoadingReadme ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : readme.trim() ? (
                      <Markdown>{readme}</Markdown>
                    ) : (
                      <p className="text-xs text-muted-foreground py-8 text-center">No README.md for this version.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="nodes" className="mt-0">
                  <div className="p-4">
                    {selectedVersionData && selectedVersionData.nodes.length > 0 ? (
                      <div className="flex flex-wrap gap-4">
                        {selectedVersionData.nodes.map((node) => (
                          <CanvasStyleNodeCard key={node.id} node={node} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-8 text-center">No nodes in this version.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="install" className="mt-0">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Terminal className="h-3 w-3" />
                      <span>Runs before nodes are installed into the Nodebar</span>
                    </div>
                    {isLoadingInstallSh ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : installSh.trim() ? (
                      <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 rounded-md p-3 max-h-96 overflow-y-auto">
                        {installSh}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground py-8 text-center">No install.sh in this version.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="files" className="mt-0 h-full min-h-0">
                  <div className="h-full min-h-0">
                    <FileTreeViewer
                      onFetchTree={(ref) => getHubTree(pkg.id, ref)}
                      onFetchFile={(path, ref) => getHubFile(pkg.id, path, ref)}
                      ref={selectedVersionData ? `v${selectedVersionData.version}` : undefined}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
