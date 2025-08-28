import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Database, Globe, Plus, SendHorizontal, Settings } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ChatFeaturesDialog from './ChatFeaturesDialog'

interface FooterProps {
  onSendMessage?: (message: string) => void;
}

function Footer({ onSendMessage }: FooterProps = {}) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4')

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    console.log('Selected AI Model:', value)
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return
    if (onSendMessage) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className=" rounded-xl border">
      <div className="relative flex items-center min-w-0 ">
        <Textarea
          cols={1}
          placeholder="Ask me anything..."
          className="min-h-6 resize-none pr-12 text-xs bg-transparent focus:ring-0 border-none shadow-none"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
       
      </div>
      <Separator />
     <div className="flex items-center gap-2">
  {/* Icon Buttons */}
  <div className="flex items-center gap-1 overflow-hidden">
    {/* Chat Features Dialog */}
    <ChatFeaturesDialog>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Configure data sources and features">
      <Settings size={14} />
      </Button>
    </ChatFeaturesDialog>
    
    {/* Model Selection */}
    <Select value={selectedModel} onValueChange={handleModelChange}>
      <SelectTrigger className="h-4 w-30 text-xs border-none bg-transparent hover:bg-muted/50 focus:ring-0 px-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-32">
        <SelectItem value="gpt-4" className="text-xs">GPT-4</SelectItem>
        <SelectItem value="gpt-3.5-turbo" className="text-xs">GPT-3.5</SelectItem>
        <SelectItem value="claude-3-sonnet" className="text-xs">Claude Sonnet</SelectItem>
        <SelectItem value="claude-3-haiku" className="text-xs">Claude Haiku</SelectItem>
        <SelectItem value="gemini-pro" className="text-xs">Gemini Pro</SelectItem>
        <SelectItem value="llama-2" className="text-xs">Llama 2</SelectItem>
        <SelectItem value="mistral-7b" className="text-xs">Mistral 7B</SelectItem>
      </SelectContent>
    </Select>
    
   
  </div>
  {/* Send Button */}
  <div className="ml-auto pr-1 p-1   ">
    <Button
      size="sm"
      variant="ghost"
      className="h-5 w-5 p-0 rounded-full bg-primary/80 text-white hover:bg-primary transition-colors disabled:opacity-50"
      disabled={!inputValue.trim() || isLoading}
      onClick={handleSendMessage}
      aria-label="Send message"
    >
      <SendHorizontal size={12} />
    </Button>
  </div>
</div>
    </div>
  )
}



export default Footer

