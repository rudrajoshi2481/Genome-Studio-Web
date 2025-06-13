import React, { useEffect, useRef } from 'react'
import FileTab from './FileTab'
import { useTabStore, TabFile } from '@/components/FileTabs/useTabStore'

interface FileTabsProps {
  initialFiles?: Array<{
    path: string;
    name?: string;
    content?: string;
  }>;
  onTabChange?: (tabId: string, tab: TabFile) => void;
  onTabClose?: (tabId: string, tab: TabFile) => void;
  className?: string;
  maxTabs?: number;
  allowDuplicates?: boolean;
  autoSave?: boolean;
}

const FileTabsStore: React.FC<FileTabsProps> = ({
  initialFiles = [],
  onTabChange,
  onTabClose,
  className = '',
  maxTabs = 20,
  allowDuplicates = false,
  autoSave = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get state and actions from the store
  const tabs = useTabStore(state => state.getAllTabs());
  const activeTabId = useTabStore(state => state.activeTabId);
  const addTab = useTabStore(state => state.addTab);
  const removeTab = useTabStore(state => state.removeTab);
  const activateTab = useTabStore(state => state.activateTab);
  const getTab = useTabStore(state => state.getTab);
  const setOptions = useTabStore(state => state.setOptions);

  // Set options
  useEffect(() => {
    setOptions({
      maxTabs,
      allowDuplicates,
      autoSave
    });
  }, [maxTabs, allowDuplicates, autoSave]);

  // Handle tab events
  const handleTabClick = (tabId: string) => {
    activateTab(tabId);
    
    const tab = getTab(tabId);
    if (tab && onTabChange) {
      onTabChange(tabId, tab);
    }
  };

  const handleTabClose = (tabId: string) => {
    const tab = getTab(tabId);
    if (tab && onTabClose) {
      onTabClose(tabId, tab);
    }
    removeTab(tabId);
  };

  // Allow horizontal scrolling with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  return (
    <div 
      className={`flex overflow-x-auto border-b ${className}`}
      onWheel={handleWheel}
      ref={containerRef}
    >
      {tabs.map(tab => (
        <FileTab
          key={tab.id}
          id={tab.id}
          name={tab.name}
          path={tab.path}
          extension={tab.extension}
          isActive={tab.id === activeTabId}
          isDirty={tab.isDirty}
          onActivate={handleTabClick}
          onClose={handleTabClose}
        />
      ))}
    </div>
  );
};

export default FileTabsStore;
