import { v4 as uuidv4 } from 'uuid';
import { Cell, NotebookState, JupyterCellType } from './types';

export const deepCloneCell = (cell: Cell): Cell => {
  console.log('[DeepClone] Input cell:', JSON.stringify(cell, null, 2));
  
  const clonedCell: Cell = {
    id: cell.id,
    cell_type: cell.cell_type,
    source: [...cell.source],
    metadata: {
      ...cell.metadata,
      execution: { 
        execution_count: cell.metadata?.execution?.execution_count ?? null
      },
      custom: { 
        isError: cell.metadata?.custom?.isError ?? false,
        executionTime: cell.metadata?.custom?.executionTime
      }
    },
    outputs: cell.outputs?.map(output => ({ ...output })) ?? undefined
  };
  
  console.log('[DeepClone] Cloned result:', JSON.stringify(clonedCell, null, 2));
  return clonedCell;
};

export const logAction = (action: string, params: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][NotebookStore] ${action}`, {
    ...params,
    _trace: new Error().stack?.split('\n').slice(2).join('\n')
  });
};

export const logSourceChange = (prefix: string, cellId: string, oldSource: string[], newSource: string[]) => {
  console.log(`[SourceChange][${prefix}] Cell ${cellId}:`, {
    previousSource: oldSource.join('\n'),
    newSource: newSource.join('\n'),
    changeSize: newSource.join('\n').length - oldSource.join('\n').length,
    timestamp: new Date().toISOString(),
  });
};

export const logCellState = (prefix: string, cell: any) => {
  console.log(`[CellState][${prefix}]`, {
    id: cell.id,
    type: cell.cell_type,
    sourceLength: cell.source.join('\n').length,
    source: cell.source.join('\n'),
    metadata: cell.metadata,
    timestamp: new Date().toISOString(),
  });
};

export const createEmptyCell = (cell_type: JupyterCellType): Cell => {
  return {
    id: uuidv4(),
    cell_type,
    source: [''],
    metadata: {
      execution: {
        execution_count: null
      },
      custom: {
        isError: false
      }
    }
  };
};

export const serializeToIpynb = (state: NotebookState) => {
  console.log('Serializing notebook state to ipynb format');
  const result = {
    cells: state.cells.map(cell => ({
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
  console.log('Serialization result:', result);
  return result;
};

export const deserializeFromIpynb = (ipynb: any): Partial<NotebookState> => {
  console.log('Deserializing ipynb format to notebook state');
  const notebookData = {
    cells: ipynb.cells.map((cell: any) => ({
      id: crypto.randomUUID(),
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
  console.log('Deserialization result:', notebookData);
  return notebookData;
};
