/**
 * Delete Confirmation Dialog Component
 * Dialog for confirming deletion of files or directories using Shadcn UI
 */

import React from 'react';
import { Trash2, AlertTriangle, File, Folder } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            Confirm Deletion
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete the selected {isMultiple ? 'items' : 'item'}. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Items to Delete</span>
              <Badge variant="destructive" className="text-xs">
                {paths.length} {isMultiple ? 'items' : 'item'}
              </Badge>
            </div>
            
            {isMultiple ? (
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {names.map((name, index) => {
                  const isDirectory = paths[index]?.endsWith('/') || !name.includes('.');
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      {isDirectory ? (
                        <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  {paths[0]?.endsWith('/') || !names[0]?.includes('.') ? (
                    <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium">{names[0]}</span>
                </div>
                <code className="text-xs text-muted-foreground font-mono">{paths[0]}</code>
              </div>
            )}
          </div>

          <Separator />

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be undone. The {isMultiple ? 'items' : 'item'} will be permanently deleted from your file system.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete {isMultiple ? `${paths.length} Items` : 'Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
