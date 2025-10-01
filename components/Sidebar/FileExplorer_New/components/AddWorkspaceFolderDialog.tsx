"use client"

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/config/server';
import * as authService from '@/lib/services/auth-service';

interface AddWorkspaceFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFolderAdded: () => void;
}

export const AddWorkspaceFolderDialog: React.FC<AddWorkspaceFolderDialogProps> = ({
  open,
  onOpenChange,
  onFolderAdded
}) => {
  const [folderPath, setFolderPath] = useState('');
  const [alias, setAlias] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderPath.trim()) {
      toast.error('Please enter a folder path');
      return;
    }

    setIsLoading(true);

    try {
      const baseUrl = getApiBaseUrl();
      const token = authService.getToken();
      const url = `${baseUrl}/file-explorer-new/workspace/add-folder`;
      
      console.log('🔧 Adding workspace folder:', {
        url,
        folderPath: folderPath.trim(),
        alias: alias.trim() || null,
        hasToken: !!token
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          folder_path: folderPath.trim(),
          alias: alias.trim() || null
        })
      });

      console.log('📡 Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok && data.success) {
        console.log('✅ Folder added successfully');
        toast.success(data.message || 'Folder added to workspace');
        setFolderPath('');
        setAlias('');
        onOpenChange(false);
        onFolderAdded();
      } else {
        console.error('❌ Failed to add folder:', data);
        toast.error(data.message || data.detail || 'Failed to add folder');
      }
    } catch (error) {
      console.error('❌ Error adding workspace folder:', error);
      toast.error(`Failed to add folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Add Folder to Workspace
          </DialogTitle>
          <DialogDescription>
            Add an existing folder from your system to the workspace. Similar to VSCode's "Add Folder to Workspace".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folderPath">
                Folder Path <span className="text-red-500">*</span>
              </Label>
              <Input
                id="folderPath"
                placeholder="/path/to/folder"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                disabled={isLoading}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter the absolute path to the folder you want to add
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="alias">
                Display Name (Optional)
              </Label>
              <Input
                id="alias"
                placeholder="My Project"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Optional friendly name for the folder
              </p>
            </div>

            <div className="bg-muted/50 p-3 rounded-md text-xs space-y-1">
              <p className="font-medium">Examples:</p>
              <p className="font-mono text-muted-foreground">/home/user/projects</p>
              <p className="font-mono text-muted-foreground">/var/www/html</p>
              <p className="font-mono text-muted-foreground">/opt/data</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !folderPath.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add Folder
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkspaceFolderDialog;
