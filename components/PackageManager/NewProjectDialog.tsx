"use client"

import React, { useState, useEffect } from 'react'
import { Loader2, Plus, Package, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import TagInput from '@/components/Sidebar/Nodebar/CustomNode/TagInput'
import {
  createPackage,
  PackageDetail,
} from '@/lib/services/package-manager-service'

interface NewProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (pkg: PackageDetail) => void
}

export default function NewProjectDialog({ isOpen, onClose, onCreated }: NewProjectDialogProps) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionMd, setDescriptionMd] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [license, setLicense] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Reset form whenever the dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setDisplayName('')
      setDescription('')
      setDescriptionMd('')
      setAuthor('')
      setTags([])
      setLicense('')
    }
  }, [isOpen])

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Package name is required')
      return
    }
    if (!displayName.trim()) {
      toast.error('Display name is required')
      return
    }

    setIsCreating(true)
    try {
      const pkg = await createPackage({
        name: name.trim(),
        display_name: displayName.trim(),
        description: description.trim(),
        description_md: descriptionMd.trim(),
        author: author.trim(),
        tags,
        license: license.trim(),
        visibility: 'public',
      })
      toast.success(`Package "${pkg.display_name}" created!`)
      onCreated(pkg)
      onClose()
    } catch (err: any) {
      toast.error(`Failed to create package: ${err.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[50vw] max-w-[60vw] max-h-[85vh] overflow-hidden flex flex-col p-4 gap-3">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Create New Package
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 pr-4">
            <p className="text-[11px] text-muted-foreground">
              A package is a project that contains nodes (functions), install files, and
              versioned releases. After creating it, you can add nodes and publish versions
              from the "My Packages" tab.
            </p>

            <Separator />

            {/* Name + Display Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Package Name (slug) *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. single-cell-toolkit"
                  className="h-8 text-xs mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Unique identifier. Auto-slugified.</p>
              </div>
              <div>
                <Label className="text-xs">Display Name *</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Single Cell Toolkit"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs">Short Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One-line description"
                className="h-8 text-xs mt-1"
              />
            </div>

            {/* Description MD */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" /> Description (Markdown)
              </Label>
              <Textarea
                value={descriptionMd}
                onChange={(e) => setDescriptionMd(e.target.value)}
                placeholder={'# My Package\n\nDetailed documentation in Markdown...'}
                className="text-xs mt-1 min-h-[100px] font-mono"
              />
            </div>

            {/* Author + License */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Author</Label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">License</Label>
                <Input
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  placeholder="e.g. MIT, Apache-2.0"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs">Tags</Label>
              <div className="mt-1">
                <TagInput
                  tags={tags}
                  onAddTag={(t: string) => setTags([...tags, t])}
                  onRemoveTag={(t: string) => setTags(tags.filter(x => x !== t))}
                  placeholder="Add tags (e.g. scRNA, genomics, alignment)"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || !displayName.trim()}
          >
            {isCreating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Create Package
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
