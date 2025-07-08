"use client"

import React from 'react'
import Sidebar from '@/components/Sidebar/Sidebar'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import Terminal from '@/components/Terminal/Terminal'
import Traybar from '@/components/Sidebar/Traybar/Traybar'
import EditorWindowStore from '@/components/EditorWindow/EditorWindow'

function Page() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60} minSize={40} maxSize={80}>
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={70} minSize={30} maxSize={90}>
              <EditorWindowStore />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={10} maxSize={70}>
              <Terminal />
            </ResizablePanel> 
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
          <Traybar />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default Page
