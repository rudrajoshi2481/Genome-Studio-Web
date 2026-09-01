import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Dna, FolderOpen, Terminal, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import type { TabFile } from '@/components/FileTabs/useTabStore'
import { useDialogStore } from '@/components/FileTabs/useDialogStore'
import DialogProvider from '../FileTabs/DialogProvider'
import FileTab from '../FileTabs/FileTab'
import { EditorProvider } from './context/EditorContext'
import EditorFactory from './components/EditorFactory'
import { cn } from '@/lib/utils'

/**
 * EditorWindowContent — renders only the currently active tab.
 * This avoids mounting every editor instance at once.
 */
const EditorWindowContent = memo(() => {
  const activeTab = useTabStore(state =>
    state.activeTabId ? state.tabs.get(state.activeTabId) || null : null
  )
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
  }, [])

  if (!activeTab) {
    return <NoFileState />
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" key={activeTab.id}>
      <EditorFactory
        tabId={activeTab.id}
        filePath={activeTab.path}
        extension={activeTab.extension}
        isActive
      />
    </div>
  )
})

EditorWindowContent.displayName = 'EditorWindowContent'

function NoFileState() {
  return (
    <div className="flex flex-1 items-center justify-center h-full overflow-hidden bg-muted/20">
      <div className="flex flex-col items-center gap-6 text-center px-8 max-w-md">
        <Dna className="w-12 h-12 text-muted-foreground" strokeWidth={1.5} />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            No File Open
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Open a file from the explorer to start editing, or create a new workflow to begin analyzing your data.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
          <span className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            Browse files
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Open terminal
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            Git status
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * EditorWindow — tab bar + active editor.
 */
const EditorWindow = () => {
  const { removeTab, activateTab, getTab } = useTabStore()
  const { openUnsavedChangesDialog } = useDialogStore()
  const tabBarRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Keep subscription minimal: only subscribe to tabOrder array and activeTabId.
  // Map-based `tabs` is still needed because FileTab reads from the store internally;
  // we pass tab objects via tabOrder lookup to avoid rerenders from Map identity.
  const activeTabId = useTabStore(state => state.activeTabId)
  const tabOrder = useTabStore(state => state.tabOrder)
  const tabs = useTabStore(state => state.tabs)
  const allTabs = tabOrder.map(id => tabs.get(id)).filter((t): t is TabFile => !!t)

  // Scroll active tab into view
  useEffect(() => {
    if (!activeTabId || !tabBarRef.current) return
    const activeEl = tabBarRef.current.querySelector(`[data-tab-id="${activeTabId}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTabId])

  // Update scroll-button visibility
  const updateScrollIndicators = useCallback(() => {
    const el = tabBarRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = tabBarRef.current
    if (!el) return
    updateScrollIndicators()
    el.addEventListener('scroll', updateScrollIndicators, { passive: true })
    window.addEventListener('resize', updateScrollIndicators)
    return () => {
      el.removeEventListener('scroll', updateScrollIndicators)
      window.removeEventListener('resize', updateScrollIndicators)
    }
  }, [updateScrollIndicators])

  useEffect(() => {
    updateScrollIndicators()
  }, [tabOrder, updateScrollIndicators])

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = tabBarRef.current
    if (!el) return
    const amount = direction === 'left' ? -200 : 200
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  const handleActivate = useCallback((tabId: string) => {
    activateTab(tabId)
  }, [activateTab])

  const handleClose = useCallback((tabId: string) => {
    const success = removeTab(tabId)
    if (!success) {
      const tab = getTab(tabId)
      if (tab) openUnsavedChangesDialog(tabId, tab.name)
    }
  }, [removeTab, getTab, openUnsavedChangesDialog])

  return (
    <EditorProvider>
      <DialogProvider>
        <div className="h-full w-full flex flex-col overflow-hidden bg-background">
          {/* Tab bar */}
          <div className="flex items-center border-b border-border flex-shrink-0">
            <ScrollButton
              direction="left"
              visible={canScrollLeft}
              onClick={() => scrollTabs('left')}
            />

            <div
              ref={tabBarRef}
              className="flex-1 flex overflow-x-auto scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {allTabs.map(tab => (
                <FileTab
                  key={tab.id}
                  id={tab.id}
                  name={tab.name}
                  path={tab.path}
                  extension={tab.extension}
                  isActive={activeTabId === tab.id}
                  isDirty={tab.isDirty}
                  isExecuting={tab.isExecuting}
                  onActivate={handleActivate}
                  onClose={handleClose}
                />
              ))}
            </div>

            <ScrollButton
              direction="right"
              visible={canScrollRight}
              onClick={() => scrollTabs('right')}
            />
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <EditorWindowContent />
          </div>
        </div>
      </DialogProvider>
    </EditorProvider>
  )
}

function ScrollButton({
  direction,
  visible,
  onClick
}: {
  direction: 'left' | 'right'
  visible: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center w-6 h-9 border-border bg-muted/40 hover:bg-muted text-muted-foreground transition-all z-10',
        direction === 'left' ? 'border-r' : 'border-l',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none w-0 border-0'
      )}
      aria-label={direction === 'left' ? 'Scroll tabs left' : 'Scroll tabs right'}
    >
      {direction === 'left' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
    </button>
  )
}

export default EditorWindow
