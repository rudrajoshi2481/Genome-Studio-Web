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

  return (
    <div className={`rich-output-viewer ${className || ''}`}>
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-3">
          {Object.entries(outputs).map(([varName, output]) => (
            <div key={varName} className="rich-output-item">
              {/* Render HTML output */}
              <div 
                className="rich-output-content prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: output.html }}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Simple, clean table styling */}
      <style jsx global>{`
        .rich-output-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          font-size: 13px;
          line-height: 1.5;
        }
        
        /* Variable name */
        .rich-output-content .output-df > strong {
          display: block;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 8px;
          opacity: 0.6;
        }
        
        /* Simple table - like plain HTML */
        .rich-output-content .dataframe {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          border: 1px solid #e0e0e0;
        }
        
        .rich-output-content .dataframe thead th {
          background: #f5f5f5;
          padding: 8px 12px;
          text-align: left;
          border: 1px solid #e0e0e0;
          font-weight: 600;
        }
        
        .rich-output-content .dataframe tbody td {
          padding: 6px 12px;
          border: 1px solid #e0e0e0;
        }
        
        .rich-output-content .dataframe tbody th {
          background: #fafafa;
          padding: 6px 12px;
          text-align: left;
          border: 1px solid #e0e0e0;
          font-weight: 500;
        }
        
        .rich-output-content .dataframe tbody tr:hover {
          background: #f9f9f9;
        }
        
        /* Code blocks */
        .rich-output-content pre {
          background: #f5f5f5;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 12px;
          overflow-x: auto;
          margin: 8px 0;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 12px;
        }
        
        .rich-output-content code {
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 12px;
        }
        
        /* Images */
        .rich-output-content img {
          max-width: 100%;
          height: auto;
          border: 1px solid #e0e0e0;
          margin: 12px 0;
        }
      `}</style>
    </div>
  );
};

export default RichOutputViewer;
