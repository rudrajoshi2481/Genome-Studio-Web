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
// import EditorWindowStore from '@/components/EditorWindow/EditorWindow'
import EditorWindow from '@/components/Editorwindow_new/EditorWindow'

function Page() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle withHandle={true}/>
        <ResizablePanel defaultSize={60} minSize={40} maxSize={80}>
          <ResizablePanelGroup direction="vertical" >
            <ResizablePanel defaultSize={70} minSize={20} maxSize={90}>
              {/* <EditorWindowStore /> */}
              
                <EditorWindow />
              
            </ResizablePanel>
            <ResizableHandle withHandle={true}/>
            <ResizablePanel defaultSize={30} minSize={10} maxSize={70}>
              <Terminal />
            </ResizablePanel> 
          </ResizablePanelGroup>
        </ResizablePanel>
        {/* <ResizableHandle />
        <ResizablePanel defaultSize={20} minSize={5} maxSize={50}>
          <Traybar />
        </ResizablePanel> */}
      </ResizablePanelGroup>
    </div>
  )
}

export default Page
