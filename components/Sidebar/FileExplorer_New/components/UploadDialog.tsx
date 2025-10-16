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
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Reset files when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setSelectedFiles([]);
      setIsDragOver(false);
      // Reset file inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    }
  }, [open]);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArray]);
  }, []);

  // Handle folder selection
  const handleFolderSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArray]);
  }, []);

  // Handle drag & drop
  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const items = event.dataTransfer.items;
    const files: File[] = [];
    
    // Process all dropped items (files and folders)
    if (items) {
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          promises.push(traverseFileTree(item, files));
        }
      }
      
      await Promise.all(promises);
      setSelectedFiles(prev => [...prev, ...files]);
    } else {
      // Fallback for browsers that don't support webkitGetAsEntry
      handleFileSelect(event.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Recursively traverse file tree for folder uploads
  const traverseFileTree = async (item: any, files: File[], path = ''): Promise<void> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          // Preserve folder structure in file path
          const relativePath = path ? `${path}/${file.name}` : file.name;
          // Store the relative path in a custom property
          Object.defineProperty(file, 'webkitRelativePath', {
            value: relativePath,
            writable: false
          });
          files.push(file);
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries: any[]) => {
          const promises: Promise<void>[] = [];
          for (const entry of entries) {
            const newPath = path ? `${path}/${item.name}` : item.name;
            promises.push(traverseFileTree(entry, files, newPath));
          }
          await Promise.all(promises);
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

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

  // Clear all files and reset inputs
  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
    // Reset file inputs to allow re-selection of same files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
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
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </DialogTitle>
            <DialogDescription className="text-sm">
              Select files or folders to upload to the target directory.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
            <div className="space-y-2 shrink-0">
              <Label className="text-sm font-medium">Target Directory</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border text-sm">
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <code className="font-mono truncate">
                  {targetPath}
                </code>
              </div>
            </div>

            <Separator className="shrink-0" />

            <div className="space-y-2 shrink-0">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-all",
                  "hover:border-primary/50 hover:bg-accent/50",
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className={cn(
                  "h-10 w-10 mx-auto mb-3 transition-colors",
                  isDragOver ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {isDragOver ? "Drop here" : "Drag and drop files or folders"}
                  </p>
                  <p className="text-xs text-muted-foreground">or</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1.5 h-8"
                    >
                      <File className="h-3.5 w-3.5" />
                      Browse Files
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => folderInputRef.current?.click()}
                      className="gap-1.5 h-8"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Browse Folders
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <div className="flex items-center justify-between shrink-0">
                  <Label className="text-sm font-medium">Selected Files</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFiles}
                      className="h-7 text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto border rounded-lg p-2 space-y-1.5 min-h-0">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center flex-1 min-w-0 gap-2">
                        <File className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {(file as any).webkitRelativePath || file.name}
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
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 pt-1 border-t">
                  <span>
                    Total: {formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))}
                  </span>
                </div>
              </div>
            )}

            {selectedFiles.length === 0 && (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mr-2" />
                No files selected
              </div>
            )}

          </div>
          
          <DialogFooter className="shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
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
      
      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in TypeScript types but is supported
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={(e) => handleFolderSelect(e.target.files)}
      />
    </>
  );
};
