/**
 * Delete Confirmation Dialog Component
 * Dialog for confirming deletion of files or directories using Shadcn UI
 */

import React from 'react';
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  const itemText = isMultiple ? `${paths.length} items` : names[0];

  const handleConfirm = () => {
    onConfirm();
    onCancel(); // Close dialog after confirm
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{itemText}</strong>?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isMultiple ? (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Items to be deleted:
              </p>
              <div className="max-h-32 overflow-y-auto bg-muted rounded-md p-2">
                {names.map((name, index) => (
                  <div key={index} className="text-sm py-1">
                    {name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">
                Path: <code className="bg-muted px-1 rounded text-xs">{paths[0]}</code>
              </p>
            </div>
          )}

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warning:</strong> This action cannot be undone. The {isMultiple ? 'items' : 'item'} will be permanently deleted.
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete {isMultiple ? `${paths.length} Items` : 'Item'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
