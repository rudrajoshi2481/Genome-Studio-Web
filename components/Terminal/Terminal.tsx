"use client";

import React, { useState, useEffect } from 'react'
import Appbar from './Appbar'
import TerminalInstance from './TerminalInstance'
import { useTerminalStore } from './store/terminal-store'
import './Terminal.css'

function Terminal() {
  const { tabs, activeTabId, createTab } = useTerminalStore()
  
  // Track which terminals have been rendered at least once
  const [renderedTabs, setRenderedTabs] = useState<Set<string>>(new Set())
  
  // Keep track of all tabs that have been rendered
  useEffect(() => {
    if (activeTabId && !renderedTabs.has(activeTabId)) {
      setRenderedTabs(prev => {
        const updated = new Set(prev)
        updated.add(activeTabId)
        return updated
      })
    }
  }, [activeTabId, renderedTabs])

  return (
    <div className="terminal-container">
      <Appbar />
      <div className="terminal-content">
        {tabs.map((tab) => {
          // Only render the tab if it's active or has been rendered before
          const shouldRender = renderedTabs.has(tab.id) || tab.id === activeTabId
          
          return (
            <div 
              key={tab.id}
              className="terminal-instance-container"
              style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
            >
              {shouldRender && <TerminalInstance tabId={tab.id} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Terminal