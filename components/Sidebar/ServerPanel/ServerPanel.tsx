"use client"

import React from 'react'
import { Server, Construction } from 'lucide-react'

function ServerPanel() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-xs font-medium">Server</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-muted-foreground px-4">
        <Construction className="h-8 w-8 mb-3 opacity-50" />
        <p className="text-xs font-medium">PubSub is in development</p>
        <p className="text-[11px] mt-1 text-center opacity-70">
          Real-time publish/subscribe messaging is coming soon.
        </p>
      </div>
    </div>
  )
}

export default ServerPanel
