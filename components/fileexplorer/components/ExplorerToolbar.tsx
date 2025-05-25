import React, { useState } from 'react';
import { File, Folder, FoldVertical, Home, ArrowLeft, ArrowRight, FolderOpen } from 'lucide-react';
import { useFileExplorerStore } from '../store';
import { PathInput } from './PathInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExplorerToolbarProps {}

export const ExplorerToolbar: React.FC<ExplorerToolbarProps> = () => {
  const { 
    reset, 
    fetchFileTree, 
    fileTree, 
    navigationHistory, 
    currentPath, 
    navigateToPath, 
    navigateBack, 
    navigateForward, 
    collapseAll,
    createFile,
    createFolder
  } = useFileExplorerStore();
  
  const [isPathInputVisible, setIsPathInputVisible] = useState(false);
  const [customPath, setCustomPath] = useState(currentPath || '/app');
  
  // Dialog states
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPath) {
      navigateToPath(customPath);
      setIsPathInputVisible(false);
    }
  };

  // Handler for creating a new file
  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      setError('File name cannot be empty');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Use the current path as the directory
      const targetPath = currentPath || '/app';
      console.log('Creating file in directory:', targetPath);
      await createFile(targetPath, newFileName);
      
      // Close dialog and reset form
      setIsNewFileDialogOpen(false);
      setNewFileName('');
    } catch (err) {
      console.error('Error creating file:', err);
      setError((err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handler for creating a new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Folder name cannot be empty');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Use the current path as the directory
      const targetPath = currentPath || '/app';
      console.log('Creating folder in directory:', targetPath);
      await createFolder(targetPath, newFolderName);
      
      // Close dialog and reset form
      setIsNewFolderDialogOpen(false);
      setNewFolderName('');
    } catch (err) {
      console.error('Error creating folder:', err);
      setError((err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col w-full mt-8">
      <div className="h-8 w-full bg-muted/20 px-2 flex items-center justify-between backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex justify-between w-full items-center">
          <div className="flex items-center">
            <span className="font-medium mr-2">Files</span>
          </div>
          <div className='flex gap-1'>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="New File"
              onClick={() => setIsNewFileDialogOpen(true)}
            >
              <File className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="New Folder"
              onClick={() => setIsNewFolderDialogOpen(true)}
            >
              <Folder className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="Collapse All"
              onClick={() => collapseAll()}
            >
              <FoldVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Navigation Bar */}
      <div className="h-8 w-full bg-gray-50 px-2 flex items-center border-b">
        <div className="flex items-center space-x-1 w-full">
          <button
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            title="Back"
            onClick={navigateBack}
            disabled={!navigationHistory.canGoBack}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            title="Forward"
            onClick={navigateForward}
            disabled={!navigationHistory.canGoForward}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            title="Home"
            onClick={() => navigateToPath('/app')}
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          
          {isPathInputVisible ? (
            <PathInput
              currentPath={currentPath}
              isVisible={isPathInputVisible}
              onSubmit={(path) => {
                navigateToPath(path);
                setIsPathInputVisible(false);
              }}
              onCancel={() => setIsPathInputVisible(false)}
            />
          ) : (
            <div 
              className="flex-1 text-xs px-2 py-0.5 truncate cursor-pointer hover:bg-gray-200 rounded"
              onClick={() => {
                setCustomPath(currentPath || '/app');
                setIsPathInputVisible(true);
              }}
              title={currentPath || '/app'}
            >
              <span className="flex items-center">
                <FolderOpen className="w-3 h-3 mr-1 inline" />
                {currentPath || '/app'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* New File Dialog */}
      <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Input
                id="name"
                placeholder="filename.txt"
                className="col-span-4"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <p className="text-xs text-gray-500">Creating file in: {currentPath || '/app'}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewFileDialogOpen(false);
                setNewFileName('');
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFile} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Input
                id="name"
                placeholder="folder-name"
                className="col-span-4"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <p className="text-xs text-gray-500">Creating folder in: {currentPath || '/app'}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewFolderDialogOpen(false);
                setNewFolderName('');
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
