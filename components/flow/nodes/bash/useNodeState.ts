import { useState, useRef } from 'react';

export const useNodeState = () => {
  const [showLogs, setShowLogs] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 300, height: 200 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const toggleLogs = () => setShowLogs(prev => !prev);
  const toggleCollapse = () => setIsCollapsed(prev => !prev);

  return {
    showLogs,
    isCollapsed,
    toggleLogs,
    toggleCollapse,
    dimensions,
    nodeRef,
  };
};
