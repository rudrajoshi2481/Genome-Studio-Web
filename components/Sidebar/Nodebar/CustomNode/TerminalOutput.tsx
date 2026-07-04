"use client";

import React from 'react';
import { ChevronRight, AlertCircle, Loader2 } from 'lucide-react';

interface UnifiedOutput {
  type: 'text' | 'rich' | 'error';
  content: string | any;
  var_name?: string;
  traceback?: string;
  order?: number;
}

interface TerminalOutputProps {
  outputs?: UnifiedOutput[];
  logs?: Array<{
    timestamp: string;
    level: string;
    message: string;
    source: string;
  }>;
  isRunning?: boolean;
}

const INTERNAL_VARS = ['plt', 'np', 'pd', 'idx', 'fig_name', 'rich_output', 'sys', 'os', 'math', 'random'];

const TerminalOutput: React.FC<TerminalOutputProps> = ({ outputs, logs, isRunning = false }) => {
  const displayOutputs = outputs || logs?.map(log => ({
    type: 'text' as const,
    content: log.message,
    order: 0
  })) || [];

  return (
    <div className="w-full rounded-md border border-border bg-muted/30 overflow-hidden">
      {/* Terminal header bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground font-mono">output</span>
        {isRunning && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-green-500 font-mono">
            <Loader2 className="h-3 w-3 animate-spin" />
            running
          </span>
        )}
      </div>

      {/* Terminal body */}
      <div
        className="px-3 py-2.5 font-mono text-[12px] leading-relaxed select-text text-foreground"
        style={{
          overflowY: 'auto',
          overflowX: 'auto',
          maxHeight: '400px',
          minHeight: '120px',
          scrollbarWidth: 'thin',
        }}
      >
        {displayOutputs.length === 0 && !isRunning && (
          <div className="text-muted-foreground text-[11px] italic">No output yet…</div>
        )}

        {displayOutputs.map((output, index) => {
          if (output.type === 'text') {
            return (
              <div
                key={index}
                className="text-foreground/90 whitespace-pre-wrap break-words"
              >
                <span className="text-muted-foreground select-none">›</span>{' '}{output.content}
              </div>
            );
          }

          if (output.type === 'error') {
            return (
              <div key={index} className="mt-1.5 rounded-md bg-destructive/5 border border-destructive/20 overflow-hidden">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-destructive/10 border-b border-destructive/20">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span className="text-destructive font-semibold text-[11px]">Error</span>
                </div>
                <pre className="px-2.5 py-2 text-destructive whitespace-pre-wrap break-words text-[11px]">
                  {output.content}
                </pre>
                {output.traceback && (
                  <details className="border-t border-destructive/20">
                    <summary className="cursor-pointer px-2.5 py-1.5 text-destructive/80 hover:text-destructive text-[11px] select-none">
                      Show Traceback
                    </summary>
                    <pre className="px-2.5 pb-2 text-destructive/70 whitespace-pre-wrap break-words text-[11px] max-h-40 overflow-y-auto">
                      {output.traceback}
                    </pre>
                  </details>
                )}
              </div>
            );
          }

          if (output.type === 'rich') {
            if (output.var_name && INTERNAL_VARS.includes(output.var_name)) return null;
            if (output.content?.text && output.content.text.includes('module') && output.content.text.includes('from')) return null;

            const htmlContent = typeof output.content === 'string' ? output.content : output.content?.html;
            if (!htmlContent) return null;

            return (
              <div
                key={index}
                className="rich-terminal-output mt-1.5 rounded-md bg-muted/40 border border-border p-2"
              >
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            );
          }

          return null;
        })}

        {isRunning && (
          <div className="text-green-500 mt-1.5 text-[11px] flex items-center gap-1">
            <ChevronRight className="h-3 w-3 animate-pulse" />
            <span>Executing…</span>
          </div>
        )}
      </div>

      <style jsx global>{`
        .rich-terminal-output {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        }
        .rich-terminal-output pre {
          background: transparent;
          border: none;
          padding: 4px 0;
          margin: 4px 0;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 11px;
          color: hsl(var(--foreground));
        }
        .rich-terminal-output code {
          background: transparent;
          padding: 0;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 11px;
          color: hsl(var(--foreground));
        }
        .rich-terminal-output img {
          max-width: 100%;
          height: auto;
          border: 1px solid hsl(var(--border));
          margin: 8px 0;
          display: block;
          border-radius: 4px;
        }
        .rich-terminal-output .dataframe {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          border: 1px solid hsl(var(--border));
          margin: 8px 0;
          background: hsl(var(--background));
        }
        .rich-terminal-output .dataframe thead th {
          background: hsl(var(--muted));
          padding: 6px 10px;
          text-align: left;
          border: 1px solid hsl(var(--border));
          font-weight: 600;
          font-size: 10px;
          color: hsl(var(--foreground));
        }
        .rich-terminal-output .dataframe tbody td {
          padding: 5px 10px;
          border: 1px solid hsl(var(--border));
          font-size: 10px;
          color: hsl(var(--foreground));
        }
        .rich-terminal-output .dataframe tbody th {
          background: hsl(var(--muted));
          padding: 5px 10px;
          text-align: left;
          border: 1px solid hsl(var(--border));
          font-weight: 500;
          font-size: 10px;
          color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
};

export default TerminalOutput;
