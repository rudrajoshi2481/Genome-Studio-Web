"use client";

import React, { useEffect, useRef, useState } from 'react';

interface HiGlassViewerProps {
  viewconf: Record<string, unknown>;
  className?: string;
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

export const HiGlassViewer: React.FC<HiGlassViewerProps> = ({ viewconf, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !viewconf) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    console.log('[HiGlassViewer] useEffect triggered, viewconf:', JSON.stringify(viewconf, null, 2));

    // Log all track server URLs and tileset UIDs
    try {
      const vc = viewconf as any;
      const views = vc?.views || [];
      views.forEach((v: any, vi: number) => {
        const tracks = v?.tracks || {};
        Object.entries(tracks).forEach(([trackType, trackList]) => {
          if (Array.isArray(trackList)) {
            trackList.forEach((t: any, ti: number) => {
              console.log(`[HiGlassViewer] Track[${vi}.${trackType}[${ti}]] server=${t.server}, tilesetUid=${t.tilesetUid}, type=${t.type}`);
            });
          }
        });
      });
    } catch (e) {
      console.error('[HiGlassViewer] Error logging tracks:', e);
    }

    // Intercept fetch to log tile-related requests
    const origFetch = window.fetch.bind(window);
    const fetchInterceptor = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input as Request).url);
      if (url && (url.includes('tileset_info') || url.includes('tiles') || url.includes('higlass'))) {
        console.log('[HiGlassViewer] fetch:', url);
      }
      return origFetch(input, init).then((resp) => {
        if (url && (url.includes('tileset_info') || url.includes('tiles') || url.includes('higlass'))) {
          console.log(`[HiGlassViewer] fetch response: ${resp.status} ${resp.statusText} for ${url}`);
          // Always log response body for tileset_info to debug
          const cloned = resp.clone();
          cloned.text().then((body) => {
            if (url.includes('tileset_info')) {
              try {
                const parsed = JSON.parse(body);
                console.log(`[HiGlassViewer] tileset_info body:`, JSON.stringify(parsed).substring(0, 1000));
                console.log(`[HiGlassViewer] tileset_info keys:`, Object.keys(parsed));
                console.log(`[HiGlassViewer] max_zoom:`, parsed.max_zoom, 'max_width:', parsed.max_width, 'max_pos:', parsed.max_pos);
                console.log(`[HiGlassViewer] resolutions type:`, typeof parsed.resolutions, 'value:', parsed.resolutions);
              } catch (e) {
                console.error(`[HiGlassViewer] tileset_info parse error:`, e, 'body:', body.substring(0, 500));
              }
            } else if (!resp.ok) {
              console.error(`[HiGlassViewer] fetch error body for ${url}:`, body.substring(0, 500));
            }
          });
        }
        return resp;
      });
    };
    window.fetch = fetchInterceptor;

    // Intercept XHR to log tile-related requests (HiGlass uses XHR for tiles)
    const origXHROpen = XMLHttpRequest.prototype.open;
    const origXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(this: XMLHttpRequest, method: string, url: string, ...rest: any[]) {
      (this as any).__higlass_url = url;
      if (url && (url.includes('tileset_info') || url.includes('tiles') || url.includes('higlass'))) {
        console.log('[HiGlassViewer] XHR open:', method, url);
      }
      return (origXHROpen as any).call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function(this: XMLHttpRequest, ...args: [body?: Document | XMLHttpRequestBodyInit | null]) {
      const url = (this as any).__higlass_url || '';
      if (url && (url.includes('tileset_info') || url.includes('tiles') || url.includes('higlass'))) {
        this.addEventListener('load', () => {
          console.log(`[HiGlassViewer] XHR response: ${this.status} for ${url}`);
          if (this.status >= 400) {
            console.error(`[HiGlassViewer] XHR error body for ${url}:`, (this.responseText || '').substring(0, 500));
          }
        });
        this.addEventListener('error', () => {
          console.error(`[HiGlassViewer] XHR network error for ${url}`);
        });
      }
      return origXHRSend.apply(this, args);
    };

    // Global error handler to catch silent HiGlass errors
    const origOnError = window.onerror;
    window.onerror = (msg, url, line, col, error) => {
      console.error('[HiGlassViewer] Global error:', msg, 'at', url, ':', line, ':', col, 'error:', error);
      if (origOnError) return origOnError(msg, url, line, col, error);
      return false;
    };
    // Catch unhandled promise rejections
    const origOnUnhandled = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      console.error('[HiGlassViewer] Unhandled promise rejection:', event.reason);
      if (origOnUnhandled) return origOnUnhandled.call(window, event);
    };

    (async () => {
      try {
        console.log('[HiGlassViewer] Loading HiGlass bundle...');
        await loadHiGlass();
        console.log('[HiGlassViewer] HiGlass bundle loaded, hglib:', !!window.hglib, 'viewer:', !!window.hglib?.viewer);
        if (cancelled || !containerRef.current || !window.hglib) return;

        const cleaned = rewriteJupyterServers(viewconf);
        // Ensure initialXDomain/initialYDomain are set so HiGlass loads tiles immediately
        const cleanedVc = cleaned as any;
        if (cleanedVc?.views && Array.isArray(cleanedVc.views)) {
          cleanedVc.views.forEach((v: any) => {
            if (!v.initialXDomain && !v.initialYDomain) {
              // Set a default domain covering the genome
              // HiGlass will use tileset_info max_width to compute the actual domain
              v.initialXDomain = [0, 3099922541];
              v.initialYDomain = [0, 3099922541];
              console.log('[HiGlassViewer] Added initialXDomain/initialYDomain to view', v.uid);
            }
            // Remove zoomLimits if it restricts tile loading
            if (v.zoomLimits) {
              console.log('[HiGlassViewer] Removing zoomLimits:', v.zoomLimits);
              delete v.zoomLimits;
            }
          });
        }
        console.log('[HiGlassViewer] Cleaned viewconf:', JSON.stringify(cleanedVc, null, 2));

        // Create inner container for HiGlass
        const inner = document.createElement('div');
        inner.style.width = '600px';
        inner.style.height = '400px';
        inner.style.minWidth = '600px';
        containerRef.current.appendChild(inner);

        console.log('[HiGlassViewer] Calling hglib.viewer...');
        const api = await window.hglib.viewer(inner, cleaned, {});
        apiRef.current = api;
        console.log('[HiGlassViewer] hglib.viewer returned API:', !!api);

        // Prevent wheel/contextmenu from bubbling to ReactFlow
        const controller = new AbortController();
        containerRef.current.addEventListener('contextmenu', (e) => e.stopPropagation(), { signal: controller.signal });
        containerRef.current.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); }, { signal: controller.signal, passive: false });
        cleanup = () => {
          controller.abort();
          if (inner.parentNode) inner.parentNode.removeChild(inner);
        };

        setLoading(false);
        console.log('[HiGlassViewer] Rendering complete, loading=false');
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
      // Restore original fetch, XHR, and error handlers
      window.fetch = origFetch;
      XMLHttpRequest.prototype.open = origXHROpen;
      XMLHttpRequest.prototype.send = origXHRSend;
      window.onerror = origOnError;
      window.onunhandledrejection = origOnUnhandled;
      if (cleanup) cleanup();
      if (apiRef.current?.destroy) {
        try { apiRef.current.destroy(); } catch {}
      }
      apiRef.current = null;
      console.log('[HiGlassViewer] Cleanup complete');
    };
  }, [viewconf]);

  if (error) {
    return (
      <div className={`rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive ${className || ''}`}>
        HiGlass error: {error}
      </div>
    );
  }

  return (
    <div className={`relative rounded-md border border-border bg-background ${className || ''}`} style={{ overflow: 'visible' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Loading HiGlass…
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ overflow: 'visible' }} />
    </div>
  );
};

export default HiGlassViewer;
