"use client"

import React, { useState } from 'react'
import Toolbar from './Toolbar'
import Appbar from './Appbar'
import { FileExplorer_New } from './FileExplorer_New'
import Nodebar from './Nodebar/Nodebar'
import PackageManager from './PackageManager/PackageManager'
import CronJobs from './CronJobs/CronJobs'
import ServerPanel from './ServerPanel/ServerPanel'
import { cn } from '@/lib/utils'

function Sidebar() {
  const [activeItem, setActiveItem] = useState<string>('File Explorer (New)')

  return (
    <div className="flex h-screen">
      <Toolbar onActiveItemChange={setActiveItem} />
      
      {/* Content area to display the active component */}
      <div className="flex-1 overflow-y-hidden border-r">
        <Appbar/>
        <div className="flex-1 min-h-0 relative">
          <div className={cn("absolute inset-0", activeItem === 'File Explorer (New)' ? 'block' : 'hidden')}><FileExplorer_New /></div>
          <div className={cn("absolute inset-0", activeItem === 'Nodebar' ? 'block' : 'hidden')}><Nodebar /></div>
          <div className={cn("absolute inset-0", activeItem === 'Package Manager' ? 'block' : 'hidden')}><PackageManager /></div>
          <div className={cn("absolute inset-0", activeItem === 'Cron Jobs' ? 'block' : 'hidden')}><CronJobs /></div>
          <div className={cn("absolute inset-0", activeItem === 'Server' ? 'block' : 'hidden')}><ServerPanel /></div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar