import React, { useEffect } from 'react';
import { NotebookCell } from './NotebookCell';
import { useNotebookStore } from '../store/useNotebookStore';
import { Button } from '@/components/ui/button';
import { PlusCircle, Code, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CellToolbar } from './CellToolbar';
import { CellOutput, JupyterCellType } from '../store/types';

interface NotebookProps {
  onExecuteCell?: (cellId: string, code: string[], language: string) => Promise<CellOutput[]>;
}

export const Notebook: React.FC<NotebookProps> = ({ onExecuteCell }) => {
  const {
    cells,
    selectedCellId,
    addCell,
    addCellAfter,
    updateCellSource,
    updateCellOutputs,
    deleteCell,
    moveCellUp,
    moveCellDown,
    selectCell,
    setExecutionCount,
    toggleCellType,
    setCellError,
  } = useNotebookStore();

  // Add an initial cell if the notebook is empty
  // useEffect(() => {
  //   if (cells.length === 0) {
  //     addCell('code');
  //   }
  // }, [cells.length, addCell]);

  const handleExecuteCell = async (cellId: string) => {
    if (!onExecuteCell) return;
    
    const cell = cells.find(c => c.id === cellId);
    if (!cell || cell.cell_type !== 'code') return;
    
    // Check if this is a terminal command (starts with ! or $)
    const sourceText = cell.source.join('');
    const isTerminalCommand = sourceText.trim().startsWith('!') || sourceText.trim().startsWith('$');
    
    try {
      const startTime = performance.now();
      
      // Set execution count
      const executionCount = cell.metadata.execution?.execution_count || 1;
      setExecutionCount(cellId, executionCount);
      
      // Execute the cell
      const outputs = await onExecuteCell(cellId, cell.source, 'python');
      const executionTime = (performance.now() - startTime) / 1000; // Convert to seconds
      
      // Update the cell outputs
      updateCellOutputs(cellId, outputs);
      
      // Update cell custom metadata
      setCellError(cellId, null); // Clear any previous error
      
      // Update execution time in custom metadata
      // This would need a new method in the store
      const updatedCell = cells.find(c => c.id === cellId);
      if (updatedCell) {
        updateCellSource(cellId, updatedCell.source); // Ensure source is saved
      }
    } catch (error) {
      // Create an error output
      const errorOutput: CellOutput = {
        output_type: 'error',
        text: [`Error: ${error instanceof Error ? error.message : String(error)}`],
      };
      
      updateCellOutputs(cellId, [errorOutput]);
      setCellError(cellId, error instanceof Error ? error.message : String(error));
    }
  };

  const handleAddCell = (type: JupyterCellType) => {
    addCell(type);
  };

  // Get the selected cell - don't default to first cell which causes selection issues
  const selectedCell = selectedCellId ? cells.find(cell => cell.id === selectedCellId) : null;
  
  // State for hover visibility
  const [isHovering, setIsHovering] = React.useState(false);

  return (
    <div>
      <div className="flex flex-col gap-2 relative" 
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}>
        {/* Show toolbar when: no cells exist, or when hovering, or when a cell is selected */}
        {(cells.length === 0 || isHovering) && (
          <CellToolbar 
            cellId={selectedCell?.id || ''}
            onMoveUp={() => selectedCell && moveCellUp(selectedCell.id)}
            onMoveDown={() => selectedCell && moveCellDown(selectedCell.id)}
            onDelete={() => selectedCell && deleteCell(selectedCell.id)}
            onAddCodeCell={(cellId) => cellId ? addCellAfter(cellId, 'code') : addCell('code')}
            onAddMarkdownCell={(cellId) => cellId ? addCellAfter(cellId, 'markdown') : addCell('markdown')}
          />
        )}
      </div>
      {cells.map((cell) => (
        <div 
          key={cell.id}
          onClick={() => selectCell(cell.id)}
          className="focus:outline-none"
        >
          <NotebookCell
            cell={cell}
            isSelected={selectedCellId === cell.id}
            onContentChange={(source) => updateCellSource(cell.id, source)}
            onMoveUp={() => moveCellUp(cell.id)}
            onMoveDown={() => moveCellDown(cell.id)}
            onDelete={() => deleteCell(cell.id)}
            onToggleType={() => toggleCellType(cell.id)}
            onSelect={() => selectCell(cell.id)}
            onAddCodeCell={(afterCellId) => addCellAfter(afterCellId, 'code')}
            onAddMarkdownCell={(afterCellId) => addCellAfter(afterCellId, 'markdown')}
          />
        </div>
      ))}
    </div>
  );
};
