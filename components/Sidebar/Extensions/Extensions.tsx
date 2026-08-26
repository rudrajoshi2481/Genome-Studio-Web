"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Puzzle, Search, RefreshCw, Download, ExternalLink, ChevronDown, FileText, Workflow, PackageCheck, ScrollText, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import { getHost, getPort, getApiBaseUrl } from '@/config/server'
import * as authService from '@/lib/services/auth-service'
import { useTerminalStore } from '@/components/Terminal/store/terminal-store'

interface SubmissionFile {
  name: string
  storagePath: string
  size?: number
}

interface FlowSubmission {
  id: string
  title: string
  description: string
  author: string
  tags: string[]
  downloadCount: number
  createdAt: string | null
  files: {
    nodesFiles?: SubmissionFile[]
    flowFiles?: SubmissionFile[]
    installFiles?: SubmissionFile[]
  }
}

const API_BASE_URL = `http://${getHost()}:${getPort()}`

const FIREBASE_STORAGE_BASE = "https://firebasestorage.googleapis.com/v0/b/genome-studio.firebasestorage.app/o"
const CF_INCREMENT_DL = "https://incrementflowdownloadcount-4mch7ghcbq-uc.a.run.app"

const getFirebaseDownloadUrl = (storagePath: string): string => {
  const encodedPath = storagePath.replace(/\//g, '%2F')
  return `${FIREBASE_STORAGE_BASE}/${encodedPath}?alt=media`
}

const incrementDownloadCount = async (submissionId: string) => {
  try {
    await fetch(CF_INCREMENT_DL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { submissionId } }),
    })
  } catch {}
}

