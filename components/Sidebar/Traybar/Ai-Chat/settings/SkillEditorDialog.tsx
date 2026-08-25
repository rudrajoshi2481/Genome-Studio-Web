import React, { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import type { ChatSettings } from "./useChatSettings"
import type { SkillInfo } from "./types"

interface SkillEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  s: ChatSettings
  /** When set, edit this skill; otherwise create a new one. */
  skill?: SkillInfo | null
}

export function SkillEditorDialog({ open, onOpenChange, s, skill }: SkillEditorDialogProps) {
  const isEdit = !!skill
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Sync local form state whenever the dialog opens or the target skill changes
  useEffect(() => {
    if (open) {
      setName(skill?.name || "")
      setDescription(skill?.description || "")
      setBody(skill?.body || "")
      setError(s.skillError)
    }
  }, [open, skill])

  // Mirror backend errors into local state
  useEffect(() => {
    setError(s.skillError)
  }, [s.skillError])

  const handleSave = async () => {
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Skill name is required")
      return
    }
    const payload = { name: trimmedName, description: description.trim(), body }
    const result = await s.handleSaveSkill(payload, isEdit ? skill!.name : undefined)
    if (result) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) s.setSkillError(null); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? `Edit Skill: ${skill!.name}` : "New Skill"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Skills are markdown files (SKILL.md) with a name, description, and body.
            The body is injected into the agent&apos;s system prompt when the skill matches.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="skill-name" className="text-xs">Name</Label>
            <Input
              id="skill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. crispr-design"
              disabled={s.skillSaving}
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Letters, numbers, dashes, and underscores only.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-desc" className="text-xs">Description</Label>
            <Input
              id="skill-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary — used for keyword matching and the @ menu"
              disabled={s.skillSaving}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-body" className="text-xs">Body (Markdown)</Label>
            <Textarea
              id="skill-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"## When to use this skill\n...\n\n## Instructions\n..."}
              disabled={s.skillSaving}
              className="min-h-[260px] font-mono text-xs resize-y"
            />
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { s.setSkillError(null); onOpenChange(false) }}
            disabled={s.skillSaving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={s.skillSaving}>
            {s.skillSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isEdit ? "Save changes" : "Create skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SkillEditorDialog
