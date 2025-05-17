import { create } from 'zustand';


// UUID generator function that works across all environments
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface Cell {
  id: string;
  cellType: 'code' | 'markdown';
  content: string[];
  metadata: {
    language?: string;
    executionCount?: number;
  };
  outputs?: string[];
}

interface NotebookStore {
  cells: Cell[];
  nextExecutionCount: number;
  addCell: (type: 'code' | 'markdown', afterId?: string) => void;
  updateCell: (id: string, content: string[]) => void;
  deleteCell: (id: string) => void;
  moveCell: (id: string, direction: 'up' | 'down') => void;
  executeCell: (id: string) => void;
}

const createCell = (type: 'code' | 'markdown'): Cell => ({
  id: generateId(),
  cellType: type,
  content: [''],
  metadata: type === 'code' ? { language: 'python', executionCount: 0 } : {},
  outputs: type === 'code' ? [] : undefined
});

export const useNotebookStore = create<NotebookStore>((set) => ({
  cells: [createCell('code')],
  nextExecutionCount: 1,

  addCell: (type, afterId) => {
    console.log(`[Notebook] Adding ${type} cell${afterId ? ` after ${afterId}` : ''}`);
    set((state) => {
      const cells = [...state.cells];
      const index = afterId ? cells.findIndex(c => c.id === afterId) : cells.length - 1;
      const newCell = createCell(type);
      cells.splice(index + 1, 0, newCell);
      console.log(`[Notebook] Added cell ${newCell.id} at index ${index + 1}`);
      return { cells };
    });
  },

  updateCell: (id, content) => {
    console.log(`[Notebook] Updating cell ${id}`, { content });
    set((state) => ({
      cells: state.cells.map(cell => {
        if (cell.id === id) {
          console.log(`[Notebook] Cell ${id} updated:`, { oldContent: cell.content, newContent: content });
          return { ...cell, content };
        }
        return cell;
      })
    }));
  },

  deleteCell: (id) => {
    console.log(`[Notebook] Deleting cell ${id}`);
    set((state) => {
      if (state.cells.length <= 1) {
        console.log('[Notebook] Cannot delete last cell');
        return state;
      }
      const cells = state.cells.filter(cell => cell.id !== id);
      console.log(`[Notebook] Cell ${id} deleted, ${cells.length} cells remaining`);
      return { cells };
    });
  },

  moveCell: (id, direction) => {
    console.log(`[Notebook] Moving cell ${id} ${direction}`);
    set((state) => {
      const cells = [...state.cells];
      const index = cells.findIndex(cell => cell.id === id);
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= cells.length) {
        console.log(`[Notebook] Cannot move cell ${direction}, at ${direction === 'up' ? 'top' : 'bottom'}`);
        return state;
      }

      [cells[index], cells[newIndex]] = [cells[newIndex], cells[index]];
      console.log(`[Notebook] Moved cell ${id} from index ${index} to ${newIndex}`);
      return { cells };
    });
  },

  executeCell: (id) => {
    console.log(`[Notebook] Executing cell ${id}`);
    set((state) => {
      const cells = state.cells.map(cell => {
        if (cell.id !== id || cell.cellType !== 'code') return cell;
        console.log(`[Notebook] Cell ${id} execution:`, {
          content: cell.content,
          executionCount: state.nextExecutionCount
        });
        return {
          ...cell,
          metadata: { ...cell.metadata, executionCount: state.nextExecutionCount },
          outputs: [cell.content.join('\n')]
        };
      });

      return { 
        cells,
        nextExecutionCount: state.nextExecutionCount + 1
      };
    });
  }
}));
