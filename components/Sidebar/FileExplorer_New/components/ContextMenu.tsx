/**
 * Context Menu Component
 * Right-click context menu for file and directory operations using Shadcn UI
 */

import React from 'react';
import {
  DocumentPlusIcon,
  FolderPlusIcon,
  PencilIcon,
  TrashIcon,
  CloudArrowUpIcon,
  DocumentDuplicateIcon,
  ScissorsIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileNode } from '../types';

interface FileContextMenuProps {
  children: React.ReactNode;
  node: FileNode | null;
  onAction: (action: string, node: FileNode) => void;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  children,
  node,
  onAction
}) => {
  if (!node) {
    return <>{children}</>;
  }

  // Handle action click
  const handleActionClick = (actionId: string) => {
    onAction(actionId, node);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {node.is_dir ? (
          // Directory actions
          <>
            <ContextMenuItem onClick={() => handleActionClick('create_file')} className="flex items-center">
              <DocumentPlusIcon className="w-4 h-4 mr-2" />
              New File
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+N</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('create_directory')} className="flex items-center">
              <FolderPlusIcon className="w-4 h-4 mr-2" />
              New Folder
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+Shift+N</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('upload')} className="flex items-center">
              <CloudArrowUpIcon className="w-4 h-4 mr-2" />
              Upload Files
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('download')} className="flex items-center">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Download Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleActionClick('rename')} className="flex items-center">
              <PencilIcon className="w-4 h-4 mr-2" />
              Rename
              <span className="ml-auto text-xs text-muted-foreground">F2</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('duplicate')} className="flex items-center">
              <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleActionClick('cut')} className="flex items-center">
              <ScissorsIcon className="w-4 h-4 mr-2" />
              Cut
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+X</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('copy')} className="flex items-center">
              <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
              Copy
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('paste')} className="flex items-center">
              <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
              Paste
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+V</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleActionClick('copy_path')} className="flex items-center">
              <LinkIcon className="w-4 h-4 mr-2" />
              Copy Path
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+Shift+C</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('properties')} className="flex items-center">
              <InformationCircleIcon className="w-4 h-4 mr-2" />
              Properties
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => handleActionClick('delete')} 
              className="flex items-center text-destructive focus:text-destructive"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete
              <span className="ml-auto text-xs text-muted-foreground">Del</span>
            </ContextMenuItem>
          </>
        ) : (
          // File actions
          <>
            <ContextMenuItem onClick={() => handleActionClick('open')} className="flex items-center">
              <EyeIcon className="w-4 h-4 mr-2" />
              Open
              <span className="ml-auto text-xs text-muted-foreground">Enter</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('preview')} className="flex items-center">
              <EyeIcon className="w-4 h-4 mr-2" />
              Preview in Editor
              <span className="ml-auto text-xs text-muted-foreground">Text View</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('download')} className="flex items-center">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Download
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleActionClick('rename')} className="flex items-center">
              <PencilIcon className="w-4 h-4 mr-2" />
              Rename
              <span className="ml-auto text-xs text-muted-foreground">F2</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('duplicate')} className="flex items-center">
              <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleActionClick('cut')} className="flex items-center">
              <ScissorsIcon className="w-4 h-4 mr-2" />
              Cut
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+X</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('copy')} className="flex items-center">
              <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
              Copy
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleActionClick('copy_path')} className="flex items-center">
              <LinkIcon className="w-4 h-4 mr-2" />
              Copy Path
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+Shift+C</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleActionClick('properties')} className="flex items-center">
              <InformationCircleIcon className="w-4 h-4 mr-2" />
              Properties
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => handleActionClick('delete')} 
              className="flex items-center text-destructive focus:text-destructive"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete
              <span className="ml-auto text-xs text-muted-foreground">Del</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
