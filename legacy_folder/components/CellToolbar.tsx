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
}) => {
  return (
    <div className="flex items-center justify-between px-16 py-1 transition-colors">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} title="Move Up">
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} title="Move Down">
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={onDelete} title="Delete Cell">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
     
    </div>
  );
};
