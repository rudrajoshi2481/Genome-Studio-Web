"use client"

import React, { useState, useEffect } from 'react'
import { PanelRightOpen } from 'lucide-react'
import Toolbar from '@/components/Sidebar/Toolbar'
import Appbar from '@/components/Sidebar/Appbar'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import Terminal from '@/components/Terminal/Terminal'
import Traybar from '@/components/Sidebar/Traybar/Traybar'
import EditorWindow from '@/components/Editorwindow_new/EditorWindow'
import { cn } from '@/lib/utils'
import { FileExplorer_New } from '@/components/Sidebar/FileExplorer_New'
import Nodebar from '@/components/Sidebar/Nodebar/Nodebar'
import PackageManager from '@/components/Sidebar/PackageManager/PackageManager'
import CronJobs from '@/components/Sidebar/CronJobs/CronJobs'
import Extensions from '@/components/Sidebar/Extensions/Extensions'
import ServerPanel from '@/components/Sidebar/ServerPanel/ServerPanel'

function Page() {
  const [mounted, setMounted] = useState(false)
  const [traybarOpen, setTraybarOpen] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeItem, setActiveItem] = useState<string>('File Explorer (New)')

  useEffect(() => {
    setTraybarOpen(localStorage.getItem('dashboard_traybarOpen') !== 'false')
    setSidebarOpen(localStorage.getItem('dashboard_sidebarOpen') !== 'false')
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) localStorage.setItem('dashboard_traybarOpen', String(traybarOpen))
  }, [traybarOpen, mounted])

  useEffect(() => {
    if (mounted) localStorage.setItem('dashboard_sidebarOpen', String(sidebarOpen))
  }, [sidebarOpen, mounted])

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      <Toolbar onActiveItemChange={setActiveItem} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <ResizablePanelGroup key="dashboard-main" direction="horizontal" className="h-full flex-1">
        <ResizablePanel defaultSize={sidebarOpen ? 20 : 0} minSize={sidebarOpen ? 10 : 0} maxSize={30} className={!sidebarOpen ? 'hidden' : ''}>
          <div className="flex flex-col h-full overflow-y-hidden border-r">
            <Appbar />
            <div className="flex-1 min-h-0 relative">
              <div className={cn("absolute inset-0", activeItem === 'File Explorer (New)' ? 'block' : 'hidden')}><FileExplorer_New /></div>
              <div className={cn("absolute inset-0", activeItem === 'Nodebar' ? 'block' : 'hidden')}><Nodebar /></div>
              <div className={cn("absolute inset-0", activeItem === 'Package Manager' ? 'block' : 'hidden')}><PackageManager /></div>
              <div className={cn("absolute inset-0", activeItem === 'Cron Jobs' ? 'block' : 'hidden')}><CronJobs /></div>
              <div className={cn("absolute inset-0", activeItem === 'Extensions' ? 'block' : 'hidden')}><Extensions /></div>
              <div className={cn("absolute inset-0", activeItem === 'Server' ? 'block' : 'hidden')}><ServerPanel /></div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle={true} className={!sidebarOpen ? 'hidden' : ''} />
        <ResizablePanel defaultSize={traybarOpen ? (sidebarOpen ? 60 : 80) : (sidebarOpen ? 80 : 100)} minSize={40} maxSize={100}>
          <ResizablePanelGroup direction="vertical" autoSaveId="dashboard-vertical">
            <ResizablePanel defaultSize={70} minSize={20} maxSize={90}>
                <EditorWindow />
            </ResizablePanel>
            <ResizableHandle withHandle={true}/>
            <ResizablePanel defaultSize={30} minSize={10} maxSize={70}>
              <Terminal />
            </ResizablePanel> 
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle={true} className={!traybarOpen ? 'hidden' : ''} />
        <ResizablePanel defaultSize={traybarOpen ? 20 : 0} minSize={traybarOpen ? 25 : 0} maxSize={50} className={!traybarOpen ? 'hidden' : ''}>
          <Traybar onClose={() => setTraybarOpen(false)} />
        </ResizablePanel>
      </ResizablePanelGroup>
      {!traybarOpen && (
        <button
          onClick={() => setTraybarOpen(true)}
          className="absolute right-2 top-1 z-50 flex h-6 items-center justify-center gap-1.5 rounded-md border bg-background px-2 text-foreground shadow-[0_0_10px_2px_rgba(99,102,241,0.4)] hover:shadow-[0_0_15px_4px_rgba(99,102,241,0.6)] hover:bg-accent transition-shadow duration-300"
          title="Open Traybar"
        >
          <PanelRightOpen className="h-4 w-4" />
          <span className="text-xs font-medium">Ask AI</span>
        </button>
      )}
    </div>
  )
}

export default Page
