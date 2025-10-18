"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { FlipVertical2, RefreshCcw, Code2, Trash2, Edit, Copy, Search, Star, X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import CustomNode from './CustomNode/CustomNode'
import { useAuthStore } from '@/lib/stores/auth-store'
import { fetchCustomNodes, deleteCustomNode, duplicateCustomNode, toggleFavoriteNode, getFavoriteNodes, CustomNode as CustomNodeType } from '@/lib/services/custom-node-service'
import { toast } from 'sonner'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"


function Nodebar() {
  const [customNodes, setCustomNodes] = useState<CustomNodeType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  // State for editing nodes
  const [editingNode, setEditingNode] = useState<CustomNodeType | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { token, isAuthenticated } = useAuthStore()
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [favoriteNodes, setFavoriteNodes] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('all')
  const [isTagsOpen, setIsTagsOpen] = useState(false)

  // Ensure component only renders on client after hydration
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Prevent hydration mismatch by ensuring search/filter state is only used after mount
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Function to fetch custom nodes
  const loadCustomNodes = async () => {
    if (!token || !isAuthenticated) {
      console.log('User not authenticated, skipping custom node fetch')
      return
    }

    setIsLoading(true)
    try {
      const nodes = await fetchCustomNodes(token)
      console.log('Fetched custom nodes:', nodes)
      setCustomNodes(nodes)
    } catch (error) {
      console.error('Failed to fetch custom nodes:', error)
      toast.error('Failed to load custom nodes')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Function to handle editing a node
  const handleEditNode = (node: CustomNodeType) => {
    console.log('Editing node:', node)
    setEditingNode(node)
    setIsEditDialogOpen(true)
  }
  
  // Function to delete a custom node
  const handleDeleteNode = async (nodeId: string | number) => {
    if (!token) {
      toast.error('You must be logged in to delete nodes')
      return
    }
    
    console.log(`Attempting to delete node with ID: ${nodeId}`)
    setIsDeleting(nodeId.toString())
    
    try {
      const result = await deleteCustomNode(token, nodeId)
      console.log('Delete node response:', result)
      
      // Remove from favorites if it was favorited
      const nodeIdStr = nodeId.toString()
      if (favoriteNodes.has(nodeIdStr)) {
        setFavoriteNodes(prev => {
          const newFavorites = new Set(prev)
          newFavorites.delete(nodeIdStr)
          // Update localStorage
          localStorage.setItem('nodebar-favorites', JSON.stringify(Array.from(newFavorites)))
          return newFavorites
        })
      }
      
      toast.success('Node deleted successfully')
      // Refresh the node list
      loadCustomNodes()
    } catch (error: any) {
      console.error('Failed to delete node:', error)
      // Extract more detailed error message if available
      let errorMessage = 'Failed to delete node'
      if (error?.message) {
        errorMessage = `${errorMessage}: ${error.message}`
      }
      toast.error(errorMessage)
    } finally {
      setIsDeleting(null)
    }
  }
  
  // Function to duplicate a custom node
  const handleDuplicateNode = async (nodeId: string | number) => {
    if (!token) {
      toast.error('You must be logged in to duplicate nodes')
      return
    }
    
    console.log(`Attempting to duplicate node with ID: ${nodeId}`)
    const loadingToast = toast.loading('Duplicating node...')
    
    try {
      const duplicatedNode = await duplicateCustomNode(token, nodeId)
      console.log('Duplicate node response:', duplicatedNode)
      
      toast.dismiss(loadingToast)
      toast.success('Node duplicated successfully')
      
      // Refresh the node list to show the new duplicate
      loadCustomNodes()
    } catch (error: any) {
      console.error('Failed to duplicate node:', error)
      toast.dismiss(loadingToast)
      
      let errorMessage = 'Failed to duplicate node'
      if (error?.message) {
        errorMessage = `${errorMessage}: ${error.message}`
      }
      toast.error(errorMessage)
    }
  }

  // Load custom nodes on component mount and when auth state changes
  useEffect(() => {
    if (isClient && token && isAuthenticated) {
      loadCustomNodes()
      // Load favorites from backend
      loadFavorites()
    }
  }, [token, isAuthenticated, isClient])
  
  // Function to load favorites from backend
  const loadFavorites = async () => {
    if (!token || !isAuthenticated) return
    
    try {
      const favorites = await getFavoriteNodes(token)
      console.log('Loaded favorites from backend:', favorites)
      setFavoriteNodes(new Set(favorites))
    } catch (error) {
      console.error('Failed to load favorites:', error)
      // Fallback to localStorage if backend fails
      const savedFavorites = localStorage.getItem('nodebar-favorites')
      if (savedFavorites) {
        setFavoriteNodes(new Set(JSON.parse(savedFavorites)))
      }
    }
  }
  
  // Clean up favorites - remove IDs that don't match any existing nodes
  // This runs only when customNodes changes, not when favoriteNodes changes
  useEffect(() => {
    if (customNodes.length > 0 && favoriteNodes.size > 0) {
      const validNodeIds = new Set(customNodes.map(node => (node.id || node.node_id).toString()))
      console.log('Valid node IDs:', Array.from(validNodeIds))
      console.log('Current favorites:', Array.from(favoriteNodes))
      
      const invalidFavorites: string[] = []
      
      favoriteNodes.forEach(favId => {
        if (!validNodeIds.has(favId)) {
          console.log(`Favorite ${favId} is not in valid nodes`)
          invalidFavorites.push(favId)
        }
      })
      
      if (invalidFavorites.length > 0) {
        console.log('Cleaning up invalid favorites:', invalidFavorites)
        setFavoriteNodes(prev => {
          const newFavorites = new Set(prev)
          invalidFavorites.forEach(id => newFavorites.delete(id))
          // Update localStorage
          localStorage.setItem('nodebar-favorites', JSON.stringify(Array.from(newFavorites)))
          return newFavorites
        })
      }
    }
  }, [customNodes])
  
  // Toggle favorite status
  const toggleFavorite = async (nodeId: string) => {
    if (!token) {
      toast.error('You must be logged in to favorite nodes')
      return
    }
    
    try {
      const result = await toggleFavoriteNode(token, nodeId)
      console.log('Toggle favorite result:', result)
      
      // Update local state with backend response
      setFavoriteNodes(new Set(result.favorite_nodes))
      
      // Also update localStorage as backup
      localStorage.setItem('nodebar-favorites', JSON.stringify(result.favorite_nodes))
      
      if (result.is_favorited) {
        toast.success('Added to favorites')
      } else {
        toast.success('Removed from favorites')
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      toast.error('Failed to update favorite status')
    }
  }
  
  // Extract all unique tags from nodes
  const allTags = useMemo(() => {
    if (!isMounted) return []
    
    const tags = new Set<string>()
    customNodes.forEach(node => {
      const nodeTags = (node as any).tags
      if (nodeTags && Array.isArray(nodeTags)) {
        nodeTags.forEach((tag: string) => tags.add(tag))
      }
    })
    return Array.from(tags)
  }, [customNodes, isMounted])
  
  // Filter nodes based on search, favorites, and tags
  const filteredNodes = useMemo(() => {
    // Don't filter until mounted to prevent hydration mismatch
    if (!isMounted) {
      return customNodes
    }
    
    let filtered = customNodes
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(node =>
        (node as any).name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((node as any).tags && (node as any).tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    }
    
    // Filter by active tab
    if (activeTab === 'favorites') {
      filtered = filtered.filter(node => favoriteNodes.has(node.id.toString()))
    }
    
    // Filter by selected tags
    if (selectedTags.size > 0) {
      filtered = filtered.filter(node =>
        (node as any).tags && (node as any).tags.some((tag: string) => selectedTags.has(tag))
      )
    }
    
    return filtered
  }, [customNodes, searchQuery, activeTab, favoriteNodes, selectedTags, isMounted])
  
  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newTags = new Set(prev)
      if (newTags.has(tag)) {
        newTags.delete(tag)
      } else {
        newTags.add(tag)
      }
      return newTags
    })
  }

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="h-[calc(100vh-56px)] flex flex-col border-r border-gray-200">
        <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium">Nodebar</h3>
          <button className="p-1 rounded hover:bg-gray-200" disabled>
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col border-r border-gray-200">
      {/* Header with custom node creator */}
      <CustomNode onSaveSuccess={loadCustomNodes} />
      
      {/* Edit dialog - without create button */}
      {editingNode && (
        <CustomNode 
          nodeToEdit={editingNode} 
          isOpen={isEditDialogOpen} 
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              // Reset editing state when dialog closes
              setEditingNode(null);
              // Refresh the node list to show updated data
              loadCustomNodes();
            }
          }}
          onSaveSuccess={loadCustomNodes}
          hideCreateButton={true}
        />
      )}
      
      {/* Nodebar header with refresh button */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">Nodebar</h3>
        <Button 
          variant="ghost"
          size="icon"
          className="h-7 w-7" 
          onClick={loadCustomNodes}
          disabled={isLoading}
          title="Refresh nodes"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Data Type Nodes Section */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="p-2">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">DATA TYPES</h4>
          <div className="grid grid-cols-2 gap-2">
            {/* String Node */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify({
                  type: 'dataType',
                  dataType: 'string',
                  label: 'String'
                }));
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="p-2 bg-green-100 border border-green-300 rounded cursor-move hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">📝</span>
                <span className="text-xs font-medium">String</span>
              </div>
            </div>

            {/* Integer Node */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify({
                  type: 'dataType',
                  dataType: 'int',
                  label: 'Integer'
                }));
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="p-2 bg-blue-100 border border-blue-300 rounded cursor-move hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">🔢</span>
                <span className="text-xs font-medium">Integer</span>
              </div>
            </div>

            {/* Float Node */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify({
                  type: 'dataType',
                  dataType: 'float',
                  label: 'Float'
                }));
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="p-2 bg-cyan-100 border border-cyan-300 rounded cursor-move hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">🔢</span>
                <span className="text-xs font-medium">Float</span>
              </div>
            </div>

            {/* Boolean Node */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify({
                  type: 'dataType',
                  dataType: 'bool',
                  label: 'Boolean'
                }));
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="p-2 bg-purple-100 border border-purple-300 rounded cursor-move hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">✓</span>
                <span className="text-xs font-medium">Boolean</span>
              </div>
            </div>

            {/* List Node */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify({
                  type: 'dataType',
                  dataType: 'list',
                  label: 'List'
                }));
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="p-2 bg-orange-100 border border-orange-300 rounded cursor-move hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">📋</span>
                <span className="text-xs font-medium">List</span>
              </div>
            </div>

            {/* Dictionary Node */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify({
                  type: 'dataType',
                  dataType: 'dict',
                  label: 'Dictionary'
                }));
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="p-2 bg-pink-100 border border-pink-300 rounded cursor-move hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">📚</span>
                <span className="text-xs font-medium">Dict</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Tags Filter - Collapsible */}
      {allTags.length > 0 && (
        <Collapsible open={isTagsOpen} onOpenChange={setIsTagsOpen} className="border-b">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto hover:bg-accent/50"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Filter by tags</span>
                {selectedTags.size > 0 && (
                  <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                    {selectedTags.size}
                  </Badge>
                )}
              </div>
              {isTagsOpen ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-2 overflow-hidden">
            <div className="max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5 py-1">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.has(tag) ? "default" : "outline"}
                    className="cursor-pointer text-[10px] px-2 py-0.5 hover:bg-accent shrink-0"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {/* Nodebar content with tabs */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
        {isAuthenticated && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-3 pt-3">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="all" className="text-xs">
                  All Nodes
                  {customNodes.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {customNodes.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="favorites" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Favorites
                  {favoriteNodes.size > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {favoriteNodes.size}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-0 px-3 pb-3">
              <div className="flex flex-col gap-2 mt-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
                ) : filteredNodes.length > 0 ? (
                  filteredNodes.map((node) => (
                  <ContextMenu key={node.id || node.node_id}>
                    <ContextMenuTrigger>
                      <div
                        className="relative flex items-center gap-2 px-3 py-2.5 border rounded-lg hover:bg-accent/50 group cursor-grab transition-colors"
                        draggable
                        onDragStart={(event) => {
                          // Set the drag data with the custom node information
                          console.log('🎯 Nodebar: Drag start:', node);
                          event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <Code2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5">
                            <span className="text-sm font-medium break-words">{node.title}</span>
                            {(node as any).tags && Array.isArray((node as any).tags) && (node as any).tags.length > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                                {(node as any).tags[0]}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {node.description ? 
                              (node.description.length > 35 ? 
                                `${node.description.substring(0, 35)}...` : 
                                node.description) : 
                              `${node.language} function`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite((node.id || node.node_id).toString())
                          }}
                        >
                          <Star 
                            className={`h-3.5 w-3.5 ${
                              favoriteNodes.has((node.id || node.node_id).toString()) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-muted-foreground'
                            }`} 
                          />
                        </Button>
                        {isDeleting === node.id?.toString() || isDeleting === node.node_id ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                          </div>
                        ) : null}
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => handleEditNode(node)}
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </ContextMenuItem>
                      <ContextMenuItem 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => handleDuplicateNode(node.node_id || node.id)}
                      >
                        <Copy className="w-4 h-4" />
                        <span>Duplicate</span>
                      </ContextMenuItem>
                      <ContextMenuItem 
                        className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500"
                        onClick={() => handleDeleteNode(node.node_id || node.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchQuery || selectedTags.size > 0 
                    ? 'No nodes match your filters' 
                    : 'No custom nodes found. Create one using the button above.'}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="favorites" className="mt-0 px-3 pb-3">
            <div className="flex flex-col gap-2 mt-3">
              {filteredNodes.length > 0 ? (
                filteredNodes.map((node) => (
                  <ContextMenu key={node.id || node.node_id}>
                    <ContextMenuTrigger>
                      <div
                        className="relative flex items-center gap-2 px-3 py-2.5 border rounded-lg hover:bg-accent/50 group cursor-grab transition-colors"
                        draggable
                        onDragStart={(event) => {
                          console.log('🎯 Nodebar: Drag start:', node);
                          event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <Code2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5">
                            <span className="text-sm font-medium break-words">{node.title}</span>
                            {(node as any).tags && Array.isArray((node as any).tags) && (node as any).tags.length > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                                {(node as any).tags[0]}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {node.description ? 
                              (node.description.length > 35 ? 
                                `${node.description.substring(0, 35)}...` : 
                                node.description) : 
                              `${node.language} function`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite((node.id || node.node_id).toString())
                          }}
                        >
                          <Star 
                            className={`h-3.5 w-3.5 ${
                              favoriteNodes.has((node.id || node.node_id).toString()) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-muted-foreground'
                            }`} 
                          />
                        </Button>
                        {isDeleting === node.id?.toString() || isDeleting === node.node_id ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                          </div>
                        ) : null}
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => handleEditNode(node)}
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </ContextMenuItem>
                      <ContextMenuItem 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => handleDuplicateNode(node.node_id || node.id)}
                      >
                        <Copy className="w-4 h-4" />
                        <span>Duplicate</span>
                      </ContextMenuItem>
                      <ContextMenuItem 
                        className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500"
                        onClick={() => handleDeleteNode(node.node_id || node.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>No favorite nodes yet</p>
                  <p className="text-xs mt-1">Star nodes to add them here</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        )}
        
        {!isAuthenticated && (
          <div className="text-center py-8 px-4 text-muted-foreground text-sm">
            <p>Please log in to view your custom nodes.</p>
          </div>
        )}
        </ScrollArea>
      </div>
    </div>
  )
}

export default Nodebar
