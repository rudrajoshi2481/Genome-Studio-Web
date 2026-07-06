import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2, XCircle, Loader2, RotateCcw,
  ShieldCheck, ShieldAlert, Shield,
} from "lucide-react"
import type { ChatSettings } from "./useChatSettings"

export function PermissionsTab({ s }: { s: ChatSettings }) {
  const {
    permissionMode, permAllowedTools, permDeniedTools,
    permSaving, permError, handleSetPermissionMode, handleResetPermissions,
  } = s

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Permission Mode
            </CardTitle>
            <CardDescription className="text-xs">
              Control how the AI agent handles tool execution approvals.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`flex flex-col items-start gap-2.5 p-4 rounded-lg border text-left transition-all
                ${permissionMode === 'bypass'
                  ? 'border-emerald-500/50 bg-emerald-50/40 dark:border-emerald-800/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20'
                  : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/20'}`}
              onClick={() => handleSetPermissionMode('bypass')}
              disabled={permSaving}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg
                ${permissionMode === 'bypass' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Bypass (Lytic)</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Auto-approve all tool calls. No confirmation prompts.
                </p>
              </div>
            </button>

            <button
              className={`flex flex-col items-start gap-2.5 p-4 rounded-lg border text-left transition-all
                ${permissionMode === 'default'
                  ? 'border-amber-500/50 bg-amber-50/40 dark:border-amber-800/50 dark:bg-amber-950/20 ring-1 ring-amber-500/20'
                  : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/20'}`}
              onClick={() => handleSetPermissionMode('default')}
              disabled={permSaving}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg
                ${permissionMode === 'default' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Default</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ask before destructive tools (write, edit, run_command).
                </p>
              </div>
            </button>
          </div>

          {permSaving && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating permission mode...
            </div>
          )}

          {permError && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{permError}</AlertDescription>
            </Alert>
          )}

          {(permAllowedTools.length > 0 || permDeniedTools.length > 0) && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Tool Permissions</p>
                {permAllowedTools.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground">Allowed</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {permAllowedTools.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {permDeniedTools.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground">Denied</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {permDeniedTools.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] text-red-500 border-red-500/30 gap-1">
                          <XCircle className="h-2.5 w-2.5" /> {t}
                        </Badge>
                      ))}
                    </div>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
