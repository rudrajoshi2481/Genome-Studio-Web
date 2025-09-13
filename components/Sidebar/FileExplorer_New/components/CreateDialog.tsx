/**
 * Create Dialog Component
 * Dialog for creating new files or directories using Shadcn UI
 */

import React, { useState, useRef, useEffect } from 'react';
import { FilePlus, FolderPlus, AlertCircle, Sparkles } from 'lucide-react';
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

  // Common file extensions
  const fileExtensions = ['.txt', '.md', '.js', '.ts', '.py', '.html', '.css', '.json', '.xml', '.yml'];

  const isFile = type === 'file';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              type === 'file' 
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" 
                : "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            )}>
              {type === 'file' ? (
                <FilePlus className="h-5 w-5" />
              ) : (
                <FolderPlus className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Create New {type === 'file' ? 'File' : 'Folder'}</h3>
              <p className="text-sm text-muted-foreground font-normal">
                in <Badge variant="outline" className="font-mono text-xs">{parentPath || '/'}</Badge>
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Name input */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-medium">
              {type === 'file' ? 'File' : 'Folder'} Name
            </Label>
            <Input
              ref={inputRef}
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={type === 'file' ? 'my-file.txt' : 'my-folder'}
              className={cn(
                "h-10",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
            
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* File extension suggestions for files */}
          {type === 'file' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium text-muted-foreground">
                  Quick Extensions
                </Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {fileExtensions.map((ext) => (
                  <Button
                    key={ext}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const baseName = name.split('.')[0] || 'untitled';
                      setName(`${baseName}${ext}`);
                      if (error) setError(null);
                    }}
                    className="h-7 px-3 text-xs font-mono hover:bg-accent"
                  >
                    {ext}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!name.trim()}
            className="min-w-[100px]"
          >
            <div className="flex items-center gap-2">
              {type === 'file' ? (
                <FilePlus className="h-4 w-4" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
              Create
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
