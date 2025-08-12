/**
 * Rename Dialog Component
 * Dialog for renaming files or directories using Shadcn UI
 */

import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    onConfirm(name.trim());
    onCancel(); // Close dialog after confirm
  };

  // Get file extension for display
  const getFileExtension = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  };

  const currentExtension = getFileExtension(currentName);
  const newExtension = getFileExtension(name);
  const extensionChanged = currentExtension !== newExtension;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilIcon className="w-5 h-5 text-blue-600" />
            Rename Item
          </DialogTitle>
          <DialogDescription>
            Enter a new name for the selected item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-name">Current Name</Label>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded font-mono">
              {currentName}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-name">New Name</Label>
            <Input
              id="new-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`font-mono ${error ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}
          </div>

          {/* Extension change warning */}
          {extensionChanged && currentExtension && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> You are changing the file extension from 
                <code className="mx-1 px-1 bg-yellow-100 dark:bg-yellow-800 rounded">{currentExtension}</code>
                to
                <code className="mx-1 px-1 bg-yellow-100 dark:bg-yellow-800 rounded">{newExtension || '(none)'}</code>.
                This may affect how the file is handled by applications.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!!error || !name.trim() || name === currentName}
            >
              Rename
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
