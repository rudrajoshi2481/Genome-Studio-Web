import { create } from 'zustand';
import type { NotebookState } from './types';
import { createActions, NotebookActions } from './actions';
import { serializeToIpynb, deserializeFromIpynb } from './serialization';

interface NotebookStore extends NotebookState, NotebookActions {}

export const useNotebookStore = create<NotebookStore>()((set, get, api) => {
  const initialState: NotebookState = {
    cells: [],
    selectedCellId: null,
    nextExecutionCount: 1,
    globalExecutionCount: 0,
    metadata: {
      kernelspec: {
        name: 'python3',
        display_name: 'Python 3',
        language: 'python'
      },
      language_info: {
        name: 'python',
        version: '3.9.0',
        mimetype: 'text/x-python',
        file_extension: '.py'
      }
    }
  };

  return {
    ...initialState,
    ...createActions(set, get, api)
  };
});

export { serializeToIpynb, deserializeFromIpynb } from './serialization';
