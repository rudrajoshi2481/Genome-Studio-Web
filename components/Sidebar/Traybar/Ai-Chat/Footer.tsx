import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendHorizontal } from 'lucide-react'

interface FooterProps {
  onSendMessage?: (message: string) => void;
}

function Footer({ onSendMessage }: FooterProps = {}) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return
    
    if (onSendMessage) {
      onSendMessage(inputValue.trim())
      setInputValue('')
      return
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="border-t p-3 bg-background">
      <div className="relative">
        <Textarea 
          placeholder="Ask me anything..."
          className="min-h-16 resize-none pr-12 text-sm"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button 
          size="icon" 
          variant="ghost" 
          className="absolute right-2 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          disabled={!inputValue.trim() || isLoading}
          onClick={handleSendMessage}
        >
          <SendHorizontal size={18} />
        </Button>
      </div>
    </div>
  )
}

export default Footer