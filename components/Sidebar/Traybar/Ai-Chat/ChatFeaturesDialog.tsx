import React, { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Zap, Server, Bot, Terminal, BookOpen, Cpu, CheckCircle2, XCircle, Loader2, Database, CheckCheck, Save, Search, Link2, RotateCcw, Wifi, WifiOff, Shield, ShieldCheck, ShieldAlert, Trash2, AlertTriangle } from "lucide-react"
import { getApiBaseUrl } from "@/config/server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useChatStore } from "./components/chatStore"
import { wsService } from "./hooks/wsService"

interface ChatFeaturesDialogProps {
  children: React.ReactNode
  tooltipText?: string
}

interface ProviderInfo {
  id: string
  name: string
  base_url: string
  configured: boolean
  available: boolean
}

interface AgentInfo {
  name: string
  description?: string
}

interface SkillInfo {
  name: string
  description?: string
}

interface CommandInfo {
  name: string
  description?: string
}

interface KnowledgeStats {
  total_entries?: number
  categories?: Record<string, number>
  [key: string]: any
}

interface InstructionFile {
  path?: string
  name?: string
  content?: string
}

interface DatabaseInfo {
  id: string
  name: string
  description: string
  category: string
}

function ChatFeaturesDialog({ children, tooltipText = "AI Chat Settings" }: ChatFeaturesDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null)
  const [instructions, setInstructions] = useState<InstructionFile[]>([])
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [dbSearch, setDbSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Provider URL config state
  const [ollamaUrl, setOllamaUrl] = useState("")
  const [ollamaUrlEnv, setOllamaUrlEnv] = useState("")
  const [isCustomUrl, setIsCustomUrl] = useState(false)
  const [urlSaving, setUrlSaving] = useState(false)
  const [urlTesting, setUrlTesting] = useState(false)
  const [urlTestResult, setUrlTestResult] = useState<{ reachable: boolean; message: string } | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  const { enabledDatabases, toggleDatabase, setEnabledDatabases, keepIntermediateFiles, setKeepIntermediateFiles, permissionMode, setPermissionMode, resetPermissionMode } = useChatStore()

  // Permission state
  const [permAllowedTools, setPermAllowedTools] = useState<string[]>([])
  const [permDeniedTools, setPermDeniedTools] = useState<string[]>([])
  const [permSaving, setPermSaving] = useState(false)
  const [permError, setPermError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [provRes, agRes, skRes, cmdRes, knRes, instRes, dbRes, cfgRes, permRes] = await Promise.allSettled([
        fetch(`${getApiBaseUrl()}/ai-chat/providers`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiBaseUrl()}/ai-chat/agents`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/skills`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/commands`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/knowledge/stats`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiBaseUrl()}/ai-chat/knowledge/instructions`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/databases`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/providers/config`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiBaseUrl()}/ai-chat/permissions`).then(r => r.ok ? r.json() : null),
      ])

      if (provRes.status === 'fulfilled' && provRes.value) setProviders(provRes.value.providers || [])
      if (agRes.status === 'fulfilled') setAgents(agRes.value || [])
      if (skRes.status === 'fulfilled') setSkills(skRes.value || [])
      if (cmdRes.status === 'fulfilled') setCommands(cmdRes.value || [])
      if (knRes.status === 'fulfilled') setKnowledgeStats(knRes.value)
      if (instRes.status === 'fulfilled') setInstructions(instRes.value || [])
      if (dbRes.status === 'fulfilled') setDatabases(dbRes.value || [])
      if (cfgRes.status === 'fulfilled' && cfgRes.value) {
        setOllamaUrl(cfgRes.value.base_url || "")
        setOllamaUrlEnv(cfgRes.value.env_default || "")
        setIsCustomUrl(cfgRes.value.is_custom || false)
      }
      if (permRes.status === 'fulfilled' && permRes.value) {
        setPermAllowedTools(permRes.value.allowed || [])
        setPermDeniedTools(permRes.value.denied || [])
        const serverMode = permRes.value.mode || 'default'
        if (serverMode === 'bypass' && permissionMode !== 'bypass') {
          setPermissionMode('bypass')
        } else if (serverMode === 'default' && permissionMode !== 'default' && permissionMode !== 'bypass') {
          setPermissionMode('default')
        }
      }
    } catch (err) {
      setError("Failed to fetch backend status")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSaveUrl = useCallback(async () => {
    setUrlSaving(true)
    setUrlError(null)
    setUrlTestResult(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/providers/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: ollamaUrl }),
      })
      const data = await resp.json()
      if (data.error) {
        setUrlError(data.error)
      } else {
        setOllamaUrl(data.base_url)
        setIsCustomUrl(data.base_url !== ollamaUrlEnv)
        setUrlTestResult({
          reachable: data.reachable,
          message: data.reachable ? "Connected successfully!" : "URL saved but server is not reachable.",
        })
        // Refresh providers list
        fetchAll()
      }
    } catch (err) {
      setUrlError("Failed to save URL")
    } finally {
      setUrlSaving(false)
    }
  }, [ollamaUrl, ollamaUrlEnv, fetchAll])

  const handleTestUrl = useCallback(async () => {
    setUrlTesting(true)
    setUrlError(null)
    setUrlTestResult(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/providers/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: ollamaUrl }),
      })
      const data = await resp.json()
      if (data.error) {
        setUrlError(data.error)
      } else {
        setUrlTestResult({
          reachable: data.reachable,
          message: data.reachable ? "Connected successfully!" : "Cannot reach Ollama at this URL.",
        })
      }
    } catch (err) {
      setUrlError("Failed to test URL")
    } finally {
      setUrlTesting(false)
    }
  }, [ollamaUrl])

  const handleResetUrl = useCallback(async () => {
    setUrlSaving(true)
    setUrlError(null)
    setUrlTestResult(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/providers/config`, { method: "DELETE" })
      const data = await resp.json()
      setOllamaUrl(data.base_url)
      setIsCustomUrl(false)
      setUrlTestResult({ reachable: data.reachable, message: "Reset to environment default." })
      fetchAll()
    } catch (err) {
      setUrlError("Failed to reset URL")
    } finally {
      setUrlSaving(false)
    }
  }, [fetchAll])

  const handleSetPermissionMode = useCallback(async (mode: 'default' | 'bypass') => {
    setPermSaving(true)
    setPermError(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      const data = await resp.json()
      if (data.error) {
        setPermError(data.error)
      } else {
        setPermissionMode(mode)
        setPermAllowedTools(data.allowed || [])
        setPermDeniedTools(data.denied || [])
        // Also sync via WebSocket so the running agent picks up the change immediately
        if (mode === 'bypass') {
          wsService.sendMessage({ type: 'set_permission_mode', mode: 'bypass' })
        } else {
          wsService.sendMessage({ type: 'set_permission_mode', mode: 'default' })
        }
      }
    } catch (err) {
      setPermError("Failed to update permission mode")
    } finally {
      setPermSaving(false)
    }
  }, [setPermissionMode])

  const handleResetPermissions = useCallback(async () => {
    setPermSaving(true)
    setPermError(null)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'reset' }),
      })
      const data = await resp.json()
      if (data.error) {
        setPermError(data.error)
      } else {
        resetPermissionMode()
        setPermAllowedTools(data.allowed || [])
        setPermDeniedTools(data.denied || [])
        // Re-apply bypass mode via WebSocket after reset
        wsService.sendMessage({ type: 'set_permission_mode', mode: 'bypass' })
      }
    } catch (err) {
      setPermError("Failed to reset permissions")
    } finally {
      setPermSaving(false)
    }
  }, [resetPermissionMode])

  useEffect(() => {
    if (open) fetchAll()
  }, [open, fetchAll])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              {children}
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[70vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5 text-green-500" />
            AI Chat Settings
          </DialogTitle>
          <DialogDescription>
            Backend status, bioinformatics databases, agents, skills, commands, and knowledge base.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-xs text-red-500 text-center py-4">{error}</div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {/* Provider Status & Configuration */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Server className="h-4 w-4" />
                LLM Providers
              </h3>
              <div className="space-y-3">
                {providers.length === 0 && (
                  <p className="text-xs text-muted-foreground">No providers configured.</p>
                )}
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all
                      ${p.available ? "border-green-500 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : "border-muted"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-xs">{p.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.base_url}</p>
                      </div>
                    </div>
                    {p.available ? (
                      <Badge variant="outline" className="text-xs text-green-600 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Online
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-red-500 gap-1">
                        <XCircle className="h-3 w-3" /> Offline
                      </Badge>
                    )}
                  </div>
                ))}

                {/* Custom URL Configuration */}
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Custom Ollama URL
                    </Label>
                    {isCustomUrl && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Wifi className="h-2.5 w-2.5" /> Custom
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Point to a local Ollama instance or a remote server.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={ollamaUrl}
                      onChange={(e) => {
                        setOllamaUrl(e.target.value)
                        setUrlTestResult(null)
                        setUrlError(null)
                      }}
                      placeholder="http://localhost:11434 or https://your-server.com"
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 text-xs gap-1.5"
                      onClick={handleTestUrl}
                      disabled={urlTesting || !ollamaUrl.trim()}
                    >
                      {urlTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
                      Test
                    </Button>
                  </div>
                  {urlError && (
                    <p className="text-xs text-red-500">{urlError}</p>
                  )}
                  {urlTestResult && (
                    <div className={`flex items-center gap-1.5 text-xs ${urlTestResult.reachable ? "text-green-600" : "text-amber-600"}`}>
                      {urlTestResult.reachable ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {urlTestResult.message}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleSaveUrl}
                      disabled={urlSaving || !ollamaUrl.trim()}
                    >
                      {urlSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save & Apply
                    </Button>
                    {isCustomUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1.5"
                        onClick={handleResetUrl}
                        disabled={urlSaving}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset to Default
                      </Button>
                    )}
                  </div>
                  {ollamaUrlEnv && (
                    <p className="text-[10px] text-muted-foreground">
                      Default: <span className="font-mono">{ollamaUrlEnv}</span>
                    </p>
                  )}
                </div>
              </div>
            </section>

            <Separator />

            {/* Bioinformatics Databases */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Bioinformatics Databases ({databases.length})
              </h3>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">
                  Toggle which databases the AI can query. {enabledDatabases.length} of {databases.length} enabled.
                </p>
                {databases.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => setEnabledDatabases(databases.map(d => d.id))}
                      disabled={enabledDatabases.length === databases.length}
                    >
                      <CheckCheck className="h-3 w-3" />
                      Enable All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => setEnabledDatabases([])}
                      disabled={enabledDatabases.length === 0}
                    >
                      <XCircle className="h-3 w-3" />
                      Disable All
                    </Button>
                  </div>
                )}
              </div>
              {databases.length === 0 ? (
                <p className="text-xs text-muted-foreground">No databases available.</p>
              ) : (
                <>
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    placeholder="Search databases..."
                    className="h-8 text-xs pl-8"
                  />
                </div>
                {databases.filter(db => {
                  const q = dbSearch.toLowerCase()
                  return db.name.toLowerCase().includes(q) ||
                         db.description.toLowerCase().includes(q) ||
                         db.category.toLowerCase().includes(q)
                }).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No databases match "{dbSearch}".</p>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {databases.filter(db => {
                    const q = dbSearch.toLowerCase()
                    return db.name.toLowerCase().includes(q) ||
                           db.description.toLowerCase().includes(q) ||
                           db.category.toLowerCase().includes(q)
                  }).map((db) => {
                    const active = enabledDatabases.includes(db.id)
                    return (
                      <div
                        key={db.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all
                          ${active ? "border-green-500 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : "hover:border-muted-foreground/20"}`}
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="font-medium text-xs">{db.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{db.description}</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5">{db.category}</Badge>
                        </div>
                        <Switch
                          checked={active}
                          onCheckedChange={() => toggleDatabase(db.id)}
                          aria-label={`Toggle ${db.name}`}
                        />
                      </div>
                    )
                  })}
                </div>
                )}
                </>
              )}
            </section>

            <Separator />

            {/* Agents */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Agents ({agents.length})
              </h3>
              {agents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No custom agents loaded.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {agents.map((a) => (
                    <div key={a.name} className="p-2.5 rounded-lg border">
                      <p className="font-medium text-xs">{a.name}</p>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Skills */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Skills ({skills.length})
              </h3>
              {skills.length === 0 ? (
                <p className="text-xs text-muted-foreground">No skills loaded.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {skills.map((s) => (
                    <div key={s.name} className="p-2.5 rounded-lg border">
                      <p className="font-medium text-xs">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Commands */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Slash Commands ({commands.length})
              </h3>
              {commands.length === 0 ? (
                <p className="text-xs text-muted-foreground">No commands loaded.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {commands.map((c) => (
                    <div key={c.name} className="p-2.5 rounded-lg border">
                      <p className="font-medium text-xs font-mono">/{c.name}</p>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Knowledge Base */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Knowledge Base
              </h3>
              {knowledgeStats ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {knowledgeStats.total_entries ?? 0} entries
                    </Badge>
                    {knowledgeStats.categories && Object.entries(knowledgeStats.categories).map(([cat, count]) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}: {count as number}
                      </Badge>
                    ))}
                  </div>
                  {instructions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Instruction files:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {instructions.map((f, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-mono">
                            {f.name || f.path}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Knowledge base not available.</p>
              )}
            </section>

            <Separator />

            {/* Permission Mode */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permission Mode
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      permissionMode === 'bypass'
                        ? 'border-green-500 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                    onClick={() => handleSetPermissionMode('bypass')}
                    disabled={permSaving}
                  >
                    <ShieldCheck className={`h-4 w-4 shrink-0 mt-0.5 ${permissionMode === 'bypass' ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-xs">Bypass (Lytic)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Auto-approve all tool calls. No confirmation prompts.</p>
                    </div>
                  </button>
                  <button
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      permissionMode === 'default'
                        ? 'border-amber-500 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                    onClick={() => handleSetPermissionMode('default')}
                    disabled={permSaving}
                  >
                    <ShieldAlert className={`h-4 w-4 shrink-0 mt-0.5 ${permissionMode === 'default' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-xs">Default</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Ask before destructive tools (write, edit, run_command).</p>
                    </div>
                  </button>
                </div>

                {permError && (
                  <p className="text-xs text-red-500">{permError}</p>
                )}

                {permSaving && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating...
                  </div>
                )}

                {(permAllowedTools.length > 0 || permDeniedTools.length > 0) && (
                  <div className="space-y-1.5">
                    {permAllowedTools.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground shrink-0">Allowed:</span>
                        {permAllowedTools.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] text-green-600 gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {permDeniedTools.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground shrink-0">Denied:</span>
                        {permDeniedTools.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] text-red-500 gap-1">
                            <XCircle className="h-2.5 w-2.5" /> {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleResetPermissions}
                      disabled={permSaving}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset to Default (Bypass)
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Session Settings */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Save className="h-4 w-4" />
                Session Settings
              </h3>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-medium text-xs">Keep Intermediate Files</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Preserve fetched data, query results, and other intermediate files (JSON, CSV, HTML, etc.) in the session folder instead of deleting them on cleanup.
                  </p>
                </div>
                <Switch
                  checked={keepIntermediateFiles}
                  onCheckedChange={setKeepIntermediateFiles}
                  aria-label="Keep intermediate files"
                />
              </div>
            </section>

            <Separator />

            {/* Danger Zone - Clear Cache */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Danger Zone
              </h3>
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-medium text-xs">Clear All Cache & Storage</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Removes all localStorage, sessionStorage, and zustand persisted state (chat sessions, model selection, workspace paths, UI preferences) except login token and authentication data. The page will reload.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs gap-1.5 shrink-0"
                  onClick={() => {
                    if (!window.confirm('This will clear ALL cached data except login token. The page will reload. Continue?')) return;
                    // Keys to preserve (auth/token related)
                    const PRESERVE_KEYS = new Set([
                      'auth_token',
                      'genome_studio_token',
                      'genome_studio_refresh_token',
                      'genome_studio_token_expiry',
                    ]);
                    // Save preserved values
                    const preserved: Record<string, string> = {};
                    PRESERVE_KEYS.forEach(key => {
                      const val = localStorage.getItem(key);
                      if (val !== null) preserved[key] = val;
                    });
                    // Clear all localStorage
                    localStorage.clear();
                    // Restore preserved values
                    Object.entries(preserved).forEach(([key, val]) => {
                      localStorage.setItem(key, val);
                    });
                    // Clear all sessionStorage
                    sessionStorage.clear();
                    // Clear zustand persisted state by removing the specific keys
                    // (already cleared by localStorage.clear, but explicit for clarity)
                    // Reload the page to reset all in-memory state
                    window.location.reload();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  Clear Cache
                </Button>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ChatFeaturesDialog
