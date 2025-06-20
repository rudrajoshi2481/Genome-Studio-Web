import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MetadataDialogProps, PipelineMetadata } from '../types'

const MetadataDialog: React.FC<MetadataDialogProps> = ({
  isOpen,
  onOpenChange,
  metadata,
  onSave
}) => {
  const [tempMetadata, setTempMetadata] = useState<PipelineMetadata>({
    id: "",
    name: "",
    description: ""
  })

  // Update temp metadata when dialog opens or metadata changes
  useEffect(() => {
    if (isOpen) {
      setTempMetadata({
        id: metadata.id,
        name: metadata.name,
        description: metadata.description
      })
    }
  }, [isOpen, metadata])

  const handleSave = () => {
    onSave(tempMetadata)
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Pipeline Metadata</DialogTitle>
          <DialogDescription>
            Update the metadata for your pipeline flow file.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="id" className="text-right">ID</Label>
            <Input 
              id="id" 
              value={tempMetadata.id} 
              onChange={(e) => setTempMetadata({...tempMetadata, id: e.target.value})}
              className="col-span-3" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input 
              id="name" 
              value={tempMetadata.name} 
              onChange={(e) => setTempMetadata({...tempMetadata, name: e.target.value})}
              className="col-span-3" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Textarea 
              id="description" 
              value={tempMetadata.description} 
              onChange={(e) => setTempMetadata({...tempMetadata, description: e.target.value})}
              className="col-span-3" 
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MetadataDialog
