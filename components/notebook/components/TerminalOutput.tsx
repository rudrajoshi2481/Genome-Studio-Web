import React, { useEffect } from 'react';
import type { CellOutput, Cell } from '../store/types';

interface TerminalOutputProps {
  cell: Cell;
  outputs: CellOutput[];
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ cell, outputs }) => {
  // Only log important cell state changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CellState]', {
        id: cell.id,
        type: cell.cell_type,
        language: cell.metadata?.language,
        hasOutputs: outputs.length > 0
      });
    }
  }, [cell, outputs]);

  return (
    <div className="font-mono space-y-1 text-black bg-muted/5 p-2">
      {outputs.map((output, index) => {
        const isError = output.output_type === 'error';
        let content = '';

        if (output.output_type === 'stream' && output.text) {
          content = output.text.join('\n');
        } else if (output.output_type === 'error') {
          content = `${output.name || 'Error'}: ${output.text ? output.text.join('\n') : ''}`;
        } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
          const textData = output.data?.['text/plain'];
          content = Array.isArray(textData) ? textData.join('\n') : String(textData || '');
        }

        return (
          <div 
            key={index} 
            className={`${isError ? 'text-red-400' : 'text-black'}`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
};
