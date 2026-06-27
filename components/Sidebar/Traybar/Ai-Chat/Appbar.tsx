import { Button } from '@/components/ui/button'
import { Sparkles, Plus, History, PanelRightClose } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useChatStore } from './components/chatStore'
import React from 'react'

function Appbar({ onNewChat, onToggleHistory, showHistory, onClose }: { onNewChat?: () => void; onToggleHistory?: () => void; showHistory?: boolean; onClose?: () => void }) {
  const { clearMessages, setCurrentConversation, isConnected } = useChatStore()

  const handleNewChat = () => {
    setCurrentConversation(null)
    clearMessages()
    onNewChat?.()
  }

  return (
    <TooltipProvider>
    <div className="px-2.5 py-2 border-b flex justify-between items-center bg-background shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="h-5 w-5 rounded-md bg-gradient-to-br from-primary/80 to-primary/60 flex items-center justify-center shrink-0">
          <Sparkles className="h-3 w-3 text-primary-foreground" />
        </div>
        <span className="font-semibold text-xs truncate">Genome Studio AI</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 shrink-0 border ${showHistory ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
              onClick={onToggleHistory}
            >
              <History size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {showHistory ? 'Hide history' : 'Show history'}
          </TooltipContent>
        </Tooltip>
        <span
          className={`size-1.5 rounded-full shrink-0 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      </div>

      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleNewChat}
            >
              <Plus size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            New chat
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onClose}
            >
              <PanelRightClose size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Close panel
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
    </TooltipProvider>
  )
}

export default Appbar