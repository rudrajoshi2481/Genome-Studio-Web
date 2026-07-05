"use client";

import React, { useEffect, useRef, useState } from 'react';

interface HiGlassViewerProps {
  viewconf: Record<string, unknown>;
  className?: string;
  height?: number | string;
}

declare global {
  interface Window {
    hglib?: any;
    __higlass_loading?: Promise<void>;
    React17?: any;
    ReactDOM17?: any;
    PIXI?: any;
  }
}

const SCRIPT_URLS = [
  "https://unpkg.com/react@17.0.2/umd/react.production.min.js",
  "https://unpkg.com/react-dom@17.0.2/umd/react-dom.production.min.js",
  "https://unpkg.com/pixi.js@6.5.10/dist/browser/pixi.min.js",
  "https://unpkg.com/higlass@2.2.3/dist/hglib.min.js",
];

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load: ${url}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load: ${url}`));
    document.head.appendChild(script);
  });
}

async function loadHiGlass(): Promise<void> {
  if (window.hglib?.viewer) return;
  if (window.__higlass_loading) {
    await window.__higlass_loading;
    return;
  }
  window.__higlass_loading = (async () => {
    // Save original React 18 globals to restore after HiGlass loads
    const origReact = (window as any).React;
    const origReactDOM = (window as any).ReactDOM;
    const origReactDOMClient = (window as any).ReactDOMClient;
    
    for (const url of SCRIPT_URLS) {
      await loadScript(url);
    }
    
    // Restore original React 18 globals (HiGlass captured React 17 internally already)
    if (origReact) (window as any).React = origReact;
    if (origReactDOM) (window as any).ReactDOM = origReactDOM;
    if (origReactDOMClient) (window as any).ReactDOMClient = origReactDOMClient;
    
    if (!window.hglib?.viewer) {
      throw new Error('HiGlass loaded but hglib.viewer not found');
    }
  })();
  await window.__higlass_loading;
}

function rewriteJupyterServers(viewconf: Record<string, unknown>): Record<string, unknown> {
  // Backend now handles rewriting jupyter servers to backend tile server URLs
  // This is kept as a pass-through for compatibility
  return JSON.parse(JSON.stringify(viewconf));
}

export const HiGlassViewer: React.FC<HiGlassViewerProps> = ({ viewconf, className, height = 400 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !viewconf) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        await loadHiGlass();
        if (cancelled || !containerRef.current || !window.hglib) return;

        const cleaned = rewriteJupyterServers(viewconf);
        const cleanedVc = cleaned as any;
        if (cleanedVc?.views && Array.isArray(cleanedVc.views)) {
          cleanedVc.views.forEach((v: any) => {
            if (!v.initialXDomain && !v.initialYDomain) {
              v.initialXDomain = [0, 3099922541];
              v.initialYDomain = [0, 3099922541];
            }
            if (v.zoomLimits) {
              delete v.zoomLimits;
            }
          });
        }

        // Create inner container that fills 100% of parent
        const inner = document.createElement('div');
        inner.style.width = '100%';
        inner.style.height = '100%';
        inner.style.minWidth = '300px';
        inner.style.minHeight = '200px';
        containerRef.current.appendChild(inner);
        innerRef.current = inner;

        const api = await window.hglib.viewer(inner, cleaned, { bounded: true });
        apiRef.current = api;

        // Prevent wheel/contextmenu from bubbling to ReactFlow
        const controller = new AbortController();
        containerRef.current.addEventListener('contextmenu', (e) => e.stopPropagation(), { signal: controller.signal });
        containerRef.current.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); }, { signal: controller.signal, passive: false });

        // ResizeObserver: notify HiGlass when container size changes
        const resizeObserver = new ResizeObserver(() => {
          if (apiRef.current?.refresh) {
            apiRef.current.refresh();
          }
        });
        resizeObserver.observe(containerRef.current);

        cleanup = () => {
          controller.abort();
          resizeObserver.disconnect();
          if (inner.parentNode) inner.parentNode.removeChild(inner);
        };

        setLoading(false);
      } catch (e: any) {
        console.error('[HiGlassViewer] Error:', e);
        if (!cancelled) {
          setError(e?.message || String(e));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
      if (apiRef.current?.destroy) {
        try { apiRef.current.destroy(); } catch {}
      }
      apiRef.current = null;
      innerRef.current = null;
    };
  }, [viewconf]);

  if (error) {
    return (
      <div className={`rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive ${className || ''}`}>
        HiGlass error: {error}
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    minHeight: '200px',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div className={`relative rounded-md border border-border bg-background ${className || ''}`} style={containerStyle}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground z-10">
          Loading HiGlass…
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
    </div>
  );
};

export default HiGlassViewer;
