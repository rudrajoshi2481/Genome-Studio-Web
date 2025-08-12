/**
 * Create Dialog Component
 * Dialog for creating new files or directories using Shadcn UI
 */

import React, { useState, useRef, useEffect } from 'react';
import { DocumentPlusIcon, FolderPlusIcon } from '@heroicons/react/24/outline';
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

interface CreateDialogProps {
  open: boolean;
  type: 'file' | 'directory';
  parentPath: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export const CreateDialog: React.FC<CreateDialogProps> = ({
  open,
  type,
  parentPath,
  onConfirm,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input and reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Validate name
  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return `${type === 'file' ? 'File' : 'Directory'} name cannot be empty`;
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

  const isFile = type === 'file';
  const Icon = isFile ? DocumentPlusIcon : FolderPlusIcon;
  const title = `Create New ${isFile ? 'File' : 'Directory'}`;
  const placeholder = `Enter ${type} name...`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Create a new {type} in the selected directory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parent-path">Parent Directory</Label>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded font-mono">
              {parentPath}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-name">{isFile ? 'File' : 'Directory'} Name</Label>
            <Input
              id="item-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              className={error ? 'border-red-500 focus:border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}
          </div>

          {/* File extension suggestions for files */}
          {isFile && (
            <div className="space-y-2">
              <Label>Common Extensions</Label>
              <div className="flex flex-wrap gap-2">
                {['.txt', '.md', '.js', '.ts', '.py', '.json', '.html', '.css'].map((ext) => (
                  <Button
                    key={ext}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const baseName = name.replace(/\.[^/.]+$/, ''); // Remove existing extension
                      handleInputChange(baseName + ext);
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    {ext}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!!error || !name.trim()}
            >
              Create {isFile ? 'File' : 'Directory'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
