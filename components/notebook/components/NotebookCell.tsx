import React, { useCallback } from 'react';
import type { Cell, CellOutput } from '../store/types';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Trash2, Play } from 'lucide-react';
import { CellToolbar } from './CellToolbar';
import { TerminalOutput } from './TerminalOutput';
import { useNotebookStore } from '../store/useNotebookStore';
import { notebookConfig } from '../config/editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotebookCellProps {
  onExecute: () => Promise<void>;
  cell: Cell;
  isSelected: boolean;
  onContentChange: (content: string[]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onAddCodeCell: (afterCellId: string) => void;
  onAddMarkdownCell: (afterCellId: string) => void;
}

const formatExecutedCode = (source: string[]): string => {
  return source.join('\n');
};

export const NotebookCell: React.FC<NotebookCellProps> = ({
  cell,
  isSelected,
  onContentChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSelect,
  onAddCodeCell,
  onAddMarkdownCell,
}) => {
  const { updateCellLanguage, executeCell } = useNotebookStore();
  const handleCellClick = useCallback(() => {
    onSelect();
  }, [onSelect]);

  const handleExecute = useCallback(() => {
    executeCell(cell.id);
  }, [executeCell, cell.id]);

  return (
    <div
      className={`group relative flex flex-col gap-2  transition-colors ${isSelected ? 'bg-muted/30 border-l-4 border-t-1 border-b-1 border-r-1  border-l-blue-400' : 'hover:bg-muted/10'}`}
      onClick={handleCellClick}
    >
      <div className="flex items-center gap-1 px-2 py-1  transition-colors">
        {/* Left side controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onMoveUp()}
            title="Move Up"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onMoveDown()}
            title="Move Down"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onDelete()}
            title="Delete Cell"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Cell type indicator and execution controls */}
        <div className="flex items-center gap-1 min-w-[100px]">
          {cell.cell_type === 'code' && (
            <>
              <div className="text-[11px] tabular-nums font-mono text-muted-foreground w-[40px]">
                In[{cell.metadata.execution?.execution_count || ' '}]
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={handleExecute}
                disabled={false}
                title="Run Cell"
              >
                <Play className="h-3 w-3" />
              </Button>

            </>
          )}
        </div>
      </div>
        
      <div className={`ml-16 rounded-md overflow-hidden  duration-200`}>
        <div className={`relative bg-background border-2 `}>
          <CodeMirrorEditor
            cell={cell}
            onChange={onContentChange}
            onExecute={cell.cell_type === 'code' ? handleExecute : undefined}
          />
          {cell.cell_type === 'code' && (
            <div className="absolute top-0 right-0 z-10  rounded-md">
              <Select 
                value={cell.metadata.language || notebookConfig.defaultLanguage}
                onValueChange={(value) => updateCellLanguage(cell.id, value)}
              >
                <SelectTrigger className="h-5 w-[80px]  text-[10px] py-0 px-1.5 bg-background/90 border-none">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="min-w-[100px]">
                  {notebookConfig.languages.map((lang) => (
                    <SelectItem 
                      key={lang.id} 
                      value={lang.id} 
                      className="text-[10px] py-0.5"
                    >
                      {lang.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {cell.cell_type === 'code' && cell.outputs && cell.outputs.length > 0 && (
          <TerminalOutput cell={cell} outputs={cell.outputs} />
        )}
      </div>
      
      {/* Cell Toolbar at the bottom */}
      <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <CellToolbar
          cellId={cell.id}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDelete={onDelete}
          onAddCodeCell={onAddCodeCell}
          onAddMarkdownCell={onAddMarkdownCell}
        />
      </div>
    </div>
  );
};
