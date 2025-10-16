"use client"

import React, { useEffect, useState } from 'react'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Code2, Loader2, Search, Filter, X, Upload, FileJson, CheckCircle, XCircle } from "lucide-react"
import { useAuthStore } from '@/lib/stores/auth-store'
import { fetchCustomNodes, bulkUploadNodes, CustomNode } from '@/lib/services/custom-node-service'
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
      toast.error('Failed to load nodes')
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

  const selectAll = () => {
    setSelectedNodes(new Set(filteredNodes.map(n => (n.id || n.node_id).toString())))
  }

  const selectAllVisible = () => {
    setSelectedNodes(new Set(filteredNodes.map(n => (n.id || n.node_id).toString())))
  }

  const deselectAll = () => {
    setSelectedNodes(new Set())
  }

  const handleDownloadSelected = () => {
    if (selectedNodes.size === 0) {
      toast.error('No nodes selected')
      return
    }

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
    
    toast.success(`Downloaded ${selectedNodes.size} node${selectedNodes.size !== 1 ? 's' : ''}`)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!token || !isAuthenticated) {
      toast.error('You must be logged in to upload nodes')
      return
    }

    setUploadResult(null)

    try {
      const fileContent = await file.text()
      const parsedData = JSON.parse(fileContent)
      
      // Check if it's an array or single object
      const nodesArray = Array.isArray(parsedData) ? parsedData : [parsedData]
      
      // Validate nodes data
      if (nodesArray.length === 0) {
        toast.error('No valid nodes found in file')
        return
      }

      // Show preview
      setPreviewNodes(nodesArray)
      // Select all by default
      setSelectedPreviewNodes(new Set(nodesArray.map((_, idx) => idx)))
      toast.success(`Loaded ${nodesArray.length} node(s) for preview`)
      
    } catch (error: any) {
      console.error('File parsing error:', error)
      toast.error('Failed to parse JSON file')
    } finally {
      // Reset file input
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
    if (selectedPreviewNodes.size === 0) {
      toast.error('No nodes selected')
      return
    }

    setIsUploading(true)

    try {
      const nodesToUpload = previewNodes.filter((_, idx) => selectedPreviewNodes.has(idx))
      
      const loadingToast = toast.loading(`Uploading ${nodesToUpload.length} node(s)...`)
      
      const result = await bulkUploadNodes(token || '', nodesToUpload)
      
      toast.dismiss(loadingToast)
      setUploadResult(result)
      
      if (result.created > 0) {
        toast.success(`Successfully uploaded ${result.created} node(s)`)
        // Refresh the nodes list
        loadNodes()
        // Clear preview
        setPreviewNodes([])
        setSelectedPreviewNodes(new Set())
      }
      
      if (result.failed > 0) {
        toast.error(`Failed to upload ${result.failed} node(s)`)
      }
      
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload nodes')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancelPreview = () => {
    setPreviewNodes([])
    setSelectedPreviewNodes(new Set())
    setUploadResult(null)
  }

  return (
    <DialogContent className="min-w-[70vw] min-h-[80vh] flex flex-col">
      <DialogHeader className="pb-4 border-b">
        <DialogTitle>Customize</DialogTitle>
        <DialogDescription>
          Download or upload custom nodes
        </DialogDescription>
      </DialogHeader>
      
      <Tabs defaultValue="download" className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="download">Download Nodes</TabsTrigger>
          <TabsTrigger value="upload">Upload Nodes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="download" className="flex-1 mt-4 overflow-hidden">
          <div className="h-full flex flex-col">
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
                <p className="text-sm text-muted-foreground">
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
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleDownloadSelected} 
                  disabled={selectedNodes.size === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download ({selectedNodes.size})
                </Button>
                <Button variant="outline" size="sm" onClick={loadNodes} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNodes.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">
                    {nodes.length === 0 ? 'No nodes found' : 'No nodes match your filters'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
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
                            <p className="text-sm font-medium line-clamp-2 leading-tight">{node.title}</p>
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
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="upload" className="flex-1 mt-4 overflow-hidden">
          <div className="h-full flex flex-col">
            {previewNodes.length === 0 ? (
              // Upload interface
              <div className="flex-1 flex items-center justify-center">
                <div className="max-w-md w-full space-y-6">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center">
                      <div className="p-4 bg-primary/10 rounded-full">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold">Upload Custom Nodes</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a JSON file to preview and select nodes before saving
                    </p>
                  </div>

                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <FileJson className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Click to upload JSON file</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Preview nodes before saving to database
                        </p>
                      </div>
                    </label>
                  </div>

                  {uploadResult && (
                    <div className="space-y-3">
                      <div className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Upload Summary</span>
                        </div>
                        
                        {uploadResult.created > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">
                              {uploadResult.created} node(s) created successfully
                            </span>
                          </div>
                        )}
                        
                        {uploadResult.failed > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-red-600">
                                {uploadResult.failed} node(s) failed
                              </span>
                            </div>
                            {uploadResult.failed_nodes && uploadResult.failed_nodes.length > 0 && (
                              <div className="ml-6 space-y-1">
                                {uploadResult.failed_nodes.map((failed: any, idx: number) => (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    • {failed.title}: {failed.error}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUploadResult(null)}
                        className="w-full"
                      >
                        Upload Another File
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Preview interface
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {selectedPreviewNodes.size} of {previewNodes.length} selected
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelPreview}
                    >
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

                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="grid grid-cols-5 gap-3">
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
                              <p className="text-sm font-medium line-clamp-2 leading-tight">
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
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  )
}
