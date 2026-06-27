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

function Page() {
  const [mounted, setMounted] = useState(false)
  const [traybarOpen, setTraybarOpen] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeComponent, setActiveComponent] = useState<React.ReactNode>(null)

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
      <Toolbar onComponentChange={setActiveComponent} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <ResizablePanelGroup key="dashboard-main" direction="horizontal" className="h-full flex-1">
        <ResizablePanel defaultSize={sidebarOpen ? 20 : 0} minSize={sidebarOpen ? 10 : 0} maxSize={30} className={!sidebarOpen ? 'hidden' : ''}>
          <div className="flex flex-col h-full overflow-y-hidden border-r">
            <Appbar />
            {activeComponent}
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
        <ResizableHandle className={!traybarOpen ? 'hidden' : ''} />
        <ResizablePanel defaultSize={traybarOpen ? 20 : 0} minSize={traybarOpen ? 5 : 0} maxSize={50} className={!traybarOpen ? 'hidden' : ''}>
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
