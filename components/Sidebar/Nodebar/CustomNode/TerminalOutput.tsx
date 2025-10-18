"use client";

import React from 'react';

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

const TerminalOutput: React.FC<TerminalOutputProps> = ({ outputs, logs, isRunning = false }) => {
  // Use unified outputs if available, otherwise fall back to logs
  const displayOutputs = outputs || logs?.map(log => ({
    type: 'text' as const,
    content: log.message,
    order: 0
  })) || [];

  return (
    <div 
      className="w-full min-h-[200px] max-h-[400px] bg-gray-900 rounded-md border border-gray-700 p-3 font-mono text-sm select-text"
      style={{ 
        overflowY: 'scroll',
        overflowX: 'auto'
      }}
    >
      <div className="space-y-2">
        {displayOutputs.length === 0 && !isRunning && (
          <div className="text-gray-500 text-xs">No output yet...</div>
        )}
        
        {displayOutputs.map((output, index) => {
          if (output.type === 'text') {
            // Plain text output - terminal style
            return (
              <div 
                key={index}
                className="text-gray-100 whitespace-pre-wrap break-words text-xs leading-relaxed select-text"
              >
                {output.content}
              </div>
            );
          } else if (output.type === 'error') {
            // Error output - red terminal style
            return (
              <div key={index} className="space-y-1">
                <div className="text-red-400 font-semibold text-xs flex items-center gap-1">
                  <span>✗</span>
                  <span>Error</span>
                </div>
                <pre className="text-red-300 whitespace-pre-wrap text-xs leading-relaxed select-text">
                  {output.content}
                </pre>
                {output.traceback && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-red-400 hover:text-red-300 text-xs">
                      Show Traceback
                    </summary>
                    <pre className="mt-1 text-red-300 whitespace-pre-wrap text-xs leading-relaxed select-text max-h-40 overflow-y-auto">
                      {output.traceback}
                    </pre>
                  </details>
                )}
              </div>
            );
          } else if (output.type === 'rich') {
            // Rich output (images, HTML, dataframes) - embedded in terminal
            const internalVars = ['plt', 'np', 'pd', 'idx', 'fig_name', 'rich_output', 'sys', 'os', 'math', 'random'];
            if (output.var_name && internalVars.includes(output.var_name)) {
              return null;
            }
            
            if (output.content?.text && output.content.text.includes('module') && output.content.text.includes('from')) {
              return null;
            }
            
            const htmlContent = typeof output.content === 'string' ? output.content : output.content?.html;
            if (!htmlContent) return null;
            
            return (
              <div 
                key={index} 
                className="rich-terminal-output bg-gray-800 rounded p-2 border border-gray-700"
              >
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            );
          }
          return null;
        })}
        
        {isRunning && (
          <div className="text-green-400 animate-pulse mt-2 text-xs">$ Running...</div>
        )}
      </div>
      
      {/* Terminal-style rich output styling */}
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
          color: #e5e7eb;
        }
        
        .rich-terminal-output code {
          background: transparent;
          padding: 0;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 11px;
          color: #e5e7eb;
        }
        
        /* Images in terminal */
        .rich-terminal-output img {
          max-width: 100%;
          height: auto;
          border: 1px solid #374151;
          margin: 8px 0;
          display: block;
          border-radius: 4px;
        }
        
        /* Tables in terminal - dark theme */
        .rich-terminal-output .dataframe {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          border: 1px solid #374151;
          margin: 8px 0;
          background: #1f2937;
        }
        
        .rich-terminal-output .dataframe thead th {
          background: #374151;
          padding: 6px 10px;
          text-align: left;
          border: 1px solid #4b5563;
          font-weight: 600;
          font-size: 10px;
          color: #e5e7eb;
        }
        
        .rich-terminal-output .dataframe tbody td {
          padding: 5px 10px;
          border: 1px solid #374151;
          font-size: 10px;
          color: #d1d5db;
        }
        
        .rich-terminal-output .dataframe tbody th {
          background: #374151;
          padding: 5px 10px;
          text-align: left;
          border: 1px solid #4b5563;
          font-weight: 500;
          font-size: 10px;
          color: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default TerminalOutput;
