'use client'

import React from 'react';
import { useNotebookStore } from '../store/useNotebookStore';
import { CodeCell } from './CodeCell';
import { MarkdownCell } from './MarkdownCell';
import { CellToolbar } from './CellToolbar';
import { AddCellButtons } from './AddCellButtons';

export const Notebook: React.FC = () => {
  const {
    cells,
    addCell,
    updateCell,
    deleteCell,
    moveCell,
    executeCell
  } = useNotebookStore();

  const handleExecute = async (cellId: string) => {
    await executeCell(cellId);
  };

  return (
    <div className="w-full mx-auto p-4 space-y-4">
      {cells.length === 0 ? (
        <div className="text-center py-8">
          <CellToolbar
            cellId="empty"
            onMoveUp={() => {}}
            onMoveDown={() => {}}
            onDelete={() => {}}
            onAddCodeCell={(afterCellId) => addCell('code', undefined)}
            onAddMarkdownCell={(afterCellId) => addCell('markdown', undefined)}
          />
        </div>
      ) : (
        cells.map((cell, index) => (
          <div key={cell.id} className="group relative pb-8">
            <CellToolbar
              cellId={cell.id}
              onMoveUp={() => moveCell(cell.id, 'up')}
              onMoveDown={() => moveCell(cell.id, 'down')}
              onDelete={() => deleteCell(cell.id)}
              onAddCodeCell={(afterId) => addCell('code', afterId)}
              onAddMarkdownCell={(afterId) => addCell('markdown', afterId)}
            />
            
            {cell.cellType === 'code' ? (
              <CodeCell
                cell={cell}
                onContentChange={(content) => updateCell(cell.id, content)}
                onExecute={() => handleExecute(cell.id)}
              />
            ) : (
              <MarkdownCell
                cell={cell}
                onContentChange={(content) => updateCell(cell.id, content)}
              />
            )}
            {/* Add cell buttons after each cell */}
            
            <AddCellButtons
              onAddCode={() => addCell('code', cell.id)}
              onAddMarkdown={() => addCell('markdown', cell.id)}
              className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        ))
      )}
    </div>
  );
};