import { v4 as uuidv4 } from 'uuid';
import type { Cell, NotebookState } from './types';

export const serializeToIpynb = (state: NotebookState) => {
  console.log('[NotebookStore] Serializing to ipynb');
  return {
    cells: state.cells.map((cell: Cell) => ({
      cell_type: cell.cell_type,
      metadata: cell.metadata,
      source: cell.source,
      outputs: cell.outputs || [],
      execution_count: cell.metadata.execution?.execution_count || null
    })),
    metadata: state.metadata,
    nbformat: 4,
    nbformat_minor: 5
  };
};

export const deserializeFromIpynb = (ipynb: any): Partial<NotebookState> => {
  console.log('[NotebookStore] Deserializing from ipynb');
  const notebookData = {
    cells: ipynb.cells.map((cell: any) => ({
      id: uuidv4(),
      cell_type: cell.cell_type,
      source: cell.source,
      metadata: cell.metadata,
      outputs: cell.outputs
    })),
    selectedCellId: null,
    nextExecutionCount: Math.max(...ipynb.cells
      .map((cell: any) => cell.execution_count || 0)) + 1 || 1,
    metadata: ipynb.metadata
  };
  console.log('[NotebookStore] Deserialized data:', notebookData);
  return notebookData;
};
