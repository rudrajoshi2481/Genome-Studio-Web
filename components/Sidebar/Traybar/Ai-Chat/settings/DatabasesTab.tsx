import React from "react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCheck, XCircle, Search, Database } from "lucide-react"
import type { ChatSettings } from "./useChatSettings"

export function DatabasesTab({ s }: { s: ChatSettings }) {
  const { databases, dbSearch, setDbSearch, enabledDatabases, toggleDatabase, setEnabledDatabases } = s

  const filtered = databases.filter(db => {
    const q = dbSearch.toLowerCase()
    return db.name.toLowerCase().includes(q) ||
           db.description.toLowerCase().includes(q) ||
           db.category.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                Knowledge Databases
              </CardTitle>
              <CardDescription className="text-xs">
                Enable databases for the AI to search during conversations.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {enabledDatabases.length} / {databases.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {databases.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => setEnabledDatabases(databases.map(d => d.id))}
                disabled={enabledDatabases.length === databases.length}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Enable All
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => setEnabledDatabases([])}
                disabled={enabledDatabases.length === 0}
              >
                <XCircle className="h-3.5 w-3.5" />
                Disable All
              </Button>
            </div>
          )}

          {databases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Database className="h-8 w-8 opacity-40" />
              <p className="text-xs">No databases available.</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={dbSearch}
                  onChange={(e) => setDbSearch(e.target.value)}
                  placeholder="Search databases..."
                  className="h-9 text-sm pl-9"
                />
              </div>

              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No databases match &quot;{dbSearch}&quot;.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filtered.map((db) => {
                    const active = enabledDatabases.includes(db.id)
                    return (
                      <div
                        key={db.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all
                          ${active
                            ? "border-emerald-500/40 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                            : "border-muted hover:border-muted-foreground/30 hover:bg-muted/20"}`}
                      >
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="font-medium text-sm">{db.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{db.description}</p>
                          <Badge variant="outline" className="text-[10px] mt-1.5">{db.category}</Badge>
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
        </CardContent>
      </Card>
    </div>
  )
}
