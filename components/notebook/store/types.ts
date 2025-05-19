export type JupyterCellType = 'code' | 'markdown' | 'raw';
export type OutputType = 'stream' | 'display_data' | 'execute_result' | 'error';

export interface CellOutput {
  output_type: string;
  text?: string[];
  ename?: string;
  evalue?: string;
  traceback?: string[];
  data?: {
    [key: string]: any;
  };
}

export interface CellCustomMetadata {
  collapsed?: boolean;
  executionTime?: number;
  isError?: boolean;
  serverLogs?: {
    sentTime?: number;
    receivedTime?: number;
  };
}

export interface CellMetadata {
  collapsed?: boolean;
  execution?: {
    execution_count: number | null;
  };
  custom?: CellCustomMetadata;
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
