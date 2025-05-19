import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { NotebookState, JupyterCellType, CellOutput } from './types';
import { deepCloneCell, logAction, logSourceChange, logCellState, createEmptyCell } from './utils';

export interface NotebookActions {
  addCell: (cell_type: JupyterCellType) => void;
  addCellAfter: (id: string, cell_type: JupyterCellType) => void;
  updateCellSource: (id: string, source: string[]) => void;
  updateCellOutputs: (id: string, outputs: CellOutput[]) => void;
  deleteCell: (id: string) => void;
  moveCellUp: (id: string) => void;
  updateCellLanguage: (id: string, language: string) => void;
  moveCellDown: (id: string) => void;
  toggleCellType: (id: string) => void;
  selectCell: (id: string | null) => void;
  incrementExecutionCount: () => void;
  setExecutionCount: (id: string, count: number | null) => void;
  setCellError: (id: string, error: string | null) => void;
  executeCell: (id: string) => void;
}

export const createActions: StateCreator<NotebookState & NotebookActions, [], [], NotebookActions> = (set, get, api) => ({
  addCell: (cell_type: JupyterCellType) => {
    logAction('addCell', { cell_type });
    const newCell = createEmptyCell(cell_type);
    set((state) => ({
      cells: [...state.cells, newCell],
      selectedCellId: newCell.id
    }));
  },

  addCellAfter: (id: string, cell_type: JupyterCellType) => {
    logAction('addCellAfter', { id, cell_type });
    const newCell = createEmptyCell(cell_type);
    set((state) => {
      const index = state.cells.findIndex(cell => cell.id === id);
      if (index === -1) return state;

      const newCells = [...state.cells];
      newCells.splice(index + 1, 0, newCell);

      return {
        cells: newCells,
        selectedCellId: newCell.id
      };
    });
  },

  updateCellSource: (id: string, source: string[]) => {
    logAction('updateCellSource', { id, sourceLength: source.join('\n').length });
    set((state) => {
      const index = state.cells.findIndex(cell => cell.id === id);
      if (index === -1) return state;

      const originalCell = state.cells[index];
      logCellState('BeforeUpdate', originalCell);
      logSourceChange('Update', id, originalCell.source, source);

      const newCells = [...state.cells];
      const clonedCell = deepCloneCell(newCells[index]);
      
      // Log any differences in metadata after cloning
      if (JSON.stringify(clonedCell.metadata) !== JSON.stringify(originalCell.metadata)) {


      }
      
      newCells[index] = {
        ...clonedCell,
        source
      };

      logCellState('AfterUpdate', newCells[index]);

      return { cells: newCells };
    });
  },

  updateCellOutputs: (id: string, outputs: CellOutput[]) => {
    logAction('updateCellOutputs', { id });
    set((state) => ({
      cells: state.cells.map(cell =>
        cell.id === id ? { ...cell, outputs } : cell
      )
    }));
  },

  deleteCell: (id: string) => {
    logAction('deleteCell', { id });
    set((state) => {
      const index = state.cells.findIndex(cell => cell.id === id);
      const newCells = state.cells.filter(cell => cell.id !== id);
      let newSelectedId = state.selectedCellId;

      if (state.selectedCellId === id) {
        newSelectedId = newCells[index]?.id || newCells[index - 1]?.id || null;
      }

      return {
        cells: newCells,
        selectedCellId: newSelectedId
      };
    });
  },

  moveCellUp: (id: string) => {
    logAction('moveCellUp', { id });
    set((state) => {
      const index = state.cells.findIndex(cell => cell.id === id);
      if (index === -1) return state;
      
      const newCells = [...state.cells];
      const movingCell = deepCloneCell(newCells[index]);
      
      // If at the top, move to bottom
      if (index === 0) {
        const lastIndex = state.cells.length - 1;

        
        // Shift all cells up by one
        for (let i = 0; i < lastIndex; i++) {
          newCells[i] = deepCloneCell(state.cells[i + 1]);
        }
        // Place the moving cell at the bottom
        newCells[lastIndex] = movingCell;
      } else {
        // Normal case - swap with cell above
        const targetCell = deepCloneCell(newCells[index - 1]);

        
        newCells[index - 1] = movingCell;
        newCells[index] = targetCell;
      }

      return {
        cells: newCells,
        selectedCellId: id
      };
    });
  },

  moveCellDown: (id: string) => {
    logAction('moveCellDown', { id });
    set((state) => {
      const index = state.cells.findIndex(cell => cell.id === id);
      if (index === -1 || index >= state.cells.length - 1) return state;



      const newCells = [...state.cells];
      
      // Deep clone only the cells we're moving
      const movingCell = deepCloneCell(newCells[index]);
      const targetCell = deepCloneCell(newCells[index + 1]);
      

      
      // Simply swap the entire cells to preserve all data
      newCells[index + 1] = movingCell;
      newCells[index] = targetCell;



      return {
        cells: newCells,
        selectedCellId: id
      };
    });
  },

  selectCell: (id: string | null) => {
    logAction('selectCell', { id });
    set({ selectedCellId: id });
  },

  incrementExecutionCount: () => {
    set((state) => ({ nextExecutionCount: state.nextExecutionCount + 1 }));
  },

  setExecutionCount: (id: string, count: number | null) => {
    logAction('setExecutionCount', { id, count });
    set((state) => ({
      cells: state.cells.map(cell =>
        cell.id === id
          ? {
              ...cell,
              metadata: {
                ...cell.metadata,
                execution: {
                  ...cell.metadata.execution,
                  execution_count: count
                }
              }
            }
          : cell
      ),
      nextExecutionCount: count !== null ? count + 1 : state.nextExecutionCount
    }));
  },

  updateCellLanguage: (id: string, language: string) => {
    logAction('updateCellLanguage', { id, language });
    set((state) => {
      const index = state.cells.findIndex(cell => cell.id === id);
      if (index === -1) return state;

      const newCells = [...state.cells];
      const cell = deepCloneCell(newCells[index]);
      cell.metadata.language = language;
      newCells[index] = cell;

      return { cells: newCells };
    });
  },

  toggleCellType: (id: string) => {
    logAction('toggleCellType', { id });
    set((state) => ({
      cells: state.cells.map(cell => {
        if (cell.id !== id) return cell;
        return {
          ...cell,
          cell_type: cell.cell_type === 'code' ? 'markdown' : 'code'
        };
      })
    }));
  },

  setCellError: (id: string, error: string | null) => {
    logAction('setCellError', { id, error });
    set((state) => ({
      cells: state.cells.map(cell =>
        cell.id === id ? {
          ...cell,
          metadata: {
            ...cell.metadata,
            custom: { ...cell.metadata.custom, isError: error !== null }
          }
        } : cell
      )
    }));
  },

  executeCell: async (id: string) => {
    logAction('executeCell', { id });
    console.log('[NotebookStore] Executing cell:', id);
    
    const state = get();
    const cell = state.cells.find(c => c.id === id);
    if (!cell) {
      console.error('[NotebookStore] Cell not found:', id);
      return;
    }

    try {
      // Increment global execution count
      const newExecutionCount = state.globalExecutionCount + 1;
      set(state => ({
        ...state,
        globalExecutionCount: newExecutionCount,
        cells: state.cells.map(c =>
          c.id === id
            ? {
                ...c,
                metadata: {
                  ...c.metadata,
                  execution: { ...c.metadata.execution, execution_count: newExecutionCount }
                }
              }
            : c
        )
      }));

      console.log('[NotebookStore] Calling WebSocket service for cell:', id);
      
      // Import and use the WebSocket service
      const { notebookWebSocket } = await import('../services/notebookWebSocket');
      const outputs = await notebookWebSocket.executeCode(id, cell.source, cell.metadata.language || 'python');
      
      console.log('[NotebookStore] Execution completed, outputs:', outputs);
      
      // Update cell with outputs
      set((state) => ({
        ...state,
        cells: state.cells.map(c =>
          c.id === id
            ? {
                ...c,
                outputs
              }
            : c
        )
      }));
    } catch (error) {
      console.error('[NotebookStore] Execution error:', error);
      
      // Handle execution error
      set((state) => ({
        ...state,
        cells: state.cells.map(c =>
          c.id === id
            ? {
                ...c,
                outputs: [{
                  output_type: 'error',
                  ename: 'ExecutionError',
                  evalue: error instanceof Error ? error.message : 'Unknown error',
                  traceback: []
                }]
              }
            : c
        )
      }));
    }
  }
});
