"use client";

import React from 'react';

interface TerminalOutputProps {
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    source: string;
  }>;
  isRunning?: boolean;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ logs, isRunning = false }) => {
  return (
    <div className="w-full min-h-[200px] max-h-[500px] bg-gray-900 rounded-md border border-gray-700 p-3 font-mono text-sm overflow-y-auto">
      <div className="space-y-0.5">
        {logs.length === 0 && !isRunning && (
          <div className="text-gray-500 text-xs">No output yet...</div>
        )}
        {logs.map((log, index) => (
          <div 
            key={index}
            className="text-gray-100 whitespace-pre-wrap break-words text-xs leading-relaxed"
          >
            {log.message}
          </div>
        ))}
        {isRunning && (
          <div className="text-green-400 animate-pulse mt-2">$ Running...</div>
        )}
      </div>
    </div>
  );
};

export default TerminalOutput;
