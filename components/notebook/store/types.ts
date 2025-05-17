export type JupyterCellType = 'code' | 'markdown' | 'raw';
export type OutputType = 'stream' | 'display_data' | 'execute_result' | 'error';

export interface CellOutput {
  output_type: OutputType;
  name?: string;
  text?: string[];
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CellMetadata {
  collapsed?: boolean;
  execution?: {
    execution_count: number | null;
  };
  custom?: {
    isError?: boolean;
    executionTime?: number;
  };
  language?: string;
}

export interface NotebookMetadata {
  kernelspec: {
    name: string;
    display_name: string;
    language: string;
  };
  language_info: {
    name: string;
    version: string;
    mimetype?: string;
    file_extension?: string;
  };
}

export interface Cell {
  id: string;
  cell_type: JupyterCellType;
  source: string[];
  metadata: CellMetadata;
  outputs?: CellOutput[];
}

export interface NotebookState {
  cells: Cell[];
  selectedCellId: string | null;
  globalExecutionCount: number;
  nextExecutionCount: number;
  metadata: NotebookMetadata;
}
