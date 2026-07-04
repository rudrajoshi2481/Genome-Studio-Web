"use client"

import React, { useEffect, useState } from 'react'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Download, Code2, Loader2, Search, X, Upload, FileJson, CheckCircle, XCircle, Settings2, RefreshCcw, ArrowUpDown, AlertTriangle, Trash2 } from "lucide-react"
import { useAuthStore } from '@/lib/stores/auth-store'
import { fetchCustomNodes, deleteCustomNode, bulkUploadNodes, recompileAllNodes, CustomNode, RecompileResult } from '@/lib/services/custom-node-service'
import { toast } from 'sonner'

export default function CustomizeDialog() {
  const [nodes, setNodes] = useState<CustomNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [previewNodes, setPreviewNodes] = useState<any[]>([])
  const [selectedPreviewNodes, setSelectedPreviewNodes] = useState<Set<number>>(new Set())
  const [isRecompiling, setIsRecompiling] = useState(false)
  const [recompileResult, setRecompileResult] = useState<RecompileResult | null>(null)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  const { token, isAuthenticated } = useAuthStore()

  // Fetch nodes on mount
  useEffect(() => {
    loadNodes()
  }, [])

  // Get unique languages and tags from nodes
  const languages = Array.from(new Set(nodes.map(n => n.language).filter(Boolean)))
  const allTags = Array.from(new Set(nodes.flatMap(n => Array.isArray(n.tags) ? n.tags : [])))

  // Filter nodes based on search and filters
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = searchQuery === '' || 
      node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesLanguage = selectedLanguage === 'all' || node.language === selectedLanguage
    
    const nodeTags = Array.isArray(node.tags) ? node.tags : []
    const matchesTag = selectedTag === 'all' || nodeTags.includes(selectedTag)
    
    return matchesSearch && matchesLanguage && matchesTag
  })

  const loadNodes = async () => {
    if (!token || !isAuthenticated) {
      console.log('User not authenticated')
      return
    }

    setIsLoading(true)
    try {
      const fetchedNodes = await fetchCustomNodes(token)
      setNodes(fetchedNodes)
    } catch (error) {
      console.error('Failed to fetch nodes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const selectAllVisible = () => {
    setSelectedNodes(new Set(filteredNodes.map(n => (n.id || n.node_id).toString())))
  }

  const deselectAll = () => {
    setSelectedNodes(new Set())
  }

  const handleDownloadSelected = () => {
    if (selectedNodes.size === 0) return

    const selectedNodesData = nodes
      .filter(node => selectedNodes.has((node.id || node.node_id).toString()))
      .map(node => ({
        title: node.title,
        description: node.description,
        language: node.language,
        function_name: node.function_name,
        source_code: node.source_code,
        inputs: node.inputs,
        outputs: node.outputs,
        tags: node.tags,
      }))

    const blob = new Blob([JSON.stringify(selectedNodesData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `custom_nodes_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!token || !isAuthenticated) return

    setUploadResult(null)

    try {
      const fileContent = await file.text()
      const parsedData = JSON.parse(fileContent)
      const nodesArray = Array.isArray(parsedData) ? parsedData : [parsedData]
      
      if (nodesArray.length === 0) return

      setPreviewNodes(nodesArray)
      setSelectedPreviewNodes(new Set(nodesArray.map((_, idx) => idx)))
      
    } catch (error: any) {
      console.error('File parsing error:', error)
    } finally {
      event.target.value = ''
    }
  }

  const togglePreviewNodeSelection = (index: number) => {
    setSelectedPreviewNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const selectAllPreview = () => {
    setSelectedPreviewNodes(new Set(previewNodes.map((_, idx) => idx)))
  }

  const deselectAllPreview = () => {
    setSelectedPreviewNodes(new Set())
  }

  const handleConfirmUpload = async () => {
    if (selectedPreviewNodes.size === 0) return

    setIsUploading(true)

    try {
      const nodesToUpload = previewNodes.filter((_, idx) => selectedPreviewNodes.has(idx))
      const result = await bulkUploadNodes(token || '', nodesToUpload)
      setUploadResult(result)
      
      if (result.created > 0) {
        loadNodes()
        setPreviewNodes([])
        setSelectedPreviewNodes(new Set())
      }
    } catch (error: any) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancelPreview = () => {
    setPreviewNodes([])
    setSelectedPreviewNodes(new Set())
    setUploadResult(null)
  }

  const handleBatchDelete = async () => {
    if (selectedNodes.size === 0 || !token) return
    setIsBatchDeleting(true)
    let successCount = 0
    let failCount = 0
    for (const nodeId of selectedNodes) {
      try {
        await deleteCustomNode(token, nodeId)
        successCount++
      } catch (err) {
        console.error(`Failed to delete node ${nodeId}:`, err)
        failCount++
      }
    }
    if (successCount > 0) toast.success(`Deleted ${successCount} node${successCount !== 1 ? 's' : ''}`)
    if (failCount > 0) toast.error(`Failed to delete ${failCount} node${failCount !== 1 ? 's' : ''}`)
    setSelectedNodes(new Set())
    setIsBatchDeleting(false)
    loadNodes()
  }

  const handleRecompileAll = async () => {
    if (!token || !isAuthenticated) {
      toast.error('You must be logged in to recompile')
      return
    }

    setIsRecompiling(true)
    setRecompileResult(null)

    try {
      const result = await recompileAllNodes(token)
      setRecompileResult(result)
      
      if (result.verification.errors === 0 && result.verification.recompiled === result.verification.total_nodes) {
        toast.success(result.message)
      } else if (result.verification.errors > 0) {
        toast.warning(result.message)
      } else {
        toast.success(result.message)
      }

      // Refresh the nodes list to reflect updated inputs/outputs
      await loadNodes()
    } catch (error: any) {
      console.error('Recompile error:', error)
      toast.error(error.message || 'Failed to recompile nodes')
    } finally {
      setIsRecompiling(false)
    }
  }

  return (
    <DialogContent className="min-w-[70vw] max-w-[90vw] h-[80vh] max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0">
      <DialogHeader className="px-6 py-3 border-b shrink-0">
        <DialogTitle>Customize Nodes</DialogTitle>
        <DialogDescription>
          Upload, download, and manage your custom nodes
        </DialogDescription>
      </DialogHeader>
      
      <Tabs defaultValue="transfer" className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* Sidebar Tab Navigation */}
        <TabsList className="w-56 shrink-0 border-r bg-muted/20 p-3 h-auto flex-col items-stretch justify-start gap-1 rounded-none">
          <TabsTrigger value="transfer" className="justify-start w-full h-auto flex-none px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <ArrowUpDown className="h-4 w-4 mr-2.5" />
            Upload & Download
          </TabsTrigger>
          <TabsTrigger value="manage" className="justify-start w-full h-auto flex-none px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <Settings2 className="h-4 w-4 mr-2.5" />
            Manage Nodes
          </TabsTrigger>
        </TabsList>

        {/* Upload & Download Tab Content */}
        <TabsContent value="transfer" className="flex-1 m-0 p-0 min-h-0 overflow-hidden">
          <div className="h-full flex flex-col min-h-0 px-6 py-4">
            {/* Search and Filters */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search nodes by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {languages.map(lang => (
                      <SelectItem key={lang} value={lang} className="capitalize">
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selection and Actions Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {selectedNodes.size} of {filteredNodes.length} selected
                </p>
                {selectedNodes.size > 0 && (
                  <Button variant="link" size="sm" onClick={deselectAll} className="h-auto p-0">
                    Clear
                  </Button>
                )}
                {selectedNodes.size < filteredNodes.length && filteredNodes.length > 0 && (
                  <Button variant="link" size="sm" onClick={selectAllVisible} className="h-auto p-0">
                    Select All Visible
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Upload button */}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="file-upload-transfer"
                />
                <label htmlFor="file-upload-transfer">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={isUploading}
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </span>
                  </Button>
                </label>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleDownloadSelected} 
                  disabled={selectedNodes.size === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download ({selectedNodes.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={selectedNodes.size === 0 || isBatchDeleting}
                >
                  {isBatchDeleting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Delete ({selectedNodes.size})
                </Button>
              </div>
            </div>
            
            {/* Upload preview overlay */}
            {previewNodes.length > 0 ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium">
                      Preview: {selectedPreviewNodes.size} of {previewNodes.length} selected
                    </p>
                    {selectedPreviewNodes.size > 0 && (
                      <Button variant="link" size="sm" onClick={deselectAllPreview} className="h-auto p-0">
                        Clear
                      </Button>
                    )}
                    {selectedPreviewNodes.size < previewNodes.length && (
                      <Button variant="link" size="sm" onClick={selectAllPreview} className="h-auto p-0">
                        Select All
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelPreview}>
                      Cancel
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleConfirmUpload} 
                      disabled={selectedPreviewNodes.size === 0 || isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload ({selectedPreviewNodes.size})
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pr-2">
                    {previewNodes.map((node, index) => {
                      const isSelected = selectedPreviewNodes.has(index)
                      const nodeTags = Array.isArray(node.tags) ? node.tags : []
                      
                      return (
                        <div
                          key={index}
                          onClick={() => togglePreviewNodeSelection(index)}
                          className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? 'bg-accent border-primary ring-2 ring-primary/20' : 'hover:bg-accent/30'
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <Code2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium line-clamp-2 leading-tight">
                                {node.title || 'Untitled Node'}
                              </p>
                            </div>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => togglePreviewNodeSelection(index)}
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0"
                            />
                          </div>
                          
                          {node.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {node.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-1 flex-wrap mt-auto">
                            <span className="text-xs px-1.5 py-0.5 bg-secondary rounded capitalize">
                              {node.language || 'python'}
                            </span>
                            {nodeTags.slice(0, 2).map((tag: string, idx: number) => (
                              <span key={idx} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                {tag}
                              </span>
                            ))}
                            {nodeTags.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{nodeTags.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <ScrollArea className="flex-1 min-h-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredNodes.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-muted-foreground">
                      {nodes.length === 0 ? 'No nodes found. Upload a JSON file to get started.' : 'No nodes match your filters'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pr-2">
                    {filteredNodes.map((node) => {
                      const nodeId = (node.id || node.node_id).toString()
                      const isSelected = selectedNodes.has(nodeId)
                      const nodeTags = Array.isArray(node.tags) ? node.tags : []
                      
                      return (
                        <div
                          key={nodeId}
                          onClick={() => toggleNodeSelection(nodeId)}
                          className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? 'bg-accent border-primary ring-2 ring-primary/20' : 'hover:bg-accent/30'
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <Code2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium line-clamp-2 leading-tight">{node.title}</p>
                            </div>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleNodeSelection(nodeId)}
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0"
                            />
                          </div>
                          
                          {node.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {node.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-1 flex-wrap mt-auto">
                            <span className="text-xs px-1.5 py-0.5 bg-secondary rounded capitalize">
                              {node.language}
                            </span>
                            {nodeTags.slice(0, 2).map((tag, idx) => (
                              <span key={idx} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                {tag}
                              </span>
                            ))}
                            {nodeTags.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{nodeTags.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            )}

            {/* Upload result summary */}
            {uploadResult && previewNodes.length === 0 && (
              <Alert className="mt-4">
                <div className="flex items-center justify-between">
                  <AlertTitle>Upload Summary</AlertTitle>
                  <Button variant="ghost" size="sm" onClick={() => setUploadResult(null)} className="h-auto p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <AlertDescription>
                  <div className="space-y-2 mt-2">
                    {uploadResult.created > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle className="h-4 w-4" />
                        <span>{uploadResult.created} node(s) created successfully</span>
                      </div>
                    )}
                    {uploadResult.failed > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <XCircle className="h-4 w-4" />
                          <span>{uploadResult.failed} node(s) failed</span>
                        </div>
                        {uploadResult.failed_nodes && uploadResult.failed_nodes.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {uploadResult.failed_nodes.map((failed: any, idx: number) => (
                              <p key={idx} className="text-xs text-muted-foreground">
                                {failed.title}: {failed.error}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* Manage Nodes Tab Content */}
        <TabsContent value="manage" className="flex-1 m-0 p-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6 max-w-2xl mx-auto">

              {/* Actions */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Node Management</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recompile all custom nodes to re-analyze source code and update input/output type inference.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleRecompileAll} disabled={isRecompiling}>
                    {isRecompiling ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4 mr-1.5" />
                    )}
                    Recompile All Nodes
                  </Button>
                  <Button variant="ghost" size="sm" onClick={loadNodes} disabled={isLoading}>
                    <RefreshCcw className="h-4 w-4 mr-1.5" />
                    Refresh List
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Loading state */}
              {isRecompiling && !recompileResult && (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Recompiling nodes...</p>
                  </div>
                </div>
              )}

              {/* Recompile Results */}
              {recompileResult && (
                <div className="space-y-4">

                  {/* Summary Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recompile Summary</CardTitle>
                      <CardDescription>{recompileResult.message}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Stats grid */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="flex flex-col items-center justify-center p-3 border rounded-lg">
                          <span className="text-2xl font-semibold tabular-nums">{recompileResult.verification.total_nodes}</span>
                          <span className="text-xs text-muted-foreground mt-1">Total</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 border rounded-lg">
                          <span className="text-2xl font-semibold tabular-nums">{recompileResult.verification.recompiled}</span>
                          <span className="text-xs text-muted-foreground mt-1">Recompiled</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 border rounded-lg">
                          <span className="text-2xl font-semibold tabular-nums">{recompileResult.verification.changed}</span>
                          <span className="text-xs text-muted-foreground mt-1">Changed</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 border rounded-lg">
                          <span className="text-2xl font-semibold tabular-nums">{recompileResult.verification.errors}</span>
                          <span className="text-xs text-muted-foreground mt-1">Errors</span>
                        </div>
                      </div>

                      {/* Output file */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileJson className="h-3.5 w-3.5 shrink-0" />
                        <span>Saved to <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{recompileResult.verification.output_file}</code></span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Any-type warnings */}
                  {(recompileResult.verification.any_type_inputs > 0 || recompileResult.verification.any_type_outputs > 0) && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Unresolved type inference</AlertTitle>
                      <AlertDescription>
                        <p>{recompileResult.verification.any_type_inputs} input(s) and {recompileResult.verification.any_type_outputs} output(s) inferred as <Badge variant="outline" className="font-mono ml-1">any</Badge></p>
                        <p className="mt-1">These may need manual type assignment.</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Errors */}
                  {recompileResult.verification.error_details.length > 0 && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Failed nodes ({recompileResult.verification.error_details.length})</AlertTitle>
                      <AlertDescription>
                        <div className="space-y-1.5 mt-2">
                          {recompileResult.verification.error_details.map((err, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-xs"><strong>{err.title}</strong>: {err.error}</span>
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Changed nodes */}
                  {recompileResult.nodes.filter(n => n.inputs_changed || n.outputs_changed).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Updated Nodes</CardTitle>
                        <CardDescription>
                          {recompileResult.nodes.filter(n => n.inputs_changed || n.outputs_changed).length} node(s) had inputs or outputs updated
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {recompileResult.nodes.filter(n => n.inputs_changed || n.outputs_changed).map((n) => (
                            <div key={n.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium truncate">{n.title}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {n.inputs_changed && <Badge variant="secondary">inputs</Badge>}
                                {n.outputs_changed && <Badge variant="secondary">outputs</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Dismiss */}
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setRecompileResult(null)}>
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!isRecompiling && !recompileResult && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <RefreshCcw className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium">No recompile results yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Click "Recompile All Nodes" to re-analyze all custom node source code and update their input/output type inference.
                  </p>
                </div>
              )}

            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </DialogContent>
  )
}
