import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SendHorizontal, Mic, Paperclip, Sparkles } from 'lucide-react'
import React, { useState } from 'react'

function Footer() {
  const [inputValue, setInputValue] = useState('')
  const [selectedMode, setSelectedMode] = useState('chat')

  return (
    <div className="border-t p-3 bg-background">
      <div className="relative">
        <Textarea 
          placeholder="Ask me anything..."
          className="min-h-24 resize-none pr-12 text-sm"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <Button 
          size="icon" 
          variant="ghost" 
          className="absolute right-2 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          disabled={!inputValue.trim()}
        >
          <SendHorizontal size={18} />
        </Button>
      </div>
      
      <div className='mt-2 flex justify-between items-center'>
        <div className='flex gap-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={selectedMode === 'chat' ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedMode('chat')}
                >
                  <Sparkles size={14} className="mr-1" /> Chat
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Chat with AI assistant</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={selectedMode === 'write' ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedMode('write')}
                >
                  <Paperclip size={14} className="mr-1" /> Write
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Generate content</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Mic size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Voice input</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className='flex items-center gap-2'>
          <Select defaultValue="model-1">
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="model-1">GPT-4o</SelectItem>
              <SelectItem value="model-2">Claude 3</SelectItem>
              <SelectItem value="model-3">Gemini Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export default Footer