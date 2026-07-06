import React, { useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Server, Bot, Database, Shield, Save,
  Loader2, Settings,
} from "lucide-react"
import { useChatSettings } from "./settings/useChatSettings"
import { ProvidersTab } from "./settings/ProvidersTab"
import { DatabasesTab } from "./settings/DatabasesTab"
import { AgentsTab } from "./settings/AgentsTab"
import { PermissionsTab } from "./settings/PermissionsTab"
import { SessionTab } from "./settings/SessionTab"

interface ChatFeaturesDialogProps {
  children: React.ReactNode
  tooltipText?: string
}

function ChatFeaturesDialog({ children, tooltipText = "AI Chat Settings" }: ChatFeaturesDialogProps) {
  const [open, setOpen] = useState(false)
  const s = useChatSettings(open)

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
      <DialogContent className="sm:max-w-[920px] w-[920px] max-h-[90vh] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings className="h-4 w-4" />
            </div>
            AI Chat Settings
          </DialogTitle>
          <DialogDescription className="text-xs ml-9">
            Configure providers, databases, agents, permissions, and session preferences.
          </DialogDescription>
        </DialogHeader>

        {s.loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Loading configuration...</p>
          </div>
        )}

        {s.error && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-destructive">{s.error}</p>
          </div>
        )}

        {!s.loading && !s.error && (
          <Tabs defaultValue="providers" className="flex-1 min-h-0 flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-5 h-10 bg-muted/50">
                <TabsTrigger value="providers" className="text-xs gap-1.5 rounded-lg">
                  <Server className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Providers</span>
                </TabsTrigger>
                <TabsTrigger value="databases" className="text-xs gap-1.5 rounded-lg">
                  <Database className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Databases</span>
                </TabsTrigger>
                <TabsTrigger value="agents" className="text-xs gap-1.5 rounded-lg">
                  <Bot className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Agents</span>
                </TabsTrigger>
                <TabsTrigger value="permissions" className="text-xs gap-1.5 rounded-lg">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Permissions</span>
                </TabsTrigger>
                <TabsTrigger value="session" className="text-xs gap-1.5 rounded-lg">
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Session</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <Separator className="mt-4" />

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-5">
                <TabsContent value="providers" className="mt-0 focus-visible:outline-none">
                  <ProvidersTab s={s} />
                </TabsContent>
                <TabsContent value="databases" className="mt-0 focus-visible:outline-none">
                  <DatabasesTab s={s} />
                </TabsContent>
                <TabsContent value="agents" className="mt-0 focus-visible:outline-none">
                  <AgentsTab s={s} />
                </TabsContent>
                <TabsContent value="permissions" className="mt-0 focus-visible:outline-none">
                  <PermissionsTab s={s} />
                </TabsContent>
                <TabsContent value="session" className="mt-0 focus-visible:outline-none">
                  <SessionTab s={s} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ChatFeaturesDialog
