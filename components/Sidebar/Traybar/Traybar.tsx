import React from 'react'
import AIChat from './Ai-Chat/AIChat'

function Traybar({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l bg-background">
      <AIChat onClose={onClose} />
    </div>
  )
}

export default Traybar