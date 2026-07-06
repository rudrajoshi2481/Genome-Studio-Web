import React from "react"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Save, AlertTriangle, Trash2, FolderOpen } from "lucide-react"
import type { ChatSettings } from "./useChatSettings"

export function SessionTab({ s }: { s: ChatSettings }) {
  const { keepIntermediateFiles, setKeepIntermediateFiles } = s

  return (
    <div className="space-y-5">
      {/* ─── Session Settings ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Save className="h-4 w-4 text-muted-foreground" />
              Session Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Configure how session data and intermediate files are handled.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-3 min-w-0 flex-1 mr-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Keep Intermediate Files</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Preserve fetched data, query results, and other intermediate files in the session folder instead of deleting them on cleanup.
                </p>
              </div>
            </div>
            <Switch
              checked={keepIntermediateFiles}
              onCheckedChange={setKeepIntermediateFiles}
              aria-label="Keep intermediate files"
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Danger Zone ─── */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-xs">
              Irreversible actions that affect local data.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Warning</AlertTitle>
            <AlertDescription className="text-xs">
              This action cannot be undone. All cached data will be permanently removed.
            </AlertDescription>
          </Alert>
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div className="flex items-start gap-3 min-w-0 flex-1 mr-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Clear All Cache & Storage</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Removes all localStorage, sessionStorage, and zustand persisted state except login token. The page will reload.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="h-9 gap-1.5 shrink-0"
              onClick={() => {
                if (!window.confirm('This will clear ALL cached data except login token. The page will reload. Continue?')) return;
                const PRESERVE_KEYS = new Set([
                  'auth_token',
                  'genome_studio_token',
                  'genome_studio_refresh_token',
                  'genome_studio_token_expiry',
                ]);
                const preserved: Record<string, string> = {};
                PRESERVE_KEYS.forEach(key => {
                  const val = localStorage.getItem(key);
                  if (val !== null) preserved[key] = val;
                });
                localStorage.clear();
                Object.entries(preserved).forEach(([key, val]) => {
                  localStorage.setItem(key, val);
                });
                sessionStorage.clear();
                window.location.reload();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
