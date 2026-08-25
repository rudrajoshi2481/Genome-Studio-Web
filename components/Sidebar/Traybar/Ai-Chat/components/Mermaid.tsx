"use client";

import { useEffect, useRef, useState, useId } from "react";

// Cache the dynamically imported mermaid module + initialization state
let mermaidModule: any = null;
let initialized = false;

async function getMermaid() {
  if (!mermaidModule) {
    mermaidModule = (await import("mermaid")).default;
  }
  if (!initialized) {
    mermaidModule.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "strict",
      fontFamily: "monospace",
      suppressErrorRendering: true,
    });
    initialized = true;
  }
  return mermaidModule;
}

interface MermaidProps {
  chart: string;
  className?: string;
}

export function Mermaid({ chart, className }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  // useId produces something like ":r1:" — sanitize for mermaid's DOM id
  const id = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const m = await getMermaid();
        if (cancelled) return;
        const { svg: rendered } = await m.render(id, chart);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || String(err));
          setSvg(null);
        }
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="my-2 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400 font-mono overflow-x-auto">
        <p className="font-medium mb-1">Mermaid syntax error</p>
        <pre className="whitespace-pre-wrap break-words">{error}</pre>
      </div>
    );
  }

  if (svg) {
    return (
      <div
        ref={containerRef}
        className={`my-2 flex justify-center overflow-x-auto ${className || ""}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`my-2 flex justify-center overflow-x-auto ${className || ""}`}
    >
      <span className="text-xs text-muted-foreground">Loading diagram…</span>
    </div>
  );
}

export default Mermaid;
