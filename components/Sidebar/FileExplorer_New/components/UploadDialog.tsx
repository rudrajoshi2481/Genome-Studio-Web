/**
 * Upload Dialog Component
 * Dialog for uploading files with drag & drop support using Shadcn UI
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, FolderOpen, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  open: boolean;
  targetPath: string;
  onUpload: (files: File[]) => void;
  onCancel: () => void;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({
  open,
  targetPath,
  onUpload,
  onCancel
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset files when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedFiles([]);
      setIsDragOver(false);
    }
  }, [open]);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArray]);
  }, []);

  // Handle drag & drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    handleFileSelect(event.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  // Remove file from selection
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle upload
  const handleUpload = useCallback(() => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
      onCancel(); // Close dialog after upload
    }
  }, [selectedFiles, onUpload, onCancel]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              Upload Files
            </DialogTitle>
            <DialogDescription>
              Select files to upload to the target directory. Drag and drop or browse to select files.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Target Directory</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <code className="text-sm font-mono text-foreground truncate">
                  {targetPath}
                </code>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium">File Selection</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer",
                  "hover:border-primary/50 hover:bg-accent/50",
                  isDragOver
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-muted-foreground/25"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={cn(
                  "h-12 w-12 mx-auto mb-4 transition-colors",
                  isDragOver ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {isDragOver ? "Drop files here" : "Drag and drop files here"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Selected Files</Label>
                  <Badge variant="secondary" className="text-xs">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center flex-1 min-w-0 gap-3">
                        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Total size: {formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                    className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            )}

            {selectedFiles.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No files selected. Choose files to upload using the area above.
                </AlertDescription>
              </Alert>
            )}

          </div>
          
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload {selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}` : 'Files'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </>
  );
};
