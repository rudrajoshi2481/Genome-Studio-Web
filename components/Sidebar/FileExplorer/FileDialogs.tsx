import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { RenameDialogProps, DeleteDialogProps, NewFileDialogProps, NewFolderDialogProps } from './types'

// Rename Dialog Component
export const RenameDialog: React.FC<RenameDialogProps> = ({
  isOpen,
  onClose,
  node,
  onRename
}) => {
  const [newName, setNewName] = useState('')
  
  useEffect(() => {
    if (node) {
      setNewName(node.name)
    }
  }, [node])
  
  const handleSubmit = () => {
    onRename(newName)
    onClose()
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {node?.is_dir ? 'Folder' : 'File'}</DialogTitle>
          <DialogDescription>
            Enter a new name for the {node?.is_dir ? 'folder' : 'file'}.
            {!node?.is_dir && ' The file extension will be preserved.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <input
            type="text"
            className="w-full p-2 border rounded mb-2 dark:bg-gray-700 dark:border-gray-600"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <DialogFooter>
          <div className="flex justify-end space-x-2">
            <button 
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={handleSubmit}
            >
              Rename
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Delete Confirmation Dialog Component
export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  isOpen,
  onClose,
  node,
  onDelete
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {node?.is_dir ? 'Folder' : 'File'}</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{node?.name}"?
            {node?.is_dir && ' This will delete all contents inside this folder.'}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex justify-end space-x-2">
            <button 
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-red-500 text-white rounded"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
