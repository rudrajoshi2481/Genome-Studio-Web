import React, { useEffect } from 'react';
import { NotebookCell } from './NotebookCell';
import { useNotebookStore } from '../store/useNotebookStore';
import { CellToolbar } from './CellToolbar';
import { CellOutput, JupyterCellType } from '../store/types';
import { notebookWebSocket } from '../services/notebookWebSocket';

export const Notebook: React.FC = () => {
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
    setCellError,
  } = useNotebookStore();

  useEffect(() => {
    // Connect to WebSocket when component mounts
    notebookWebSocket.connect();
    return () => notebookWebSocket.disconnect();
  }, []);

  const handleExecuteCell = async (cellId: string) => {
    const cell = cells.find(c => c.id === cellId);
    if (!cell || cell.cell_type !== 'code') return;
    
    try {
      const startTime = performance.now();
      const executionCount = (cell.metadata.execution?.execution_count || 0) + 1;
      setExecutionCount(cellId, executionCount);
      
      const outputs = await notebookWebSocket.executeCode(cellId, cell.source, 'python');
      const executionTime = (performance.now() - startTime) / 1000;
      
      updateCellOutputs(cellId, outputs);
      setCellError(cellId, null);
      
      const updatedCell = cells.find(c => c.id === cellId);
      if (updatedCell) {
        updateCellSource(cellId, updatedCell.source);
      }
    } catch (error) {
      const errorOutput: CellOutput = {
        output_type: 'error',
        text: [`Error: ${error instanceof Error ? error.message : String(error)}`],
      };
      
      updateCellOutputs(cellId, [errorOutput]);
      setCellError(cellId, error instanceof Error ? error.message : String(error));
    }
  };

  const selectedCell = selectedCellId ? cells.find(cell => cell.id === selectedCellId) : null;
  const [isHovering, setIsHovering] = React.useState(false);

  return (
    <div>
      <div className="flex flex-col gap-2 relative" 
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}>
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
            onExecute={() => handleExecuteCell(cell.id)}
            onMoveUp={() => moveCellUp(cell.id)}
            onMoveDown={() => moveCellDown(cell.id)}
            onDelete={() => deleteCell(cell.id)}
            onSelect={() => selectCell(cell.id)}
            onAddCodeCell={(afterCellId) => addCellAfter(afterCellId, 'code')}
            onAddMarkdownCell={(afterCellId) => addCellAfter(afterCellId, 'markdown')}
          />
        </div>
      ))}
    </div>
  );
};
