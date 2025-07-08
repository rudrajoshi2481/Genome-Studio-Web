import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { NewFileDialogProps, NewFolderDialogProps } from './types'

// New File Dialog Component
export const NewFileDialog: React.FC<NewFileDialogProps> = ({
  isOpen,
  onClose,
  parentPath,
  onCreate
}) => {
  const [newFileName, setNewFileName] = useState('')
  
  const handleSubmit = () => {
    if (newFileName.trim()) {
      onCreate(newFileName)
      setNewFileName('')
      onClose()
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
          <DialogDescription>
            Enter a name for the new file. Include the file extension (e.g., .js, .txt, .py).
            <br />
            <span className="text-sm font-medium mt-2 block">
              Location: {parentPath}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <input
            type="text"
            className="w-full p-2 border rounded mb-2 dark:bg-gray-700 dark:border-gray-600"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.ext"
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
              Create
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// New Folder Dialog Component
export const NewFolderDialog: React.FC<NewFolderDialogProps> = ({
  isOpen,
  onClose,
  parentPath,
  onCreate
}) => {
  const [newFolderName, setNewFolderName] = useState('')
  
  const handleSubmit = () => {
    if (newFolderName.trim()) {
      onCreate(newFolderName)
      setNewFolderName('')
      onClose()
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Enter a name for the new folder.
            <br />
            <span className="text-sm font-medium mt-2 block">
              Location: {parentPath}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <input
            type="text"
            className="w-full p-2 border rounded mb-2 dark:bg-gray-700 dark:border-gray-600"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="folder name"
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
              Create
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
