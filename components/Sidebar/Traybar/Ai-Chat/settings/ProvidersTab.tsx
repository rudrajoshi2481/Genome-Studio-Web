import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Cpu, CheckCircle2, XCircle, Loader2, Link2, Save, RotateCcw,
  Wifi, Key, Eye, EyeOff, AlertTriangle, ExternalLink, Server, Cloud,
} from "lucide-react"
import type { ChatSettings } from "./useChatSettings"

function StatusInline({ result, error }: { result: { reachable: boolean; message: string } | null; error: string | null }) {
  if (error) return (
    <p className="text-xs text-destructive flex items-center gap-1.5 mt-2">
      <AlertTriangle className="h-3.5 w-3.5" />{error}
    </p>
  )
  if (!result) return null
  return (
    <p className={`text-xs flex items-center gap-1.5 mt-2 ${result.reachable ? "text-emerald-600" : "text-amber-600"}`}>
      {result.reachable ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {result.message}
    </p>
  )
}

export function ProvidersTab({ s }: { s: ChatSettings }) {
  return (
    <div className="space-y-5">

      {/* ─── Providers Overview ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">LLM Providers</h3>
        </div>
        {s.providers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-lg">
            No providers configured.
          </p>
        ) : (
          <div className="grid gap-2.5">
            {s.providers.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all
                  ${p.available
                    ? "border-emerald-500/30 bg-emerald-50/40 dark:border-emerald-800/30 dark:bg-emerald-950/15"
                    : "border-border bg-muted/20"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background ${p.available ? "bg-emerald-500" : "bg-red-500"}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{p.base_url}</p>
                  </div>
                </div>
                <Badge
                  variant={p.available ? "default" : "secondary"}
                  className={`shrink-0 ml-3 gap-1 ${p.available ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}
                >
                  {p.available ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {p.available ? "Online" : "Offline"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Ollama Configuration ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Server className="h-4 w-4 text-muted-foreground" />
              Ollama Server
            </CardTitle>
            {s.isCustomUrl && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Wifi className="h-3 w-3" /> Custom
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Point to a local or remote Ollama server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ollama-url" className="text-xs text-muted-foreground">Server URL</Label>
            <div className="flex gap-2">
              <Input
                id="ollama-url"
                value={s.ollamaUrl}
                onChange={(e) => {
                  s.setOllamaUrl(e.target.value)
                  s.setUrlTestResult(null)
                  s.setUrlError(null)
                }}
                placeholder="http://localhost:11434"
                className="h-9 text-sm font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-9 shrink-0 gap-1.5"
                onClick={s.handleTestUrl}
                disabled={s.urlTesting || !s.ollamaUrl.trim()}
              >
                {s.urlTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                Test
              </Button>
            </div>
          </div>
          <StatusInline result={s.urlTestResult} error={s.urlError} />
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1.5"
              onClick={s.handleSaveUrl}
              disabled={s.urlSaving || !s.ollamaUrl.trim()}
            >
              {s.urlSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save &amp; Apply
            </Button>
            {s.isCustomUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5"
                onClick={s.handleResetUrl}
                disabled={s.urlSaving}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
          {s.ollamaUrlEnv && (
            <p className="text-xs text-muted-foreground pt-1">
              Default: <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted border border-border/40">{s.ollamaUrlEnv}</code>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Z.ai API Key ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Cloud className="h-4 w-4 text-muted-foreground" />
              Z.ai Cloud
            </CardTitle>
            <div className="flex items-center gap-1.5">
              {s.zaiKeyIsSet && (
                <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Set
                </Badge>
              )}
              {s.zaiKeyIsCustom && (
                <Badge variant="secondary" className="text-[10px]">Custom</Badge>
              )}
              {s.zaiKeyIsFromEnv && (
                <Badge variant="outline" className="text-[10px]">Env</Badge>
              )}
            </div>
          </div>
          <CardDescription className="text-xs">
            Cloud GLM models.{" "}
            <a href="https://z.ai/manage-apikey/apikey-list" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
              Get key <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">

          {/* Display mode */}
          {s.zaiKeyIsSet && !s.zaiKeyEditing && (
            <div className="space-y-2.5">
              {s.zaiKeyIdMasked && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Key ID</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-md border bg-muted/30 font-mono text-sm text-muted-foreground truncate">
                      {s.zaiKeyIdMasked}
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-md border bg-muted/30 font-mono text-sm text-muted-foreground truncate">
                    {s.zaiKeyMasked}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 shrink-0"
                    onClick={() => {
                      s.setZaiKeyEditing(true)
                      s.setZaiApiKey("")
                      s.setZaiApiKeyId("")
                      s.setZaiKeyTestResult(null)
                      s.setZaiKeyError(null)
                    }}
                  >
                    Change
                  </Button>
                </div>
              </div>
              {s.zaiKeyIsCustom && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
                  onClick={s.handleResetZaiKey}
                  disabled={s.zaiKeySaving}
                >
                  {s.zaiKeySaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Clear Custom Key
                </Button>
              )}
            </div>
          )}

          {/* Edit mode */}
          {(!s.zaiKeyIsSet || s.zaiKeyEditing) && (
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="zai-key-id" className="text-xs text-muted-foreground">Key ID</Label>
                <Input
                  id="zai-key-id"
                  value={s.zaiApiKeyId}
                  onChange={(e) => {
                    s.setZaiApiKeyId(e.target.value)
                    s.setZaiKeyTestResult(null)
                    s.setZaiKeyError(null)
                  }}
                  placeholder="e.g. fb60...5fa2"
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zai-api-key" className="text-xs text-muted-foreground">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="zai-api-key"
                      type={s.zaiKeyShow ? "text" : "password"}
                      value={s.zaiApiKey}
                      onChange={(e) => {
                        s.setZaiApiKey(e.target.value)
                        s.setZaiKeyTestResult(null)
                        s.setZaiKeyError(null)
                      }}
                      placeholder="Enter Z.ai API key"
                      className="h-9 text-sm font-mono pr-9"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-0 top-0 h-9 w-9 p-0"
                      onClick={() => s.setZaiKeyShow(!s.zaiKeyShow)}
                    >
                      {s.zaiKeyShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 shrink-0 gap-1.5"
                    onClick={s.handleTestZaiKey}
                    disabled={s.zaiKeyTesting || !s.zaiApiKey.trim()}
                  >
                    {s.zaiKeyTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-9 shrink-0 gap-1.5"
                    onClick={s.handleSaveZaiKey}
                    disabled={s.zaiKeySaving || !s.zaiApiKey.trim()}
                  >
                    {s.zaiKeySaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </div>
              </div>
              {s.zaiKeyEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    s.setZaiKeyEditing(false)
                    s.setZaiApiKey("")
                    s.setZaiApiKeyId("")
                    s.setZaiKeyError(null)
                    s.setZaiKeyTestResult(null)
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          <StatusInline result={s.zaiKeyTestResult} error={s.zaiKeyError} />
        </CardContent>
      </Card>

    </div>
  )
}
