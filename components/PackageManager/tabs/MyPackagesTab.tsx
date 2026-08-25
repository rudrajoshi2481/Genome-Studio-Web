"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2, Plus, Package, Trash2, Edit3,
  Code2, FileText, Tag as TagIcon, Calendar, GitBranch, Upload, Save,
  ArrowLeft, CheckCircle2, Settings2, RefreshCw, AlertTriangle,
  ImageIcon, X, Terminal,
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
  listPackages,
  getPackage,
  updatePackage,
  deletePackage,
  listNodes,
  publishVersion,
  uploadFile,
  deleteFile,
  uploadPackageIcon,
  deletePackageIcon,
  getPackageIconUrl,
  getInstallSh,
  updateInstallSh,
} from '@/lib/services/package-manager-service'

export default function MyPackagesTab() {
  const [packages, setPackages] = useState<PackageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState<PackageDetail | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [editingNode, setEditingNode] = useState<PackageNode | null>(null)
  const [isNodeEditorOpen, setIsNodeEditorOpen] = useState(false)
  const [isEditMetadataOpen, setIsEditMetadataOpen] = useState(false)
  const [isPublishOpen, setIsPublishOpen] = useState(false)

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
  }, [loadPackages])

  const loadPackageDetail = async (id: number) => {
    try {
      const detail = await getPackage(id)
      setSelectedPkg(detail)
    } catch (err: any) {
      toast.error(`Failed to load package: ${err.message}`)
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

  const handleOpenPackage = (pkg: PackageType) => {
    loadPackageDetail(pkg.id)
  }

  const handleBackToList = () => {
    setSelectedPkg(null)
    loadPackages()
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

  const handleDeletePackage = async (pkg: PackageType) => {
    if (!confirm(`Delete package "${pkg.display_name}"? This removes all versions, nodes, and files.`)) return
    try {
      await deletePackage(pkg.id)
      toast.success('Package deleted')
      loadPackages()
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`)
    }
  }

  const refreshNodes = async () => {
    if (selectedPkg) {
      const nodes = await listNodes(selectedPkg.id)
      setSelectedPkg({
        ...selectedPkg,
        working_version: selectedPkg.working_version
          ? { ...selectedPkg.working_version, nodes }
          : null,
      })
    }
  }

  // --- List View ---
  if (selectedPkg) {
    return (
      <>
        <PackageDetailView
          pkg={selectedPkg}
          onBack={handleBackToList}
          onAddNode={handleAddNode}
          onEditNode={handleEditNode}
          onEditMetadata={() => setIsEditMetadataOpen(true)}
          onPublish={() => setIsPublishOpen(true)}
          onRefresh={refreshNodes}
          onSavedDescription={(updated) => setSelectedPkg(updated)}
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
      </>
    )
  }

  // --- Package List View ---
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b flex items-center justify-between">
        <h2 className="text-xs font-semibold">My Packages</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadPackages}>
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs font-medium">No packages yet</p>
            <p className="text-[11px] mt-1">Click "New Project" to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {packages.map(pkg => (
              <PackageListItem
                key={pkg.id}
                pkg={pkg}
                onOpen={() => handleOpenPackage(pkg)}
                onDelete={() => handleDeletePackage(pkg)}
              />
            ))}
          </div>
        )}
      </div>
      </ScrollArea>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Package List Item
// ---------------------------------------------------------------------------
function PackageListItem({ pkg, onOpen, onDelete }: { pkg: PackageType; onOpen: () => void; onDelete: () => void }) {
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
  pkg, onBack, onAddNode, onEditNode, onEditMetadata, onPublish, onRefresh, onSavedDescription,
}: {
  pkg: PackageDetail
  onBack: () => void
  onAddNode: () => void
  onEditNode: (node: PackageNode) => void
  onEditMetadata: () => void
  onPublish: () => void
  onRefresh: () => void
  onSavedDescription: (updated: PackageDetail) => void
}) {
  const workingVersion = pkg.working_version
  const publishedVersions = pkg.versions.filter(v => v.published)
  const [activeTab, setActiveTab] = useState('description')
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

  // Inline description editing state
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [isSavingDesc, setIsSavingDesc] = useState(false)
  const [descEditorMode, setDescEditorMode] = useState<'write' | 'preview'>('write')

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

  const handleEditDescription = () => {
    setDescDraft(selectedVersionData?.description_md || '')
    setDescEditorMode('write')
    setIsEditingDesc(true)
  }

  const handleSaveDescription = async () => {
    setIsSavingDesc(true)
    try {
      const updated = await updatePackage(pkg.id, { description_md: descDraft })
      toast.success('Description updated')
      // Propagate the update so the parent re-renders with fresh data
      // (the parent's onSaved handler updates selectedPkg)
      onSavedDescription(updated)
      setIsEditingDesc(false)
    } catch (err: any) {
      toast.error(`Failed to update: ${err.message}`)
    } finally {
      setIsSavingDesc(false)
    }
  }

  const handleCancelDescription = () => {
    setIsEditingDesc(false)
    setDescDraft('')
  }

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
  const hasUnpublishedChanges = (() => {
    // No published version yet → working version is inherently unpublished
    if (!latestPublished) return true
    if (!workingVersion) return false
    // Compare description markdown (version-level)
    if ((workingVersion.description_md || '') !== (latestPublished.description_md || '')) return true
    // Compare nodes (by content, not ID — IDs differ between working & published)
    const wNodes = workingVersion.nodes || []
    const pNodes = latestPublished.nodes || []
    if (wNodes.length !== pNodes.length) return true
    const nodeKey = (n: PackageNode) =>
      `${n.title}|${n.function_name}|${n.language}|${n.source_code || ''}|${(n.inputs || []).length}|${(n.outputs || []).length}`
    const wKey = wNodes.map(nodeKey).sort().join('\n')
    const pKey = pNodes.map(nodeKey).sort().join('\n')
    if (wKey !== pKey) return true
    // Compare files (by name + type, not ID)
    const wFiles = workingVersion.files || []
    const pFiles = latestPublished.files || []
    if (wFiles.length !== pFiles.length) return true
    const fileKey = (f: PackageFile) => `${f.name}|${f.file_type}`
    const wFileKey = wFiles.map(fileKey).sort().join('\n')
    const pFileKey = pFiles.map(fileKey).sort().join('\n')
    if (wFileKey !== pFileKey) return true
    return false
  })()

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
                You are viewing a draft (unpublished) version. Changes here are not yet released.
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
              <Button variant="default" size="sm" className="text-xs gap-1 h-7" onClick={onPublish}>
                <GitBranch className="h-3.5 w-3.5" /> Publish
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
                      <span className="font-mono font-medium">Working</span>
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

            {/* Content: Tabs (Description / Nodes) */}
            <div className="flex-1 min-w-0 rounded-lg border bg-card">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Tab header with same bg-muted/30 style */}
                <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                  <TabsList className="h-7 bg-transparent border-0 p-0 gap-1">
                    <TabsTrigger value="description" className="text-xs gap-1 h-6 px-2">
                      <FileText className="h-3 w-3" /> Description
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
                  </TabsList>
                  <div className="flex items-center gap-2">
                    {selectedVersionData && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {isWorkingSelected ? 'Working' : `v${selectedVersionData.version}`}
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

                {/* Description tab */}
                <TabsContent value="description" className="mt-0">
                  <div className="p-4">
                    {isEditingDesc ? (
                      <div className="space-y-2">
                        {/* Write / Preview toggle */}
                        <div className="flex items-center gap-1 border-b pb-1">
                          <button
                            onClick={() => setDescEditorMode('write')}
                            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${descEditorMode === 'write' ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            Write
                          </button>
                          <button
                            onClick={() => setDescEditorMode('preview')}
                            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${descEditorMode === 'preview' ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            Preview
                          </button>
                        </div>
                        {/* Editor / Preview content */}
                        {descEditorMode === 'write' ? (
                          <Textarea
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            placeholder="Write markdown documentation here…"
                            className="text-xs min-h-[300px] font-mono resize-y"
                            autoFocus
                          />
                        ) : descDraft.trim() ? (
                          <div className="min-h-[200px] border rounded-md p-3">
                            <Markdown>{descDraft}</Markdown>
                          </div>
                        ) : (
                          <div className="min-h-[200px] border rounded-md p-3 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Nothing to preview yet.</span>
                          </div>
                        )}
                        {/* Footer: char count + actions */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            Markdown supported · {descDraft.length} chars
                          </span>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleCancelDescription} disabled={isSavingDesc}>
                              Cancel
                            </Button>
                            <Button size="sm" className="text-xs gap-1 h-7" onClick={handleSaveDescription} disabled={isSavingDesc}>
                              {isSavingDesc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : selectedVersionData?.description_md ? (
                      <div className="relative group/desc">
                        <Markdown>{selectedVersionData.description_md}</Markdown>
                        {isWorkingSelected && (
                          <button
                            onClick={handleEditDescription}
                            className="absolute top-0 right-0 z-50 size-6 rounded-md bg-background/80 border border-border shadow-sm flex items-center justify-center opacity-0 group-hover/desc:opacity-100 transition-opacity hover:bg-accent"
                            title="Edit description"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : isWorkingSelected ? (
                      <div className="text-center py-8">
                        <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] text-muted-foreground mb-3">No markdown description yet.</p>
                        <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={handleEditDescription}>
                          <Edit3 className="h-3.5 w-3.5" /> Add Description
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] text-muted-foreground">No documentation for this version.</p>
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
  const [descriptionMd, setDescriptionMd] = useState(pkg.description_md)
  const [author, setAuthor] = useState(pkg.author)
  const [tags, setTags] = useState<string[]>(pkg.tags)
  const [license, setLicense] = useState(pkg.license)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setDisplayName(pkg.display_name)
    setDescription(pkg.description)
    setDescriptionMd(pkg.description_md)
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
        description_md: descriptionMd,
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
            </div>
            <div>
              <Label className="text-xs">Description (Markdown)</Label>
              <Textarea value={descriptionMd} onChange={(e) => setDescriptionMd(e.target.value)} className="text-xs mt-1 h-32 resize-none font-mono" />
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
      await publishVersion(pkg.id, version, changelog)
      toast.success(`Version ${version} published!`)
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
            This will freeze the current working version ({workingNodes} node{workingNodes === 1 ? '' : 's'})
            as a published version. The working version will remain editable for future changes.
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

// cn helper import
