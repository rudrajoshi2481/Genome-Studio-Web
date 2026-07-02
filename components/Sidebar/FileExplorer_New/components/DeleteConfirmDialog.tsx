/**
 * Delete Confirmation Dialog Component
 * Dialog for confirming deletion of files or directories using Shadcn UI
 */

import React from 'react';
import { Trash2, AlertTriangle, File, Folder } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  paths: string[];
  names: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  paths,
  names,
  onConfirm,
  onCancel
}) => {
  const isMultiple = paths.length > 1;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Delete {isMultiple ? `${paths.length} items` : names[0]}?
          </DialogTitle>
        </DialogHeader>

        {isMultiple && (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {names.map((name, index) => {
              const isDirectory = paths[index]?.endsWith('/') || !name.includes('.');
              return (
                <div key={index} className="flex items-center gap-2 text-xs">
                  {isDirectory ? (
                    <Folder className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <File className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="truncate">{name}</span>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} size="sm" className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
