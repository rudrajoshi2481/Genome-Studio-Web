import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Database, Globe, Plus, SendHorizontal, Settings } from 'lucide-react'
import { Separator } from '@/components/ui/separator';

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
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="border">
      <div className="relative flex items-center">
        <Textarea
          cols={1}
          placeholder="Ask me anything..."
          className="min-h-12 resize-none pr-14 text-sm bg-transparent focus:ring-0 border-none shadow-none"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
       
      </div>
      <Separator />
     <div className="flex items-center gap-2">
  {/* Icon Buttons */}
  <div className="flex items-center gap-1">
    <Button size="icon" variant="ghost" className="rounded-full">
      <Plus size={20} />
    </Button>
    <Button size="icon" variant="ghost" className="rounded-full">
      <Globe size={20} />
    </Button>
    <Button size="icon" variant="ghost" className="rounded-full">
      <Database size={20} />
    </Button>
    <Button size="icon" variant="ghost" className="rounded-full">
      <Settings size={20} />
    </Button>
  </div>
  {/* Send Button */}
  <div className="ml-auto pr-2">
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 rounded-full bg-primary/80 text-white hover:bg-primary transition-colors disabled:opacity-50"
      disabled={!inputValue.trim() || isLoading}
      onClick={handleSendMessage}
      aria-label="Send message"
    >
      <SendHorizontal size={20} />
    </Button>
  </div>
</div>
    </div>
  )
}



export default Footer


// import React, { useState } from 'react'
// import { Button } from '@/components/ui/button'
// import { Textarea } from '@/components/ui/textarea'
// import { SendHorizontal } from 'lucide-react'

// interface FooterProps {
//   onSendMessage?: (message: string) => void;
// }

// function Footer({ onSendMessage }: FooterProps = {}) {
//   const [inputValue, setInputValue] = useState('')
//   const [isLoading, setIsLoading] = useState(false)

//   const handleSendMessage = () => {
//     if (!inputValue.trim() || isLoading) return
    
//     if (onSendMessage) {
//       onSendMessage(inputValue.trim())
//       setInputValue('')
//       return
//     }
//   }

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
//       e.preventDefault()
//       handleSendMessage()
//     }
//   }

//   return (
//     <div className="border-t p-3 bg-background">
//       <div className="relative">
//         <Textarea 
//           cols={1}
//           placeholder="Ask me anything..."
//           className="min-h-16 resize-none pr-12 text-sm"
//           value={inputValue}
//           onChange={(e) => setInputValue(e.target.value)}
//           onKeyDown={handleKeyDown}
//           disabled={isLoading}
//         />
//         <Button 
//           size="icon" 
//           variant="ghost" 
//           className="absolute right-2 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground"
//           disabled={!inputValue.trim() || isLoading}
//           onClick={handleSendMessage}
//         >
//           <SendHorizontal size={18} />
//         </Button>
//       </div>
//     </div>
//   )
// }

// export default Footer