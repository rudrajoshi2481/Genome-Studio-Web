"use client"

import React, { useState } from 'react'
import Toolbar from './Toolbar'
import Appbar from './Appbar'

function Sidebar() {
  const [activeComponent, setActiveComponent] = useState<React.ReactNode>(null)

  return (
    <div className="flex h-screen">
      <Toolbar onComponentChange={setActiveComponent} />
      
      {/* Content area to display the active component */}
      <div className="flex-1  overflow-auto border-r">
        <Appbar/>
        {activeComponent}
      </div>
    </div>
  )
}

export default Sidebar