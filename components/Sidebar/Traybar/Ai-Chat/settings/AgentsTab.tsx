import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Zap, Terminal, BookOpen, type LucideIcon } from "lucide-react"
import type { ChatSettings } from "./useChatSettings"

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
      <Icon className="h-6 w-6 opacity-40" />
      <p className="text-xs">{text}</p>
    </div>
  )
}

export function AgentsTab({ s }: { s: ChatSettings }) {
  return (
    <div className="space-y-5">
      {/* ─── Agents ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                Agents
              </CardTitle>
              <CardDescription className="text-xs">
                Custom agent personas with specialized behavior.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">{s.agents.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {s.agents.length === 0 ? (
            <EmptyState icon={Bot} text="No custom agents loaded." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {s.agents.map((a) => (
                <div key={a.name} className="p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <p className="font-medium text-sm truncate">{a.name}</p>
                  </div>
                  {a.description && (
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{a.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Skills ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Skills
              </CardTitle>
              <CardDescription className="text-xs">
                Specialized capabilities the agent can invoke.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">{s.skills.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {s.skills.length === 0 ? (
            <EmptyState icon={Zap} text="No skills loaded." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {s.skills.map((sk) => (
                <div key={sk.name} className="p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <p className="font-medium text-sm truncate">{sk.name}</p>
                  </div>
                  {sk.description && (
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{sk.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Slash Commands ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                Slash Commands
              </CardTitle>
              <CardDescription className="text-xs">
                Quick actions triggered with a slash prefix.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">{s.commands.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {s.commands.length === 0 ? (
            <EmptyState icon={Terminal} text="No commands loaded." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {s.commands.map((c) => (
                <div key={c.name} className="p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Terminal className="h-3.5 w-3.5" />
                    </div>
                    <p className="font-medium text-sm font-mono">/{c.name}</p>
                  </div>
                  {c.description && (
                    <p className="text-[11px] text-muted-foreground mt-2">{c.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Knowledge Base ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Knowledge Base
            </CardTitle>
            <CardDescription className="text-xs">
              Persistent knowledge entries and instruction files.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {s.knowledgeStats ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <BookOpen className="h-2.5 w-2.5" />
                  {s.knowledgeStats.total_entries ?? 0} entries
                </Badge>
                {s.knowledgeStats.categories && Object.entries(s.knowledgeStats.categories).map(([cat, count]) => (
                  <Badge key={cat} variant="outline" className="text-[10px]">
                    {cat}: {count as number}
                  </Badge>
                ))}
              </div>
              {s.instructions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground font-medium">Instruction files:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.instructions.map((f, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-mono gap-1">
                        <BookOpen className="h-2.5 w-2.5" />
                        {f.name || f.path}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={BookOpen} text="Knowledge base not available." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
