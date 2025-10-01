"use client"

import React, { useState, useEffect } from 'react';
import { Folder, FolderPlus, X, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AddWorkspaceFolderDialog from './AddWorkspaceFolderDialog';
import { getApiBaseUrl } from '@/config/server';
import * as authService from '@/lib/services/auth-service';

interface WorkspaceFolder {
  path: string;
  alias: string;
}

interface WorkspaceFoldersManagerProps {
  onFoldersChange?: () => void;
  onFolderSelect?: (folderPath: string) => void;
}

export const WorkspaceFoldersManager: React.FC<WorkspaceFoldersManagerProps> = ({
  onFoldersChange,
  onFolderSelect
}) => {
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const token = authService.getToken();
      const url = `${baseUrl}/file-explorer-new/workspace/folders`;
      
      console.log('📂 Loading workspace folders from:', url);

      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      console.log('📡 Load folders response:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Loaded folders:', data);
        setFolders(data.folders || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to load workspace folders:', response.status, errorData);
        toast.error('Failed to load workspace folders');
      }
    } catch (error) {
      console.error('❌ Error loading workspace folders:', error);
      toast.error(`Error loading folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleRemoveFolder = async (folderPath: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const token = authService.getToken();
      const url = `${baseUrl}/file-explorer-new/workspace/remove-folder?folder_path=${encodeURIComponent(folderPath)}`;
      
      console.log('🗑️ Removing workspace folder:', { url, folderPath });

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      console.log('📡 Remove folder response:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 Remove folder data:', data);

      if (response.ok && data.success) {
        console.log('✅ Folder removed successfully');
        toast.success(data.message || 'Folder removed from workspace');
        setFolders(data.folders || []);
        onFoldersChange?.();
      } else {
        console.error('❌ Failed to remove folder:', data);
        toast.error(data.message || data.detail || 'Failed to remove folder');
      }
    } catch (error) {
      console.error('❌ Error removing workspace folder:', error);
      toast.error(`Failed to remove folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFolderAdded = () => {
    loadFolders();
    onFoldersChange?.();
  };

  return (
    <div className="border-b border-border/50">
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 hover:bg-accent/50 cursor-pointer group transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-foreground/80">
            Workspaces
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({folders.length})
          </span>
        </div>
        
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddDialog(true);
                  }}
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Add folder</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadFolders();
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Refresh</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Folder List */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-0.5">
          {folders.map((folder) => (
            <div
              key={folder.path}
              className="flex items-center justify-between pl-6 pr-2 py-1.5 rounded-md hover:bg-accent/50 group cursor-pointer transition-colors"
              onClick={() => {
                console.log('📁 Switching to workspace folder:', folder.path);
                onFolderSelect?.(folder.path);
              }}
              title={`Click to view ${folder.alias}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Folder className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-xs font-medium truncate">
                  {folder.alias}
                </span>
              </div>
              {folders.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFolder(folder.path);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <AddWorkspaceFolderDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onFolderAdded={handleFolderAdded}
      />
    </div>
  );
};

export default WorkspaceFoldersManager;
