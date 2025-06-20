"use client"

import React from 'react'
import Sidebar from '@/components/Sidebar/Sidebar'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import Terminal from '@/components/Terminal/Terminal'

// import Traybar from '@/components/Sidebar/Traybar/Traybar'
import EditorWindowStore from '@/components/EditorWindow/EditorWindow'

function Page() {
  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        <ResizablePanel defaultSize={20} minSize={5} maxSize={20}>
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle withHandle/>
        <ResizablePanel defaultSize={85} minSize={60} maxSize={85}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70} minSize={20} maxSize={100}>
              {/* <Canvas /> */}
              <EditorWindowStore />
            </ResizablePanel>
            <ResizableHandle withHandle/>
            <ResizablePanel defaultSize={30} minSize={3.5} maxSize={100}>
              <Terminal />
            </ResizablePanel> 
          </ResizablePanelGroup>
        </ResizablePanel>
        {/* <ResizableHandle withHandle/>
        <ResizablePanel defaultSize={25} minSize={5} maxSize={25}>
          <Traybar />
        </ResizablePanel> */}
      </ResizablePanelGroup>
    </div>
  )
}

export default Page