const getAuthHeaders = (): Record<string, string> => {
  const token = authService.getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function Extensions() {
  const [submissions, setSubmissions] = useState<FlowSubmission[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set())
  const [installLogs, setInstallLogs] = useState<Record<string, string[]>>({})
  const [showLogsFor, setShowLogsFor] = useState<string | null>(null)
  const [installedSubs, setInstalledSubs] = useState<Record<string, { condaEnvs: string[]; pipPackages: string[] }>>({})

  useEffect(() => {
    setIsClient(true)
    loadSubmissions()
    loadInstalledSubs()
  }, [])

  const loadInstalledSubs = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/genomic-hub/installed/list`, {
        headers: getAuthHeaders(),
      })
      if (!resp.ok) return
      const data = await resp.json()
      const map: Record<string, { condaEnvs: string[]; pipPackages: string[] }> = {}
      for (const item of data.installed || []) {
        map[item.submissionId] = {
          condaEnvs: item.condaEnvs || [],
          pipPackages: item.pipPackages || [],
        }
      }
      setInstalledSubs(map)
    } catch (e) {
      console.error('[Install] Failed to load installed extensions:', e)
    }
  }

  const loadSubmissions = async () => {
    setIsLoading(true)
    try {
      const resp = await fetch("https://getgenomichubdata-4mch7ghcbq-uc.a.run.app", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const result = data.result || data
      setSubmissions(result.submissions || [])
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
      toast.error('Failed to load flows from Genome Hub')
    } finally {
      setIsLoading(false)
    }
  }

  const categories = useMemo(() => {
    const tagSet = new Set<string>()
    submissions.forEach(s => s.tags.forEach(t => tagSet.add(t)))
    return ['All', ...Array.from(tagSet).sort()]
  }, [submissions])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getWorkspaceRoot = (): string => {
    if (typeof window === 'undefined') return '/home'
    // fileExplorer_rootPath is always updated when user switches workspaces
    const fileExplorerRoot = localStorage.getItem('fileExplorer_rootPath')
    console.log('[Install] fileExplorer_rootPath:', fileExplorerRoot)
    if (fileExplorerRoot) {
      console.log('[Install] Using fileExplorer_rootPath:', fileExplorerRoot)
      return fileExplorerRoot
    }
    // Fall back to active terminal's cwd
    const { tabs, activeTabId } = useTerminalStore.getState()
    const activeTab = tabs.find(t => t.id === activeTabId)
    console.log('[Install] Terminal fallback:', { activeTabId, activeTabCwd: activeTab?.cwd })
    if (activeTab?.cwd) {
      console.log('[Install] Using terminal cwd:', activeTab.cwd)
      return activeTab.cwd
    }
    console.log('[Install] No workspace found, defaulting to /home')
    return '/home'
  }

  const sanitizeFolderName = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'untitled'
  }

  const addLog = (submissionId: string, line: string) => {
    setInstallLogs(prev => ({
      ...prev,
      [submissionId]: [...(prev[submissionId] || []), line],
    }))
  }

  const handleInstall = async (sub: FlowSubmission) => {
    if (installingIds.has(sub.id)) return
    setInstallingIds(prev => new Set(prev).add(sub.id))
    setInstallLogs(prev => ({ ...prev, [sub.id]: [] }))
    const folderName = sanitizeFolderName(sub.title)
    const workspaceRoot = getWorkspaceRoot()
    const targetDir = `${workspaceRoot}/${folderName}`
    const apiBaseUrl = getApiBaseUrl()

    addLog(sub.id, `[Install] Starting installation of "${sub.title}"`)
    addLog(sub.id, `[Install] Workspace: ${workspaceRoot}`)
    addLog(sub.id, `[Install] Target folder: ${targetDir}`)

    try {
      // 1. Create the folder in the workspace
      addLog(sub.id, `[Install] Creating directory...`)
      const dirResp = await fetch(`${apiBaseUrl}/file-explorer-new/create-directory`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ path: targetDir, root_path: workspaceRoot }),
      })
      if (!dirResp.ok) {
        const errText = await dirResp.text()
        addLog(sub.id, `[Install] ERROR: Failed to create directory: ${dirResp.status} ${errText}`)
        throw new Error(`Failed to create directory: ${dirResp.status} ${errText}`)
      }
      addLog(sub.id, `[Install] Directory created successfully`)

      // 2. Download all files and save them
      const allFiles = [
        ...(sub.files.nodesFiles || []),
        ...(sub.files.flowFiles || []),
        ...(sub.files.installFiles || []),
      ]
      addLog(sub.id, `[Install] Downloading ${allFiles.length} files...`)

      const savedFileNames: string[] = []

      for (const file of allFiles) {
        addLog(sub.id, `[Install] Downloading ${file.name}...`)
        let resp: Response
        try {
          resp = await fetch(`${apiBaseUrl}/genomic-hub/download`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ submissionId: sub.id, storagePath: file.storagePath }),
          })
        } catch (fetchErr) {
          addLog(sub.id, `[Install] ERROR: Network error downloading ${file.name}: ${fetchErr}`)
          throw new Error(`Failed to download ${file.name}: ${fetchErr}`)
        }
        if (!resp.ok) {
          const errBody = await resp.text().catch(() => 'no body')
          addLog(sub.id, `[Install] ERROR: Failed to download ${file.name} (HTTP ${resp.status}): ${errBody.slice(0, 200)}`)
          throw new Error(`Failed to download ${file.name} (HTTP ${resp.status})`)
        }
        const blob = await resp.blob()
        const text = await blob.text()
        addLog(sub.id, `[Install] Downloaded ${file.name} (${text.length} chars)`)

        // Save file to the created folder via file-explorer API
        const fileResp = await fetch(`${apiBaseUrl}/file-explorer-new/create-file`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            path: `${targetDir}/${file.name}`,
            root_path: workspaceRoot,
            content: text,
          }),
        })
        if (!fileResp.ok) {
          const errText = await fileResp.text()
          addLog(sub.id, `[Install] ERROR: Failed to save ${file.name}: ${fileResp.status} ${errText}`)
          throw new Error(`Failed to save ${file.name}: ${fileResp.status} ${errText}`)
        }
        savedFileNames.push(file.name)
        addLog(sub.id, `[Install] Saved ${file.name}`)
      }

      addLog(sub.id, `[Install] All ${allFiles.length} files saved to ${targetDir}/`)

      // 3. Run install scripts if present (streamed via NDJSON)
      const installSh = savedFileNames.find(n => n === 'install.sh' || n.endsWith('.sh'))
      const requirementsTxt = savedFileNames.find(n => n === 'requirements.txt')
      let detectedEnvsFromScripts: string[] = []

      const runScriptStream = async (
        scriptPath: string,
        workingDir: string,
        scriptType: string,
        label: string
      ): Promise<number> => {
        addLog(sub.id, `[Install] Running ${label}...`)
        const resp = await fetch(`${API_BASE_URL}/api/v1/genomic-hub/run-script`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ scriptPath, workingDir, scriptType }),
        })
        if (!resp.ok || !resp.body) {
          addLog(sub.id, `[Install] ERROR: Failed to start ${label}: ${resp.status}`)
          return -1
        }

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let returncode = -1

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const msg = JSON.parse(line)
              if (msg.type === 'stdout') {
                addLog(sub.id, `[${label}] ${msg.line}`)
              } else if (msg.type === 'stderr') {
                addLog(sub.id, `[${label}:stderr] ${msg.line}`)
              } else if (msg.type === 'done') {
                returncode = msg.returncode
                if (msg.error) addLog(sub.id, `[${label}] ERROR: ${msg.error}`)
                if (msg.new_envs && msg.new_envs.length > 0) {
                  addLog(sub.id, `[Install] New conda environments detected: ${msg.new_envs.join(', ')}`)
                  detectedEnvsFromScripts = [...new Set([...detectedEnvsFromScripts, ...msg.new_envs])]
                }
              } else if (msg.type === 'error') {
                addLog(sub.id, `[${label}] ERROR: ${msg.line}`)
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
        addLog(sub.id, `[Install] ${label} exited with code ${returncode}`)
        return returncode
      }

      if (installSh) {
        await runScriptStream(`${targetDir}/${installSh}`, targetDir, 'bash', 'install.sh')
      }

      if (requirementsTxt) {
        await runScriptStream(`${targetDir}/${requirementsTxt}`, targetDir, 'pip', 'pip install')
      }

      if (!installSh && !requirementsTxt) {
        addLog(sub.id, `[Install] No install.sh or requirements.txt found, skipping script execution`)
      }

      // 4. Check for conda environments / pip packages created by install
      addLog(sub.id, `[Install] Checking for created environments...`)
      try {
        const envResp = await fetch(`${API_BASE_URL}/api/v1/genomic-hub/check-env`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            workingDir: targetDir,
            installLogs: (installLogs[sub.id] || []).join('\n'),
          }),
        })
        if (envResp.ok) {
          const envData = await envResp.json()
          const checkEnvs: string[] = (envData.conda_envs || []).map((e: any) => e.name)
          const pipPackages: string[] = envData.pip_packages || []
          // Merge envs from before/after snapshot (run-script) with check-env results
          const condaEnvs = [...new Set([...checkEnvs, ...detectedEnvsFromScripts])]
          if (condaEnvs.length > 0) {
            addLog(sub.id, `[Install] Detected conda environments: ${condaEnvs.join(', ')}`)
          }
          if (pipPackages.length > 0) {
            addLog(sub.id, `[Install] Detected pip packages in venv: ${pipPackages.length} packages`)
          }
          setInstalledSubs(prev => ({
            ...prev,
            [sub.id]: { condaEnvs, pipPackages },
          }))
        }
      } catch (e) {
        addLog(sub.id, `[Install] Could not check environments: ${e}`)
      }

      // 5. Batch convert JSON node files and upload to database
      const jsonFiles = allFiles.filter(f => f.name.endsWith('.json'))
      if (jsonFiles.length > 0) {
        addLog(sub.id, `[Install] Found ${jsonFiles.length} JSON node file(s) — batch converting...`)
        try {
          const batchNodes: { code: string; language: string; tags?: string[]; title?: string; description?: string; function_name?: string; inputs?: any[]; outputs?: any[] }[] = []
          for (const jf of jsonFiles) {
            // Re-download the JSON content (we already have it in `text` but that was overwritten in the loop)
            const dlResp = await fetch(getFirebaseDownloadUrl(jf.storagePath))
            if (!dlResp.ok) {
              addLog(sub.id, `[Install] Warning: Could not re-fetch ${jf.name} for conversion`)
              continue
            }
            const dlBlob = await dlResp.blob()
            const jsonText = await dlBlob.text()
            const parsed = JSON.parse(jsonText)
            // The JSON can be an array of nodes or a single node object
            const items = Array.isArray(parsed) ? parsed : [parsed]
            for (const item of items) {
              batchNodes.push({
                code: item.source_code || item.code || '',
                language: item.language || 'python',
                tags: item.tags || [],
                title: item.title || undefined,
                description: item.description || undefined,
                function_name: item.function_name || undefined,
                inputs: item.inputs || undefined,
                outputs: item.outputs || undefined,
              })
            }
          }
          if (batchNodes.length > 0) {
            addLog(sub.id, `[Install] Sending ${batchNodes.length} node(s) for batch validate+convert+upload...`)
            const batchResp = await fetch(`${API_BASE_URL}/api/v1/workflow-manager/execute/function/batch-convert-upload`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ nodes: batchNodes }),
            })
            if (batchResp.ok) {
              const batchData = await batchResp.json()
              addLog(sub.id, `[Install] Batch result: uploaded=${batchData.uploaded}/${batchData.total}  failed=${batchData.failed}`)
              if (batchData.failed > 0) {
                for (const r of batchData.results) {
                  if (r.status !== 'success') {
                    addLog(sub.id, `[Install] Node #${r.index} — ${r.status}: ${r.error || 'unknown'}`)
                  }
                }
              }
            } else {
              const errText = await batchResp.text()
              addLog(sub.id, `[Install] Warning: Batch convert-upload failed: ${batchResp.status} ${errText}`)
            }
          }
        } catch (e) {
          addLog(sub.id, `[Install] Warning: Could not batch convert JSON files: ${e}`)
        }
      } else {
        addLog(sub.id, `[Install] No JSON node files found, skipping batch convert`)
      }

      // 6. Persist install record to database
      addLog(sub.id, `[Install] Saving install record to database...`)
      try {
        const currentLogs = installLogs[sub.id] || []
        const saveResp = await fetch(`${API_BASE_URL}/api/v1/genomic-hub/installed/save`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            submissionId: sub.id,
            submissionTitle: sub.title,
            installPath: targetDir,
            condaEnvs: detectedEnvsFromScripts,
            pipPackages: [],
            installLogs: currentLogs.join('\n'),
          }),
        })
        if (saveResp.ok) {
          addLog(sub.id, `[Install] Install record saved to database`)
          window.dispatchEvent(new Event('extension-installed'))
        } else {
          addLog(sub.id, `[Install] Warning: Could not save install record to database`)
        }
      } catch (e) {
        addLog(sub.id, `[Install] Warning: Could not save install record: ${e}`)
      }

      addLog(sub.id, `[Install] === INSTALL COMPLETE ===`)
      toast.success(`Installed "${sub.title}" to ${folderName}/`)
    } catch (err) {
      addLog(sub.id, `[Install] FATAL: ${err}`)
      console.error('Install failed:', err)
      toast.error(`Failed to install ${sub.title}: ${err}`)
    } finally {
      setInstallingIds(prev => {
        const next = new Set(prev)
        next.delete(sub.id)
        return next
      })
    }
  }

  const handleDownload = async (file: SubmissionFile, submissionId: string) => {
    const fileKey = `${submissionId}/${file.storagePath}`
    if (downloadingFiles.has(fileKey)) return
    setDownloadingFiles(prev => new Set(prev).add(fileKey))
    try {
      const resp = await fetch(getFirebaseDownloadUrl(file.storagePath))
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const blob = await resp.blob()
      incrementDownloadCount(submissionId)
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      toast.success(`Downloaded ${file.name}`)
    } catch (err) {
      console.error('Download failed:', err)
      toast.error(`Failed to download ${file.name}`)
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev)
        next.delete(fileKey)
        return next
      })
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch =
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory =
      activeCategory === 'All' || sub.tags.includes(activeCategory)
    return matchesSearch && matchesCategory
  })

  const totalDownloads = submissions.reduce((sum, s) => sum + (s.downloadCount || 0), 0)

  if (!isClient) {
    return (
      <div className="h-full flex items-center justify-center">
        <Puzzle className="h-6 w-6 text-muted-foreground animate-pulse" />
      </div>
    )
  }

  return (
    <TooltipProvider>
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-xs font-medium">Extensions</h1>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{submissions.length} flows</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={loadSubmissions}
                >
                  <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search flows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b">
        <div className="flex items-center gap-1 overflow-x-auto">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs whitespace-nowrap"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Extensions List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Puzzle className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs">No flows found</p>
                <p className="text-[11px] mt-1 text-center opacity-70">
                  {searchQuery ? 'Try a different search' : 'No submissions available yet'}
                </p>
              </div>
            ) : (
              filteredSubmissions.map(sub => {
                const isExpanded = expandedIds.has(sub.id)
                const isInstalled = !!installedSubs[sub.id]
                const envInfo = installedSubs[sub.id]
                const allFiles = [
                  ...(sub.files.nodesFiles || []).map(f => ({ ...f, fileType: 'node' })),
                  ...(sub.files.flowFiles || []).map(f => ({ ...f, fileType: 'flow' })),
                  ...(sub.files.installFiles || []).map(f => ({ ...f, fileType: 'install' })),
                ]
                const cardContent = (
                  <>
                    <div
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => toggleExpand(sub.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0 -rotate-90" />
                          )}
                          <span className="text-xs font-medium truncate">{sub.title}</span>
                          {isInstalled && (
                            <CheckCircle2 className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {sub.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                          <span>{sub.author}</span>
                          <Separator orientation="vertical" className="h-3" />
                          <span className="flex items-center gap-0.5">
                            <Download className="h-2.5 w-2.5" />
                            {sub.downloadCount || 0}
                          </span>
                          {sub.createdAt && (
                            <>
                              <Separator orientation="vertical" className="h-3" />
                              <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                        {sub.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {sub.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[9px] h-3.5 px-1">
                                {tag}
                              </Badge>
                            ))}
                            {sub.tags.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">+{sub.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                        {isInstalled && (envInfo.condaEnvs.length > 0 || envInfo.pipPackages.length > 0) && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {envInfo.condaEnvs.map(env => (
                              <Badge key={env} className="text-[9px] h-3.5 px-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
                                conda: {env}
                              </Badge>
                            ))}
                            {envInfo.pipPackages.length > 0 && (
                              <Badge className="text-[9px] h-3.5 px-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                                venv: {envInfo.pipPackages.length} pkgs
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href="https://bioinformatics-studio.rudhrajoshi.me/genome-hub"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md h-6 w-6 hover:bg-accent transition-colors flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">Open in browser</TooltipContent>
                      </Tooltip>
                    </div>
                    {/* Install + Logs buttons */}
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-[11px] gap-1.5 flex-1"
                        disabled={installingIds.has(sub.id)}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInstall(sub)
                        }}
                      >
                        <PackageCheck className={cn('h-3.5 w-3.5', installingIds.has(sub.id) && 'animate-pulse')} />
                        {installingIds.has(sub.id) ? 'Installing...' : 'Install'}
                      </Button>
                      {installLogs[sub.id] && installLogs[sub.id].length > 0 && (
                        <Dialog open={showLogsFor === sub.id} onOpenChange={(open) => !open && setShowLogsFor(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] gap-1.5 px-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowLogsFor(sub.id)
                              }}
                            >
                              <ScrollText className="h-3.5 w-3.5" />
                              Logs
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="min-w-[60vw] max-h-[80vh] overflow-hidden flex flex-col p-4 gap-3">
                            <DialogHeader className="flex-shrink-0">
                              <DialogTitle className="text-sm">Install Logs — {sub.title}</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 min-h-0 overflow-y-auto rounded-md border bg-muted p-3">
                              <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
                                {installLogs[sub.id].join('\n')}
                              </pre>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    {isExpanded && allFiles.length > 0 && (
                      <div className="mt-2 pt-2 border-t space-y-1">
                        {allFiles.map((f, idx) => {
                          const fileKey = `${sub.id}/${f.storagePath}`
                          const isDownloading = downloadingFiles.has(fileKey)
                          return (
                            <div
                              key={`${f.name}-${idx}`}
                              className="flex items-center gap-2 text-[11px] hover:bg-accent rounded px-1.5 py-1 cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(f, sub.id)
                              }}
                            >
                              {f.fileType === 'flow' ? (
                                <Workflow className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                              ) : (
                                <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className="truncate flex-1">{f.name}</span>
                              <Download className={cn('h-3 w-3 text-muted-foreground flex-shrink-0', isDownloading && 'animate-pulse')} />
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {isExpanded && allFiles.length === 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-[10px] text-muted-foreground text-center">No files available</p>
                      </div>
                    )}
                  </>
                )
                if (isInstalled) {
                  return (
                    <HoverBorderGradient key={sub.id} className="p-2.5 bg-purple-500/5">
                      {cardContent}
                    </HoverBorderGradient>
                  )
                }
                return (
                  <div key={sub.id} className="rounded-lg border p-2.5 hover:border-purple-500/50 transition-colors">
                    {cardContent}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
    </TooltipProvider>
  )
}

export default Extensions
