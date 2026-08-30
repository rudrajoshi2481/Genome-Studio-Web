"use client"

import React, { useState, useEffect } from 'react'
import { PlayIcon, Loader2, Save, Trash2, Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import SimpleCodeEditor from '@/components/Sidebar/Nodebar/CustomNode/SimpleCodeEditor'
import TagInput from '@/components/Sidebar/Nodebar/CustomNode/TagInput'
import { getHandleTypeInfo } from '@/components/Editorwindow_new/editors/canvas/handleTypes'
import {
  PackageNode,
  PackageNodeIO,
  createLocalNode as createNode,
  updateLocalNode as updateNode,
  deleteLocalNode as deleteNode,
  validateLocalNode as validateNode,
} from '@/lib/services/local-package-manager-service'

interface NodeEditorProps {
  packageId: number
  node: PackageNode | null  // null = creating new
  onClose: () => void
  onSaved: () => void  // refresh callback
}

export default function NodeEditor({ packageId, node, onClose, onSaved }: NodeEditorProps) {
  const isEditing = !!node

  const [title, setTitle] = useState(node?.title || '')
  const [language, setLanguage] = useState(node?.language || 'python')
  const [description, setDescription] = useState(node?.description || '')
  const [sourceCode, setSourceCode] = useState(node?.source_code || '@node()\ndef my_function(input_var):\n    # Your code here\n    result = input_var\n    return result\n')
  const [inputs, setInputs] = useState<PackageNodeIO[]>(node?.inputs || [])
  const [outputs, setOutputs] = useState<PackageNodeIO[]>(node?.outputs || [])
  const [tags, setTags] = useState<string[]>(node?.tags || [])

  // Test state (mirrors the Nodebar CustomNode dialog)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{
    valid: boolean
    function_name?: string
    inputs: PackageNodeIO[]
    outputs: PackageNodeIO[]
  } | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  // IO descriptions (editable, keyed by IO id — preserved across re-tests by name)
  const [ioDescriptions, setIoDescriptions] = useState<Record<string, string>>({})

  const [isSaving, setIsSaving] = useState(false)

  const nodeTypes = ['any', 'string', 'int', 'float', 'bool', 'list', 'dict', 'file', 'AnnData', 'DataFrame', 'ndarray', 'figure', 'fastq', 'bam', 'bed', 'gtf']

  // Reset state when node changes
  useEffect(() => {
    if (node) {
      setTitle(node.title)
      setLanguage(node.language)
      setDescription(node.description || '')
      setSourceCode(node.source_code)
      setInputs(node.inputs)
      setOutputs(node.outputs)
      setTags(node.tags)
      // Pre-populate testResult so the preview is visible without re-testing
      setTestResult({
        valid: true,
        function_name: node.function_name,
        inputs: node.inputs,
        outputs: node.outputs,
      })
      setTestError(null)
    } else {
      setTitle('')
      setLanguage('python')
      setDescription('')
      setSourceCode('@node()\ndef my_function(input_var):\n    # Your code here\n    result = input_var\n    return result\n')
      setInputs([])
      setOutputs([])
      setTags([])
      setTestResult(null)
      setTestError(null)
    }
    setIoDescriptions({})
  }, [node])

  // ── Test Node: validate via executor and update inputs/outputs ──
  const handleTestCode = async () => {
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)

    try {
      const result = await validateNode(sourceCode, language)

      if (result.valid && result.fields) {
        // Normalize IOs from the validation result
        const newInputs: PackageNodeIO[] = (result.fields.inputs || []).map((io: any, i: number) => ({
          id: io.id || `input_${i}`,
          name: io.name || `input_${i + 1}`,
          type: io.type || 'any',
          description: io.description || '',
        }))
        const newOutputs: PackageNodeIO[] = (result.fields.outputs || []).map((io: any, i: number) => ({
          id: io.id || `output_${i}`,
          name: io.name || `output_${i + 1}`,
          type: io.type || 'any',
          description: io.description || '',
        }))

        // Preserve descriptions from previous test by matching on name
        const prevInputDescs: Record<string, string> = {}
        const prevOutputDescs: Record<string, string> = {}
        if (testResult?.inputs) {
          testResult.inputs.forEach((inp) => {
            const key = inp.id || ''
            const desc = (key ? ioDescriptions[key] : '') ?? inp.description ?? ''
            if (inp.name && desc) prevInputDescs[inp.name] = desc
          })
        }
        if (testResult?.outputs) {
          testResult.outputs.forEach((out) => {
            const key = out.id || ''
            const desc = (key ? ioDescriptions[key] : '') ?? out.description ?? ''
            if (out.name && desc) prevOutputDescs[out.name] = desc
          })
        }

        // Match new IOs to preserved descriptions
        const newIoDescs: Record<string, string> = {}
        newInputs.forEach((inp) => {
          const key = inp.id || ''
          if (key) newIoDescs[key] = prevInputDescs[inp.name] || inp.description || ''
        })
        newOutputs.forEach((out) => {
          const key = out.id || ''
          if (key) newIoDescs[key] = prevOutputDescs[out.name] || out.description || ''
        })
        setIoDescriptions(newIoDescs)

        // Update the actual inputs/outputs state
        setInputs(newInputs)
        setOutputs(newOutputs)

        // Auto-fill title if empty
        if (!title) setTitle(result.fields.title)

        setTestResult({
          valid: true,
          function_name: result.fields.function_name,
          inputs: newInputs,
          outputs: newOutputs,
        })
        toast.success('Node tested successfully')
      } else {
        setTestError(result.error || 'Unknown error')
        toast.error(`Test failed: ${result.error}`)
      }
    } catch (err: any) {
      const msg = err.detail?.error || err.message
      setTestError(msg)
      toast.error(`Test failed: ${msg}`)
    } finally {
      setTestLoading(false)
    }
  }

  const handleSave = async () => {
    // Require a test before saving (same as Nodebar dialog)
    if (!testResult) {
      toast.error('Please test the node before saving')
      setTestError('Please test the node before saving')
      return
    }

    setIsSaving(true)
    try {
      // Merge ioDescriptions into inputs/outputs before saving
      const finalInputs = inputs.map(io => ({
        ...io,
        description: (io.id ? ioDescriptions[io.id] : '') ?? io.description ?? '',
      }))
      const finalOutputs = outputs.map(io => ({
        ...io,
        description: (io.id ? ioDescriptions[io.id] : '') ?? io.description ?? '',
      }))

      if (isEditing && node) {
        await updateNode(packageId, node.id, {
          title,
          language,
          description,
          source_code: sourceCode,
          inputs: finalInputs,
          outputs: finalOutputs,
          tags,
          validate: true,
        })
        toast.success('Node updated')
      } else {
        await createNode(packageId, {
          title,
          language,
          description,
          source_code: sourceCode,
          inputs: finalInputs,
          outputs: finalOutputs,
          tags,
          validate: true,
        })
        toast.success('Node created')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      const errorMsg = err.detail?.error || err.message
      toast.error(`Failed to save node: ${errorMsg}`)
      setTestError(errorMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!node) return
    if (!confirm(`Delete node "${node.title}"?`)) return
    try {
      await deleteNode(packageId, node.id)
      toast.success('Node deleted')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`)
    }
  }

  // Manual add/remove/update IO
  const addInput = () => {
    const newId = `input_${Date.now()}_${inputs.length}`
    setInputs([...inputs, { id: newId, name: '', type: 'any' }])
  }
  const addOutput = () => {
    const newId = `output_${Date.now()}_${outputs.length}`
    setOutputs([...outputs, { id: newId, name: '', type: 'any' }])
  }
  const removeInput = (idx: number) => setInputs(inputs.filter((_, i) => i !== idx))
  const removeOutput = (idx: number) => setOutputs(outputs.filter((_, i) => i !== idx))
  const updateInput = (idx: number, field: keyof PackageNodeIO, value: string) => {
    setInputs(inputs.map((io, i) => i === idx ? { ...io, [field]: value } : io))
  }
  const updateOutput = (idx: number, field: keyof PackageNodeIO, value: string) => {
    setOutputs(outputs.map((io, i) => i === idx ? { ...io, [field]: value } : io))
  }

  return (
    <DialogContent className="min-w-[75vw] max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col p-4 gap-3">
      <DialogHeader className="flex-shrink-0">
        <DialogTitle className="text-sm flex items-center gap-2">
          {isEditing ? `Edit Node — ${node?.title}` : 'Create New Node'}
        </DialogTitle>
      </DialogHeader>

      {/* Title + Language */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Node Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Node title"
            className="h-8 text-xs mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="r">R</SelectItem>
              <SelectItem value="bash">Bash</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="flex-shrink-0">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this node does..."
          className="text-xs mt-1 min-h-[60px] resize-y"
        />
      </div>

      {/* Code Editor + Test Button */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Node Code</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1.5"
            onClick={handleTestCode}
            disabled={testLoading}
          >
            {testLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <PlayIcon className="h-3.5 w-3.5" />
                Test Node
              </>
            )}
          </Button>
        </div>
        <div className="border rounded-md overflow-hidden" style={{ height: '220px' }}>
          <SimpleCodeEditor
            value={sourceCode}
            onChange={setSourceCode}
            extension={language === 'python' ? 'py' : language === 'r' ? 'r' : 'sh'}
          />
        </div>
      </div>

      {/* Test Error */}
      {testError && (
        <Alert variant="destructive" className="flex-shrink-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-[11px] font-mono whitespace-pre-wrap">
            {testError}
          </AlertDescription>
        </Alert>
      )}

      {/* Node Preview + IO Details (only after test) */}
      {testResult && testResult.valid && (
        <div className="flex-shrink-0 rounded-md border p-3 bg-muted/30">
          <div className="flex gap-4">
            {/* ── Left: Visual Node Preview ── */}
            <div className="flex items-start justify-center pt-2" style={{ width: '260px' }}>
              <div className="relative">
                {/* Connection lines decoration */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-px bg-stone-300" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-px bg-stone-300" />

                <Card className="border shadow-sm overflow-hidden bg-card" style={{ width: '240px' }}>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-center text-xs">
                      {title || testResult.function_name || 'Node'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="relative">
                      <div
                        className="flex justify-between items-start gap-4"
                        style={{
                          minHeight: Math.max(testResult.inputs.length, testResult.outputs.length) > 3 ? '110px' : '70px',
                        }}
                      >
                        {/* Input Handles */}
                        <div className="flex flex-col gap-2.5 items-start">
                          {testResult.inputs.map((input) => {
                            const info = getHandleTypeInfo(input.type || 'any')
                            return (
                              <div key={input.id} className="flex items-center gap-1.5 group relative">
                                <div
                                  className="w-3 h-3 rounded-full group-hover:scale-125 transition-transform border-2 border-background shrink-0"
                                  style={{ background: info.handleColor }}
                                />
                                <span className="text-[10px] font-medium text-muted-foreground">{input.name}</span>
                                <div className="absolute -left-2 -top-6 invisible group-hover:visible bg-popover border text-popover-foreground text-[9px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-50 pointer-events-none">
                                  {info.label}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* Output Handles */}
                        <div className="flex flex-col gap-2.5 items-end">
                          {testResult.outputs.map((output) => {
                            const info = getHandleTypeInfo(output.type || 'any')
                            return (
                              <div key={output.id} className="flex items-center gap-1.5 group relative">
                                <span className="text-[10px] font-medium text-muted-foreground">{output.name}</span>
                                <div
                                  className="w-3 h-3 rounded-full group-hover:scale-125 transition-transform border-2 border-background shrink-0"
                                  style={{ background: info.handleColor }}
                                />
                                <div className="absolute -right-2 -top-6 invisible group-hover:visible bg-popover border text-popover-foreground text-[9px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-50 pointer-events-none">
                                  {info.label}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Function name badge below node */}
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">{testResult.function_name}</span>
                  <Badge variant="secondary" className="text-[9px] h-4 capitalize">
                    {language}
                  </Badge>
                </div>
              </div>
            </div>

            {/* ── Right: IO Details with editable descriptions ── */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              {/* Inputs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">Inputs</h5>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-0.5 px-1" onClick={addInput}>
                    <Plus className="h-2.5 w-2.5" /> Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {testResult.inputs.map((input, idx) => {
                    const info = getHandleTypeInfo(input.type || 'any')
                    return (
                      <div key={input.id} className="flex items-center gap-2 px-2 py-1 rounded-md border bg-card/50 hover:bg-card transition-colors">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-background"
                          style={{ background: info.handleColor }}
                        />
                        <input
                          type="text"
                          className="text-xs font-mono font-medium shrink-0 bg-transparent outline-none w-20"
                          value={inputs[idx]?.name ?? input.name}
                          onChange={(e) => {
                            if (inputs[idx]) updateInput(idx, 'name', e.target.value)
                          }}
                        />
                        <textarea
                          className="flex-1 min-w-0 text-[10px] text-muted-foreground placeholder:text-muted-foreground/60 bg-transparent resize-none outline-none focus:outline-none px-0 py-0 leading-tight"
                          placeholder={`Description of ${input.name}`}
                          rows={1}
                          value={(input.id ? ioDescriptions[input.id] : '') ?? input.description ?? ''}
                          onChange={(e) => {
                            const id = input.id
                            if (id) setIoDescriptions(prev => ({ ...prev, [id]: e.target.value }))
                          }}
                        />
                        <Select
                          value={inputs[idx]?.type ?? input.type}
                          onValueChange={(v) => {
                            if (inputs[idx]) updateInput(idx, 'type', v)
                          }}
                        >
                          <SelectTrigger className="h-5 text-[9px] w-16 px-1 py-0 border-0 bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {nodeTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${info.badgeClass} border-0 shrink-0`}>
                          {info.label}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeInput(idx)}>
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    )
                  })}
                  {testResult.inputs.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic px-2">No inputs detected</p>
                  )}
                </div>
              </div>

              {/* Outputs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">Outputs</h5>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-0.5 px-1" onClick={addOutput}>
                    <Plus className="h-2.5 w-2.5" /> Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {testResult.outputs.map((output, idx) => {
                    const info = getHandleTypeInfo(output.type || 'any')
                    return (
                      <div key={output.id} className="flex items-center gap-2 px-2 py-1 rounded-md border bg-card/50 hover:bg-card transition-colors">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-background"
                          style={{ background: info.handleColor }}
                        />
                        <input
                          type="text"
                          className="text-xs font-mono font-medium shrink-0 bg-transparent outline-none w-20"
                          value={outputs[idx]?.name ?? output.name}
                          onChange={(e) => {
                            if (outputs[idx]) updateOutput(idx, 'name', e.target.value)
                          }}
                        />
                        <textarea
                          className="flex-1 min-w-0 text-[10px] text-muted-foreground placeholder:text-muted-foreground/60 bg-transparent resize-none outline-none focus:outline-none px-0 py-0 leading-tight"
                          placeholder={`Description of ${output.name}`}
                          rows={1}
                          value={(output.id ? ioDescriptions[output.id] : '') ?? output.description ?? ''}
                          onChange={(e) => {
                            const id = output.id
                            if (id) setIoDescriptions(prev => ({ ...prev, [id]: e.target.value }))
                          }}
                        />
                        <Select
                          value={outputs[idx]?.type ?? output.type}
                          onValueChange={(v) => {
                            if (outputs[idx]) updateOutput(idx, 'type', v)
                          }}
                        >
                          <SelectTrigger className="h-5 text-[9px] w-16 px-1 py-0 border-0 bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {nodeTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${info.badgeClass} border-0 shrink-0`}>
                          {info.label}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeOutput(idx)}>
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    )
                  })}
                  {testResult.outputs.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic px-2">No outputs detected</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder when not tested yet */}
      {!testResult && !testError && (
        <div className="flex-shrink-0 rounded-md border border-dashed p-6 text-center">
          <PlayIcon className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-[11px] text-muted-foreground">
            Click <strong>"Test Node"</strong> to analyze your code and auto-detect inputs/outputs
          </p>
        </div>
      )}

      <div className="flex-1" />

      {/* Tags */}
      <div className="flex-shrink-0">
        <Label className="text-xs">Tags</Label>
        <div className="mt-1">
          <TagInput
            tags={tags}
            onAddTag={(t: string) => setTags([...tags, t])}
            onRemoveTag={(t: string) => setTags(tags.filter(x => x !== t))}
            placeholder="Add tags..."
          />
        </div>
      </div>

      <DialogFooter className="flex-shrink-0 gap-2">
        {isEditing && (
          <Button variant="destructive" size="sm" className="text-xs gap-1 mr-auto" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        )}
        <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="text-xs gap-1" onClick={handleSave} disabled={isSaving || !testResult}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isEditing ? 'Update Node' : 'Create Node'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
