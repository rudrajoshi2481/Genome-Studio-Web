import { useCallback, useEffect, useState } from "react";
import { NodeDimensions } from "./types";
import { DEFAULT_NODE_DIMENSIONS } from "./config";

interface UseNodeDimensionsProps {
  isCollapsed: boolean;
  showLogs: boolean;
  headerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  cardContentRef: React.RefObject<HTMLDivElement | null>;
  cardFooterRef: React.RefObject<HTMLDivElement | null>;
  logsRef: React.RefObject<HTMLDivElement | null>;
}

export const useNodeDimensions = ({
  isCollapsed,
  showLogs,
  headerRef,
  contentRef,
  cardContentRef,
  cardFooterRef,
  logsRef
}: UseNodeDimensionsProps) => {
  const [dimensions, setDimensions] = useState<NodeDimensions>({ 
    width: DEFAULT_NODE_DIMENSIONS.width, 
    height: DEFAULT_NODE_DIMENSIONS.height 
  });
  const [autoSizing, setAutoSizing] = useState(true);

  const calculateHeight = useCallback(() => {
    if (!cardContentRef.current || !headerRef.current || !cardFooterRef.current) return null;

    const headerHeight = headerRef.current.offsetHeight || 40;
    const contentHeight = cardContentRef.current.offsetHeight || 0;
    const footerHeight = cardFooterRef.current.offsetHeight || 37;
    const logsHeight = showLogs && logsRef.current ? logsRef.current.offsetHeight : 0;

    const totalHeight = headerHeight + contentHeight + footerHeight + logsHeight;

    console.log('📐 Height calculation:', {
      headerHeight,
      contentHeight,
      footerHeight,
      logsHeight,
      totalHeight,
      autoSizing,
      isCollapsed,
      showLogs
    });

    if (!isCollapsed && (autoSizing || !dimensions.height)) {
      const newHeight = Math.max(totalHeight, DEFAULT_NODE_DIMENSIONS.minHeight);
      setDimensions(prev => ({
        ...prev,
        height: newHeight
      }));
      return newHeight;
    }

    return totalHeight;
  }, [dimensions.height, autoSizing, isCollapsed, showLogs]);

  // Initial height calculation
  useEffect(() => {
    const newHeight = calculateHeight();
    if (newHeight !== null && !dimensions.height) {
      setDimensions(prev => ({
        width: prev.width,
        height: newHeight
      }));
    }
  }, [calculateHeight]);

  // Update height when logs are toggled or auto-sizing changes
  useEffect(() => {
    if (!autoSizing) return;
    requestAnimationFrame(() => {
      calculateHeight();
    });
  }, [showLogs, autoSizing, calculateHeight]);

  // Setup resize observer
  useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (autoSizing) {
        calculateHeight();
      }
    });

    resizeObserver.observe(contentRef.current);
    return () => resizeObserver.disconnect();
  }, [autoSizing, calculateHeight, contentRef]);

  return {
    dimensions,
    setDimensions,
    autoSizing,
    setAutoSizing,
    calculateHeight
  };
};
