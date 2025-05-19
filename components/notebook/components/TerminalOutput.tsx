import React from 'react';
import type { CellOutput, Cell } from '../store/types';

interface TerminalOutputProps {
  cell: Cell;
  outputs: CellOutput[];
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ cell, outputs }) => {
  // Don't render if there are no outputs or if all outputs are empty
  const hasValidOutputs = outputs.some(output => {
    if (output.output_type === 'stream' && output.text) {
      return output.text.some((text: string) => text.trim().length > 0);
    }
    if (output.output_type === 'error') {
      return true; // Always show errors
    }
    if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      if (output.data?.['text/html']?.some((html: string) => html.trim().length > 0)) {
        return true;
      }
      const textData = output.data?.['text/plain'];
      if (Array.isArray(textData)) {
        return textData.some((text: string) => text.trim().length > 0);
      }
      return textData ? String(textData).trim().length > 0 : false;
    }
    return false;
  });

  if (!hasValidOutputs) return null;

  const formatOutput = (output: CellOutput): string => {
    if (output.output_type === 'stream' && output.text) {
      // Remove empty lines at start and end, preserve internal empty lines
      return output.text.join('').trimEnd();
    } 
    if (output.output_type === 'error') {
      return `${output.ename || 'Error'}: ${output.evalue || ''}${output.traceback ? '\n' + output.traceback.join('') : ''}`.trim();
    } 
    if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      if (output.data?.['text/html']) {
        // Handle HTML output, remove unnecessary whitespace
        return output.data['text/html'].join('').trim();
      }
      const textData = output.data?.['text/plain'];
      return Array.isArray(textData) ? textData.join('').trim() : String(textData || '').trim();
    }
    return '';
  };

  return (
    <div className="relative p-4 pt-6 bg-muted/50 font-mono text-sm overflow-auto max-h-[300px] border-2 rounded-b-md">
      {/* Execution count header */}
      <div className="absolute left-0 top-0 w-16 flex justify-center items-center h-6 text-xs font-mono text-foreground">
        Out[{cell.metadata.execution?.execution_count || ' '}]:
      </div>

      {/* Output content */}
      <div className="space-y-2">
        {/* Server communication logs */}
        {/* {cell.metadata.custom?.serverLogs?.sentTime !== undefined && (
          <div className="text-xs text-gray-500">
            Sent to server at {new Date(cell.metadata.custom.serverLogs.sentTime).toLocaleTimeString()}
          </div>
        )}
        {cell.metadata.custom?.serverLogs?.receivedTime !== undefined && (
          <div className="text-xs text-gray-500">
            Received from server at {new Date(cell.metadata.custom.serverLogs.receivedTime).toLocaleTimeString()}
          </div>
        )} */}

        {/* Output content */}
        {outputs.map((output, index) => {
          const formattedOutput = formatOutput(output);
          if (!formattedOutput) return null;
          
          return (
            <div 
              key={index} 
              className={`${output.output_type === 'error' ? 'text-red-500' : 'text-gray-800'} ${output.output_type === 'stream' ? 'whitespace-pre' : 'whitespace-pre-wrap'}`}
            >
              {formattedOutput}
            </div>
          );
        })}
      </div>

      {/* Execution time if available */}
      {cell.metadata.custom?.executionTime !== undefined && (
        <div className="text-xs text-right text-foreground mt-2">
          Execution time: {cell.metadata.custom.executionTime.toFixed(2)}s
        </div>
      )}
    </div>
  );
};
