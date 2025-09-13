/**
 * Rename Dialog Component
 * Dialog for renaming files or directories using Shadcn UI
 */

import React, { useState, useRef, useEffect } from 'react';
import { Edit3, File, Folder, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface RenameDialogProps {
  open: boolean;
  currentName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  open,
  currentName,
  onConfirm,
  onCancel
}) => {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input and select filename (without extension) on mount
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          
          // Select filename without extension
          const lastDotIndex = currentName.lastIndexOf('.');
          if (lastDotIndex > 0) {
            inputRef.current.setSelectionRange(0, lastDotIndex);
          } else {
            inputRef.current.select();
          }
        }
      }, 100);
    }
  }, [open, currentName]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
    }
  }, [open, currentName]);

  // Validate name
  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return 'Name cannot be empty';
    }

    if (value === currentName) {
      return 'Name must be different from current name';
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(value)) {
      return 'Name contains invalid characters';
    }

    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(value.toUpperCase())) {
      return 'Name is reserved and cannot be used';
    }

    // Check length
    if (value.length > 255) {
      return 'Name is too long (maximum 255 characters)';
    }

    return null;
  };

  // Handle input change
  const handleInputChange = (value: string) => {
    setName(value);
    const validationError = validateName(value);
    setError(validationError);
  };

  // Handle form submission
  const handleConfirm = () => {
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    onConfirm(name.trim());
    onCancel(); // Close dialog after confirm
  };

  // Handle keyboard events
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  // Get file extension for display
  const getFileExtension = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  };

  const currentExtension = getFileExtension(currentName);
  const newExtension = getFileExtension(name);
  const extensionChanged = currentExtension !== newExtension;

  const isDirectory = !currentName.includes('.');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Edit3 className="h-5 w-5 text-primary" />
            </div>
            Rename {isDirectory ? 'Directory' : 'File'}
          </DialogTitle>
          <DialogDescription>
            Enter a new name for the selected {isDirectory ? 'directory' : 'file'}. Make sure the name follows your system's naming conventions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Current Name</Label>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
              {isDirectory ? (
                <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
              ) : (
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <code className="text-sm font-mono text-foreground">
                {currentName}
              </code>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label htmlFor="new-name" className="text-sm font-medium">New Name</Label>
            <Input
              id="new-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "font-mono",
                error && "border-destructive focus-visible:ring-destructive"
              )}
              placeholder="Enter new name..."
            />
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {extensionChanged && currentExtension && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Extension Change:</strong> You are changing the file extension from{' '}
                <code className="mx-1 px-1 bg-muted rounded text-xs">{currentExtension}</code>
                to{' '}
                <code className="mx-1 px-1 bg-muted rounded text-xs">{newExtension || '(none)'}</code>.
                This may affect how the file is handled by applications.
              </AlertDescription>
            </Alert>
          )}

        </div>
        
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!!error || !name.trim() || name === currentName}
            className="gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
