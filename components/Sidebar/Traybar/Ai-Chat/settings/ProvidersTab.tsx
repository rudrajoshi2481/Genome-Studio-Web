import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Cpu, CheckCircle2, XCircle, Loader2, Link2, Save, RotateCcw,
  Wifi, WifiOff, Key, Eye, EyeOff, AlertTriangle, ExternalLink,
} from "lucide-react"
import type { ChatSettings } from "./useChatSettings"

function StatusInline({ result, error }: { result: { reachable: boolean; message: string } | null; error: string | null }) {
  if (error) return <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{error}</p>
  if (!result) return null
  return (
    <p className={`text-[11px] flex items-center gap-1 ${result.reachable ? "text-emerald-600" : "text-amber-600"}`}>
      {result.reachable ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {result.message}
    </p>
  )
}

export function ProvidersTab({ s }: { s: ChatSettings }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">

        {/* ─── Providers List ─── */}
        <div className="px-4 pt-3 pb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Cpu className="h-3.5 w-3.5" />
            LLM Providers
          </div>
          {s.providers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No providers configured.</p>
          ) : (
            <div className="space-y-1.5">
              {s.providers.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-md border transition-all
                    ${p.available
                      ? "border-emerald-500/30 bg-emerald-50/30 dark:border-emerald-800/30 dark:bg-emerald-950/15"
                      : "border-muted bg-muted/10"}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${p.available ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-xs truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{p.base_url}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium shrink-0 ml-2 ${p.available ? "text-emerald-600" : "text-red-500"}`}>
                    {p.available ? "Online" : "Offline"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* ─── Ollama URL ─── */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Link2 className="h-3.5 w-3.5" />
              Ollama URL
            </div>
            {s.isCustomUrl && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-0.5">
                <Wifi className="h-2.5 w-2.5" /> Custom
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Point to a local or remote Ollama server.</p>
          <div className="flex gap-2">
            <Input
              value={s.ollamaUrl}
              onChange={(e) => {
                s.setOllamaUrl(e.target.value)
                s.setUrlTestResult(null)
                s.setUrlError(null)
              }}
              placeholder="http://localhost:11434"
              className="h-8 text-xs font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 text-xs gap-1.5"
              onClick={s.handleTestUrl}
              disabled={s.urlTesting || !s.ollamaUrl.trim()}
            >
              {s.urlTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
              Test
            </Button>
          </div>
          <StatusInline result={s.urlTestResult} error={s.urlError} />
          <div className="flex items-center gap-2 pt-0.5">
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1.5"
              onClick={s.handleSaveUrl}
              disabled={s.urlSaving || !s.ollamaUrl.trim()}
            >
              {s.urlSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save & Apply
            </Button>
            {s.isCustomUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5"
                onClick={s.handleResetUrl}
                disabled={s.urlSaving}
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
          {s.ollamaUrlEnv && (
            <p className="text-[10px] text-muted-foreground">
              Default: <span className="font-mono">{s.ollamaUrlEnv}</span>
            </p>
          )}
        </div>

        <Separator />

        {/* ─── Z.ai API Key ─── */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Key className="h-3.5 w-3.5" />
              Z.ai API Key
            </div>
            <div className="flex items-center gap-1">
              {s.zaiKeyIsSet && (
                <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Set
                </span>
              )}
              {s.zaiKeyIsCustom && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Custom</Badge>
              )}
              {s.zaiKeyIsFromEnv && (
                <span className="text-[9px] text-muted-foreground">Env</span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Cloud GLM models.{" "}
            <a href="https://z.ai/manage-apikey/apikey-list" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
              Get key <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </p>

          {/* Display mode */}
          {s.zaiKeyIsSet && !s.zaiKeyEditing && (
            <div className="space-y-1.5">
              {s.zaiKeyIdMasked && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">Key ID</span>
                  <div className="flex-1 px-2.5 py-1.5 rounded-md border bg-muted/30 font-mono text-[11px] text-muted-foreground truncate">
                    {s.zaiKeyIdMasked}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-16 shrink-0">API Key</span>
                <div className="flex-1 px-2.5 py-1.5 rounded-md border bg-muted/30 font-mono text-[11px] text-muted-foreground truncate">
                  {s.zaiKeyMasked}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 text-xs"
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
              {s.zaiKeyIsCustom && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] gap-1 text-red-500 hover:text-red-600 p-0"
                  onClick={s.handleResetZaiKey}
                  disabled={s.zaiKeySaving}
                >
                  {s.zaiKeySaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  Clear Custom Key
                </Button>
              )}
            </div>
          )}

          {/* Edit mode */}
          {(!s.zaiKeyIsSet || s.zaiKeyEditing) && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-16 shrink-0">Key ID</span>
                <Input
                  value={s.zaiApiKeyId}
                  onChange={(e) => {
                    s.setZaiApiKeyId(e.target.value)
                    s.setZaiKeyTestResult(null)
                    s.setZaiKeyError(null)
                  }}
                  placeholder="e.g. fb60...5fa2"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-16 shrink-0">API Key</span>
                <div className="relative flex-1">
                  <Input
                    type={s.zaiKeyShow ? "text" : "password"}
                    value={s.zaiApiKey}
                    onChange={(e) => {
                      s.setZaiApiKey(e.target.value)
                      s.setZaiKeyTestResult(null)
                      s.setZaiKeyError(null)
                    }}
                    placeholder="Enter Z.ai API key"
                    className="h-8 text-xs font-mono pr-8"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-0 top-0 h-8 w-8 p-0"
                    onClick={() => s.setZaiKeyShow(!s.zaiKeyShow)}
                  >
                    {s.zaiKeyShow ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={s.handleTestZaiKey}
                    disabled={s.zaiKeyTesting || !s.zaiApiKey.trim()}
                  >
                    {s.zaiKeyTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 text-xs gap-1.5"
                    onClick={s.handleSaveZaiKey}
                    disabled={s.zaiKeySaving || !s.zaiApiKey.trim()}
                  >
                    {s.zaiKeySaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </Button>
                </div>
              </div>
              {s.zaiKeyEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] p-0"
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
        </div>

      </CardContent>
    </Card>
  )
}
