import React from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UnsavedChangesDialogProps {
  isOpen: boolean
  fileName: string
  onClose: () => void
  onSave: () => void
  onConfirm: () => void
}

const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  fileName,
  onClose,
  onSave,
  onConfirm
}) => {

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Unsaved Changes</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {fileName} has unsaved changes. Are you sure you want to close it?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={onSave}>
            Save & Close
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Close Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UnsavedChangesDialog
