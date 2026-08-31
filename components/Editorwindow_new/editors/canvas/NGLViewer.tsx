"use client";

import React, { useEffect, useRef, useState } from 'react';

interface NGLStructureEntry {
  file_url?: string;
  file_type?: string;
  file_path?: string;
  representation?: string;
  color_scheme?: string;
  name?: string;
  options?: Record<string, unknown>;
}

interface NGLSpec {
  structures?: NGLStructureEntry[];
  // legacy single-structure shape (file_url at top level)
  file_url?: string;
  file_type?: string;
  representations?: string[];
  [key: string]: unknown;
}

interface NGLViewerProps {
  spec: NGLSpec;
  className?: string;
  height?: number | string;
}

declare global {
  interface Window {
    NGL?: any;
    __ngl_loading?: Promise<void>;
  }
}

const NGL_SCRIPT_URL = '/ngl.umd.js'; // served from public/ — fully bundled, no CDN

function loadNGL(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.NGL?.Stage) return resolve();
    if (window.__ngl_loading) {
      window.__ngl_loading.then(() => resolve()).catch(reject);
      return;
    }
    window.__ngl_loading = new Promise<void>((res, rej) => {
      const existing = document.querySelector(`script[src="${NGL_SCRIPT_URL}"]`);
      if (existing) {
        if (existing.getAttribute('data-loaded') === 'true') { res(); return; }
        existing.addEventListener('load', () => { existing.setAttribute('data-loaded', 'true'); res(); });
        existing.addEventListener('error', () => rej(new Error(`Failed to load: ${NGL_SCRIPT_URL}`)));
        return;
      }
      const script = document.createElement('script');
      script.src = NGL_SCRIPT_URL;
      script.onload = () => { script.setAttribute('data-loaded', 'true'); res(); };
      script.onerror = () => rej(new Error(`Failed to load: ${NGL_SCRIPT_URL}`));
      document.head.appendChild(script);
    });
    window.__ngl_loading.then(() => resolve()).catch(reject);
  });
}

export const NGLViewer: React.FC<NGLViewerProps> = ({ spec, className, height = 400 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-structure spec (from Structure nodes) with legacy single-spec fallback
  const structures: NGLStructureEntry[] =
    spec?.structures && spec.structures.length > 0
      ? spec.structures
      : spec?.file_url
        ? [{ file_url: spec.file_url, file_type: spec.file_type, representation: spec.representations?.[0] || 'cartoon' }]
        : [];

  const structuresKey = JSON.stringify(structures);

  useEffect(() => {
    if (!containerRef.current) return;
    if (structures.length === 0) {
      setError('No structures in spec — connect Structure nodes and re-run.');
      return;
    }

    let cancelled = false;

    const resizeObserver = new ResizeObserver(() => {
      try { stageRef.current?.handleResize(); } catch {}
    });

    (async () => {
      try {
        await loadNGL();
        if (cancelled || !containerRef.current || !window.NGL) return;

        const stage = new window.NGL.Stage(containerRef.current, {
          backgroundColor: 'white',
        });
        stageRef.current = stage;
        resizeObserver.observe(containerRef.current);

        // NGL positions its tooltip with `position: absolute` relative to the
        // stage container. Inside React Flow the container is wrapped in a
        // CSS-transformed parent (translate/scale), which makes the tooltip
        // appear far from the cursor. Switching to `position: fixed` makes the
        // tooltip use viewport coordinates, matching NGL's clientX/clientY.
        if (stage.tooltip) {
          stage.tooltip.style.position = 'fixed';
          stage.tooltip.style.zIndex = '9999';
        }

        let loaded = 0;
        for (const st of structures) {
          if (!st.file_url) continue;
          try {
            const component = await stage.loadFile(st.file_url, {
              ext: st.file_type || 'pdb',
            });
            if (cancelled) return;
            const params: Record<string, unknown> = { ...(st.options || {}) };
            if (st.color_scheme) params.colorScheme = st.color_scheme;
            component.addRepresentation(st.representation || 'cartoon', params);
            loaded += 1;
          } catch (e) {
            console.warn(`[NGLViewer] Failed to load structure "${st.file_path || st.file_url}":`, e);
          }
        }

        if (loaded === 0) {
          throw new Error('No structures could be loaded (check the file paths and formats).');
        }
        stage.autoView();
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        console.error('[NGLViewer] Error:', e);
        if (!cancelled) {
          setError(e?.message || String(e));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      try { stageRef.current?.dispose(); } catch {}
      stageRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuresKey]);

  if (error) {
    return (
      <div className={`rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive ${className || ''}`}>
        NGL error: {error}
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
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground z-10 bg-background/60">
          Loading structure{structures.length > 1 ? `s (${structures.length})` : ''}…
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default NGLViewer;
