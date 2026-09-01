"use client"

import React, { useState, useEffect } from 'react'
import { Search, Download, Package, ArrowLeft, RefreshCw, Code2, FileText, GitBranch, CheckCircle2, Tag as TagIcon, Plus, Loader2, AlertTriangle, Terminal, FolderTree } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from 'sonner'
import { Markdown } from '@/components/Sidebar/Traybar/Ai-Chat/components/Markdown'
import BrowseTab from './tabs/BrowseTab'
import MyPackagesTab from './tabs/MyPackagesTab'
import InstalledTab from './tabs/InstalledTab'
import NewProjectDialog from './NewProjectDialog'
import CanvasStyleNodeCard from './CanvasStyleNodeCard'
import FileTreeViewer from './FileTreeViewer'
import { PackageDetail, installPackage, InstallResult, getPackage, getPackageIconUrl, getInstallSh, getTree, getFileByPath, getReadme } from '@/lib/services/package-manager-service'

function PackageManagerPage({ onRegisterNewProjectOpener }: { onRegisterNewProjectOpener?: (open: () => void) => void }) {
  const [activeTab, setActiveTab] = useState<string>('browse')
  const [browseDetail, setBrowseDetail] = useState<PackageDetail | null>(null)
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)

  // Expose a way for the parent to open the New Project dialog without
  // lifting the dialog state out of this component.
  useEffect(() => {
    onRegisterNewProjectOpener?.(() => setIsNewProjectOpen(true))
  }, [onRegisterNewProjectOpener])

  const handlePackageCreated = (_pkg: PackageDetail) => {
    setActiveTab('mine')
  }

  const handleRefreshBrowseDetail = async () => {
    if (!browseDetail) return
    try {
      const updated = await getPackage(browseDetail.id)
      setBrowseDetail(updated)
    } catch (err) {
      toast.error('Failed to refresh package')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <NewProjectDialog
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreated={handlePackageCreated}
      />

      {/* Header — Genome Studio title + version, centered */}
      <div className="flex-shrink-0 border-b px-4 py-2.5 flex items-center justify-center bg-muted/20">
        <span className="text-sm font-semibold tracking-tight">Bioinformatics Studio</span>
        <span className="ml-2 text-[10px] font-medium text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 tabular-nums">v0.1.0</span>
      </div>

      {/* Tabs */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col gap-0">
          <div className="flex-shrink-0 border-b px-4 flex items-center justify-between">
            <TabsList className="bg-transparent h-9 p-0 gap-2">
              <TabsTrigger value="browse" className="text-xs gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                <Search className="h-3.5 w-3.5" /> Browse
              </TabsTrigger>
              <TabsTrigger value="installed" className="text-xs gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                <Download className="h-3.5 w-3.5" /> Installed
              </TabsTrigger>
              <TabsTrigger value="mine" className="text-xs gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                <Package className="h-3.5 w-3.5" /> My Packages
              </TabsTrigger>
            </TabsList>
            <Button
              size="sm"
              className="text-xs gap-1.5 h-7"
              onClick={() => setIsNewProjectOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> New Project
            </Button>
          </div>

          {/* Browse */}
          <TabsContent value="browse" className="flex-1 min-h-0 m-0 mt-0 flex flex-col">
            {browseDetail ? (
              <BrowsePackageDetail pkg={browseDetail} onBack={() => setBrowseDetail(null)} onRefresh={handleRefreshBrowseDetail} />
            ) : (
              <BrowseTab onOpenPackage={setBrowseDetail} />
            )}
          </TabsContent>

          {/* Installed */}
          <TabsContent value="installed" className="flex-1 min-h-0 m-0 mt-0 flex flex-col">
            <InstalledTab />
          </TabsContent>

          {/* My Packages */}
          <TabsContent value="mine" className="flex-1 min-h-0 m-0 mt-0 flex flex-col">
            <MyPackagesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Browse Package Detail (read-only view with install)
// ---------------------------------------------------------------------------
function BrowsePackageDetail({ pkg, onBack, onRefresh }: { pkg: PackageDetail; onBack: () => void; onRefresh: () => void }) {
  const publishedVersions = pkg.versions.filter(v => v.published)
  const [selectedVersion, setSelectedVersion] = useState(pkg.latest_version || '')
  const [isInstalling, setIsInstalling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [installResult, setInstallResult] = useState<InstallResult | null>(null)
  const [installError, setInstallError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('readme')
  const [installSh, setInstallSh] = useState('')
  const [isLoadingInstallSh, setIsLoadingInstallSh] = useState(false)
  const [readme, setReadme] = useState('')
  const [isLoadingReadme, setIsLoadingReadme] = useState(false)

  // The version selected in the sidebar (drives readme/nodes display)
  const selectedVersionData = publishedVersions.find(v => v.version === selectedVersion) || publishedVersions[0]
  // Install always uses the latest published version
  const latestPublished = publishedVersions.find(v => v.version === pkg.latest_version) || publishedVersions[0]

  // Load install.sh for the selected version
  useEffect(() => {
    if (!selectedVersionData) { setInstallSh(''); return }
    setIsLoadingInstallSh(true)
    getInstallSh(pkg.id, selectedVersionData.version)
      .then(r => setInstallSh(r.content || ''))
      .catch(() => setInstallSh(''))
      .finally(() => setIsLoadingInstallSh(false))
  }, [pkg.id, selectedVersionData?.version])

  // Load README for the selected version
  useEffect(() => {
    if (!selectedVersionData) { setReadme(''); return }
    setIsLoadingReadme(true)
    getReadme(pkg.id, `v${selectedVersionData.version}`)
      .then(r => setReadme(r.content || ''))
      .catch(() => setReadme(''))
      .finally(() => setIsLoadingReadme(false))
  }, [pkg.id, selectedVersionData?.version])

  const handleInstall = async () => {
    if (!latestPublished) {
      toast.error('No published version to install')
      setInstallError('No published version to install')
      return
    }
    setIsInstalling(true)
    setInstallError(null)
    try {
      const result = await installPackage(pkg.id, latestPublished.version)
      setInstallResult(result)
      if (result.failed === 0) {
        toast.success(`Installed ${result.installed} node(s) from "${pkg.display_name}"`)
      } else {
        toast.warning(`Installed ${result.installed}/${result.total} nodes`)
      }
      // Notify InstalledTab and Nodebar to refresh
      window.dispatchEvent(new Event('package-installed'))
      window.dispatchEvent(new Event('extension-installed'))
    } catch (err: any) {
      const msg = err?.message || 'Unknown error'
      setInstallError(msg)
      toast.error(`Install failed: ${msg}`)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Top bar: back + install ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b">
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 h-7"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
          {publishedVersions.length > 0 && (
            <Button
              size="sm"
              className="text-xs gap-1.5 h-7"
              onClick={handleInstall}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Installing...</>
              ) : (
                <><Plus className="h-3 w-3" /> Install</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Header card */}
          <div className="flex items-start gap-3 rounded-lg  bg-card p-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
              {pkg.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getPackageIconUrl(pkg.id)} alt={pkg.display_name} className="w-full h-full object-cover" />
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
              {/* Meta row */}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                {pkg.author && <span>{pkg.author}</span>}
                {pkg.license && <span>{pkg.license}</span>}
                <span className="flex items-center gap-0.5">
                  <Download className="h-2.5 w-2.5" /> {pkg.download_count}
                </span>
              </div>
              {/* Tags */}
              {pkg.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {pkg.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[9px] h-3.5 px-1">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Install error banner */}
          {installError && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Install failed
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{installError}</p>
              </div>
              <button
                onClick={() => setInstallError(null)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Install result banner */}
          {installResult && (
            <div className={`rounded-md border p-3 flex items-start gap-2 ${installResult.failed === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
              <CheckCircle2 className={`h-4 w-4 flex-shrink-0 mt-0.5 ${installResult.failed === 0 ? 'text-green-500' : 'text-amber-500'}`} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">
                  Installed {installResult.installed}/{installResult.total} nodes
                </span>
                {installResult.failed > 0 && (
                  <div className="space-y-0.5 mt-1">
                    {installResult.results.filter(r => r.status !== 'success').map((r, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground">
                        {r.title}: {r.error}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Nodes are now available in your Nodebar.
                </p>
              </div>
            </div>
          )}

          {/* Flex layout: aside (versions) + content (tabs: nodes/documentation) */}
          <div className="flex gap-4 items-start">
            {/* Aside: Versions */}
            <div className="flex-shrink-0 w-64 space-y-3">
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="px-3 py-2 border-b bg-muted/30">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" /> Versions
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

            {/* Content: Tabs (Documentation / Nodes) */}
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

                {/* README tab */}
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

                {/* Nodes tab */}
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

                {/* install.sh tab — read-only, version-specific */}
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

                {/* Files tab — git file tree browser */}
                <TabsContent value="files" className="mt-0 h-full min-h-0">
                  <div className="h-full min-h-0">
                    <FileTreeViewer
                      onFetchTree={(ref) => getTree(pkg.id, ref)}
                      onFetchFile={(path, ref) => getFileByPath(pkg.id, path, ref)}
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

export default PackageManagerPage
