import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Code, 
  FileText 
} from 'lucide-react';

interface CellToolbarProps {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onAddCodeCell: (afterCellId: string) => void;
  onAddMarkdownCell: (afterCellId: string) => void;
  cellId: string;
}

export const CellToolbar: React.FC<CellToolbarProps> = ({
  onMoveUp,
  onMoveDown,
  onDelete,
  onAddCodeCell,
  onAddMarkdownCell,
  cellId,
}) => {
  // Determine if we're in an empty notebook (no cellId)
  const isEmptyNotebook = !cellId;
  
  return (
    <div className="flex items-center justify-center gap-2 transition-colors absolute w-full z-10 h-10">
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 text-xs bg-background/80 hover:bg-background shadow-sm rounded-md" 
        onClick={() => onAddCodeCell(cellId)}
        title={isEmptyNotebook ? "Add Code Cell" : "Add Code Cell Below"}
      >
        <Code className="h-3 w-3 mr-1" />
        Add Code
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 text-xs bg-background/80 hover:bg-background shadow-sm rounded-md" 
        onClick={() => onAddMarkdownCell(cellId)}
        title={isEmptyNotebook ? "Add Text Cell" : "Add Text Cell Below"}
      >
        <FileText className="h-3 w-3 mr-1" />
        Add Text
      </Button>
    </div>
  );
};
