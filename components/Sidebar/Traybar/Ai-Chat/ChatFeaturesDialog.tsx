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
import { Zap, Server, Bot, Terminal, BookOpen, Cpu, CheckCircle2, XCircle, Loader2, Database, CheckCheck, Save, Search } from "lucide-react"
import { getApiBaseUrl } from "@/config/server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChatStore } from "./components/chatStore"

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

  const { enabledDatabases, toggleDatabase, setEnabledDatabases, keepIntermediateFiles, setKeepIntermediateFiles } = useChatStore()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [provRes, agRes, skRes, cmdRes, knRes, instRes, dbRes] = await Promise.allSettled([
        fetch(`${getApiBaseUrl()}/ai-chat/providers`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiBaseUrl()}/ai-chat/agents`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/skills`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/commands`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/knowledge/stats`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiBaseUrl()}/ai-chat/knowledge/instructions`).then(r => r.ok ? r.json() : []),
        fetch(`${getApiBaseUrl()}/ai-chat/databases`).then(r => r.ok ? r.json() : []),
      ])

      if (provRes.status === 'fulfilled' && provRes.value) setProviders(provRes.value.providers || [])
      if (agRes.status === 'fulfilled') setAgents(agRes.value || [])
      if (skRes.status === 'fulfilled') setSkills(skRes.value || [])
      if (cmdRes.status === 'fulfilled') setCommands(cmdRes.value || [])
      if (knRes.status === 'fulfilled') setKnowledgeStats(knRes.value)
      if (instRes.status === 'fulfilled') setInstructions(instRes.value || [])
      if (dbRes.status === 'fulfilled') setDatabases(dbRes.value || [])
    } catch (err) {
      setError("Failed to fetch backend status")
    } finally {
      setLoading(false)
    }
  }, [])

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
            {/* Provider Status */}
            <section>
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Server className="h-4 w-4" />
                LLM Providers
              </h3>
              <div className="space-y-2">
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
                        <p className="text-xs text-muted-foreground">{p.base_url}</p>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ChatFeaturesDialog
