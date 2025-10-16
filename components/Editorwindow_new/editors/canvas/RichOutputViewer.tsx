/**
 * Rich Output Viewer - Jupyter-style HTML output renderer
 * Displays rich HTML representations of Python/R/Bash outputs
 */

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RichOutput {
  html: string;
  text: string;
  type?: string;
  mime_type?: string;
}

interface RichOutputViewerProps {
  outputs: Record<string, RichOutput>;
  className?: string;
}

export const RichOutputViewer: React.FC<RichOutputViewerProps> = ({ outputs, className }) => {
  if (!outputs || Object.keys(outputs).length === 0) {
    return null;
  }

  // Filter out internal/utility variables that shouldn't be displayed
  const internalVars = ['plt', 'np', 'pd', 'idx', 'fig_name', 'rich_output', 'sys', 'os', 'math', 'random'];
  
  const filteredOutputs = Object.entries(outputs).filter(([varName, output]) => {
    // Skip null or invalid outputs
    if (!output || typeof output !== 'object' || !output.html) {
      return false;
    }
    
    // Skip internal variables
    if (internalVars.includes(varName)) {
      return false;
    }
    
    // Skip if it's just a module representation (contains 'module' in the text)
    if (output.text && output.text.includes('module') && output.text.includes('from')) {
      return false;
    }
    
    return true;
  });

  if (filteredOutputs.length === 0) {
    return null;
  }

  return (
    <div className={`rich-output-viewer ${className || ''}`}>
      <div className="space-y-1">
        {filteredOutputs.map(([varName, output]) => {
          return (
            <div key={varName} className="rich-output-item">
              {/* Render HTML output inline without blocks */}
              <div 
                className="rich-output-content"
                dangerouslySetInnerHTML={{ __html: output.html }}
              />
            </div>
          );
        })}
      </div>
      
      {/* Jupyter-style clean output styling */}
      <style jsx global>{`
        .rich-output-viewer {
          background: transparent;
        }
        
        .rich-output-item {
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
        }
        
        .rich-output-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          font-size: 13px;
          line-height: 1.5;
          background: transparent;
        }
        
        /* Remove any pre/code backgrounds - keep it clean */
        .rich-output-content pre {
          background: transparent;
          border: none;
          padding: 4px 0;
          margin: 4px 0;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 12px;
          color: inherit;
        }
        
        .rich-output-content code {
          background: transparent;
          padding: 0;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 12px;
          color: inherit;
        }
        
        /* Images - clean, no border */
        .rich-output-content img {
          max-width: 100%;
          height: auto;
          border: none;
          margin: 8px 0;
          display: block;
        }
        
        /* Tables - minimal styling */
        .rich-output-content .dataframe {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          border: 1px solid hsl(var(--border));
          margin: 8px 0;
        }
        
        .rich-output-content .dataframe thead th {
          background: hsl(var(--muted));
          padding: 6px 10px;
          text-align: left;
          border: 1px solid hsl(var(--border));
          font-weight: 600;
          font-size: 11px;
        }
        
        .rich-output-content .dataframe tbody td {
          padding: 5px 10px;
          border: 1px solid hsl(var(--border));
          font-size: 11px;
        }
        
        .rich-output-content .dataframe tbody th {
          background: hsl(var(--muted) / 0.5);
          padding: 5px 10px;
          text-align: left;
          border: 1px solid hsl(var(--border));
          font-weight: 500;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
};

export default RichOutputViewer;
