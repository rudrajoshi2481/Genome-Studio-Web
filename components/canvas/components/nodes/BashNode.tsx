import React, { useRef, useState } from "react";
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import type { NodeProps } from "reactflow";
import { BashNodeData } from "./types";
import { useNodeDimensions } from "./useNodeDimensions";
import { BashNodeContent } from "./BashNodeContent";
import { DEFAULT_NODE_DIMENSIONS } from "./config";

export default function BashNode({ data, selected, id }: NodeProps<BashNodeData>) {
  const [showLogs, setShowLogs] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const cardFooterRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const { 
    dimensions, 
    setDimensions, 
    autoSizing, 
    setAutoSizing,
    calculateHeight 
  } = useNodeDimensions({
    isCollapsed,
    showLogs,
    headerRef,
    contentRef,
    cardContentRef,
    cardFooterRef,
    logsRef
  });

  const handleResize = (_event: React.SyntheticEvent, { size }: { size: { width: number; height: number } }) => {
    _event.stopPropagation();
    setAutoSizing(false);
    console.log('✋ Manual resize:', { 
      width: size.width, 
      height: size.height,
      isCollapsed,
      showLogs
    });
    setDimensions({
      width: size.width,
      height: size.height
    });
  };

  const handleResizeStart = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setAutoSizing(false);
    document.body.classList.add('node-resizing');

    const handleMouseMove = (e: MouseEvent) => {
      e.stopPropagation();
    };

    document.addEventListener('mousemove', handleMouseMove, true);

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.body.classList.remove('node-resizing');
      setTimeout(() => {
        setAutoSizing(true);
      }, 100);
    };

    document.addEventListener('mouseup', handleMouseUp, { once: true });
  };

  const toggleLogs = () => {
    setShowLogs(prev => {
      const newShowLogs = !prev;
      console.log('📜 Logs toggled:', { showLogs: newShowLogs });
      
      setTimeout(() => {
        setAutoSizing(true);
        calculateHeight();
        setTimeout(() => setAutoSizing(false), 100);
      }, 0);
      
      return newShowLogs;
    });
  };

  const toggleCollapse = () => {
    const newIsCollapsed = !isCollapsed;
    console.log('🔄 Collapse toggled:', { isCollapsed: newIsCollapsed });
    setIsCollapsed(newIsCollapsed);
  };

  return (
    <div ref={nodeRef} className="react-flow__node-content" style={{ position: 'relative' }}>
      <ResizableBox 
        width={dimensions.width}
        height={isCollapsed ? DEFAULT_NODE_DIMENSIONS.collapsedHeight : dimensions.height}
        minConstraints={[DEFAULT_NODE_DIMENSIONS.minWidth, DEFAULT_NODE_DIMENSIONS.minHeight]}
        maxConstraints={[DEFAULT_NODE_DIMENSIONS.maxWidth, DEFAULT_NODE_DIMENSIONS.maxHeight]}
        axis="both"
        resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
        onResize={handleResize}
        onResizeStart={handleResizeStart}
        draggableOpts={{ 
          offsetParent: document.body,
          disabled: true
        }}
        style={{ 
          overflow: 'visible', 
          transition: 'height 0.2s ease',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        <BashNodeContent 
          data={data}
          selected={selected}
          isCollapsed={isCollapsed}
          showLogs={showLogs}
          contentRef={contentRef}
          cardContentRef={cardContentRef}
          cardFooterRef={cardFooterRef}
          headerRef={headerRef}
          onToggleCollapse={toggleCollapse}
          onToggleLogs={toggleLogs}
        />
      </ResizableBox>
    </div>
  );
}
