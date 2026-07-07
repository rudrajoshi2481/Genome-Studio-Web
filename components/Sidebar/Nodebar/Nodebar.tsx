"use client"

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { RefreshCcw, Search, Star, X, Filter, ChevronDown, ChevronUp, ArrowDownUp, Plus, Settings, Type, Hash, ToggleLeft, List as ListIcon, Braces, Workflow } from 'lucide-react'
import CustomNode from './CustomNode/CustomNode'
import CustomizeDialog from './CustomNode/CustomizeDialog'
import NodeCard from './NodeCard'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { fetchCustomNodes, deleteCustomNode, duplicateCustomNode, toggleFavoriteNode, getFavoriteNodes, CustomNode as CustomNodeType } from '@/lib/services/custom-node-service'
import { toast } from 'sonner'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
type SortOption = 'name' | 'date' | 'favorites'

const NODES_PER_PAGE = 30


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
  const debouncedSearchQuery = useDebounce(searchQuery, 200)
  const [favoriteNodes, setFavoriteNodes] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('all')
  const [isTagsOpen, setIsTagsOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [visibleCount, setVisibleCount] = useState(NODES_PER_PAGE)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDataTypesOpen, setIsDataTypesOpen] = useState(true)

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
      // toast.error('Failed to load custom nodes')
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
      // toast.error('You must be logged in to delete nodes')
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
      
      // toast.success('Node deleted successfully')
      // Refresh the node list
      loadCustomNodes()
    } catch (error: any) {
      console.error('Failed to delete node:', error)
      // Extract more detailed error message if available
      let errorMessage = 'Failed to delete node'
      if (error?.message) {
        errorMessage = `${errorMessage}: ${error.message}`
      }
      // toast.error(errorMessage)
    } finally {
      setIsDeleting(null)
    }
  }
  
  // Function to duplicate a custom node
  const handleDuplicateNode = async (nodeId: string | number) => {
    if (!token) {
      // toast.error('You must be logged in to duplicate nodes')
      return
    }
    
    console.log(`Attempting to duplicate node with ID: ${nodeId}`)
    // const loadingToast = toast.loading('Duplicating node...')
    
    try {
      const duplicatedNode = await duplicateCustomNode(token, nodeId)
      console.log('Duplicate node response:', duplicatedNode)
      
      toast.dismiss(loadingToast)
      // toast.success('Node duplicated successfully')
      
      // Refresh the node list to show the new duplicate
      loadCustomNodes()
    } catch (error: any) {
      console.error('Failed to duplicate node:', error)
      toast.dismiss(loadingToast)
      
      let errorMessage = 'Failed to duplicate node'
      if (error?.message) {
        errorMessage = `${errorMessage}: ${error.message}`
      }
      // toast.error(errorMessage)
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

  // Listen for extension-installed events to refresh nodes
  useEffect(() => {
    if (!isClient) return
    const handleExtensionInstalled = () => {
      console.log('[Nodebar] extension-installed event received, refreshing nodes...')
      loadCustomNodes()
    }
    window.addEventListener('extension-installed', handleExtensionInstalled)
    return () => window.removeEventListener('extension-installed', handleExtensionInstalled)
  }, [isClient, token, isAuthenticated])
  
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
      // toast.error('You must be logged in to favorite nodes')
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
        // toast.success('Added to favorites')
      } else {
        // toast.success('Removed from favorites')
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      // toast.error('Failed to update favorite status')
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
    
    // Filter by search query (debounced)
    if (debouncedSearchQuery) {
      filtered = filtered.filter(node =>
        (node as any).name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        node.title?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        node.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        ((node as any).tags && (node as any).tags.some((tag: string) => tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase())))
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
    
    // Sort filtered nodes
    const sorted = [...filtered]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        break
      case 'date':
        sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateB - dateA
        })
        break
      case 'favorites':
        sorted.sort((a, b) => {
          const aFav = favoriteNodes.has(a.id.toString()) ? 0 : 1
          const bFav = favoriteNodes.has(b.id.toString()) ? 0 : 1
          if (aFav !== bFav) return aFav - bFav
          return (a.title || '').localeCompare(b.title || '')
        })
        break
    }
    
    return sorted
  }, [customNodes, debouncedSearchQuery, activeTab, favoriteNodes, selectedTags, isMounted, sortBy])
  
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

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(NODES_PER_PAGE)
  }, [debouncedSearchQuery, activeTab, selectedTags, sortBy])

  // Paginated nodes for flat (non-grouped) view
  const visibleNodes = useMemo(() => {
    return filteredNodes.slice(0, visibleCount)
  }, [filteredNodes, visibleCount])

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="h-[calc(100vh-56px)] flex flex-col border-r border-gray-200">
        <div className="flex-shrink-0 border-b px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-medium">Nodebar</h3>
            </div>
            <button className="p-1 rounded hover:bg-gray-200" disabled>
              <RefreshCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-center py-4 text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col border-r border-gray-200">
      {/* Create dialog - controlled from header button */}
      <CustomNode 
        onSaveSuccess={loadCustomNodes} 
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        hideCreateButton={true}
      />
      
      {/* Edit dialog - without create button */}
      {editingNode && (
        <CustomNode 
          nodeToEdit={editingNode} 
          isOpen={isEditDialogOpen} 
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              // Delay unmounting CustomNode so Radix can finish its closing animation
              // and properly clean up focus trap / pointer-events
              setTimeout(() => {
                setEditingNode(null);
              }, 300);
              // Refresh the node list to show updated data
              loadCustomNodes();
            }
          }}
          onSaveSuccess={loadCustomNodes}
          hideCreateButton={true}
        />
      )}
      
      {/* Nodebar header with create, customize, and refresh buttons */}
      <div className="flex-shrink-0 border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-medium">Nodebar</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="default"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={() => setIsCreateDialogOpen(true)}
              title="Create Custom Node"
            >
              <Plus className="h-3 w-3" />
              Create
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Customize"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <CustomizeDialog />
            </Dialog>
            <Button 
              variant="ghost"
              size="icon"
              className="h-6 w-6" 
              onClick={loadCustomNodes}
              disabled={isLoading}
              title="Refresh nodes"
            >
              <RefreshCcw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar + Sort */}
      <div className="px-3 py-2 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger size="sm" className="h-7 text-xs flex-1">
              <ArrowDownUp className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="favorites">Sort by Favorites</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Data Type Nodes Section - Always Open */}
      <Collapsible open={isDataTypesOpen} onOpenChange={setIsDataTypesOpen} className="border-b border-gray-200 bg-gray-50">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-3 py-2 h-auto hover:bg-accent/50 rounded-none"
          >
            <h4 className="text-xs font-semibold text-gray-600">DATA TYPES</h4>
            {isDataTypesOpen ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-2 pt-0">
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
                className="p-2 border rounded cursor-move hover:shadow-md transition-all bg-green-500/10 border-green-500/20 hover:border-green-500/40"
                style={{
                  backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(34, 197, 94, 0.08) 6px, rgba(34, 197, 94, 0.08) 12px)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-green-700 shrink-0" />
                  <span className="text-xs font-medium text-green-700">String</span>
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
                className="p-2 border rounded cursor-move hover:shadow-md transition-all bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40"
                style={{
                  backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(59, 130, 246, 0.08) 6px, rgba(59, 130, 246, 0.08) 12px)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                  <span className="text-xs font-medium text-blue-700">Integer</span>
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
                className="p-2 border rounded cursor-move hover:shadow-md transition-all bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40"
                style={{
                  backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(6, 182, 212, 0.08) 6px, rgba(6, 182, 212, 0.08) 12px)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-cyan-700 shrink-0" />
                  <span className="text-xs font-medium text-cyan-700">Float</span>
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
                className="p-2 border rounded cursor-move hover:shadow-md transition-all bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40"
                style={{
                  backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(168, 85, 247, 0.08) 6px, rgba(168, 85, 247, 0.08) 12px)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <ToggleLeft className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                  <span className="text-xs font-medium text-purple-700">Boolean</span>
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
                className="p-2 border rounded cursor-move hover:shadow-md transition-all bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40"
                style={{
                  backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(249, 115, 22, 0.08) 6px, rgba(249, 115, 22, 0.08) 12px)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <ListIcon className="h-3.5 w-3.5 text-orange-700 shrink-0" />
                  <span className="text-xs font-medium text-orange-700">List</span>
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
                className="p-2 border rounded cursor-move hover:shadow-md transition-all bg-pink-500/10 border-pink-500/20 hover:border-pink-500/40"
                style={{
                  backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(236, 72, 153, 0.08) 6px, rgba(236, 72, 153, 0.08) 12px)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Braces className="h-3.5 w-3.5 text-pink-700 shrink-0" />
                  <span className="text-xs font-medium text-pink-700">Dict</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

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
                  <div className="text-center py-8 text-muted-foreground text-xs">Loading...</div>
                ) : filteredNodes.length > 0 ? (
                  <>
                    {/* Result count */}
                    <div className="text-[10px] text-muted-foreground px-1 pb-1">
                      Showing {visibleNodes.length} of {filteredNodes.length} node{filteredNodes.length !== 1 ? 's' : ''}
                    </div>
                    {visibleNodes.map((node) => (
                      <NodeCard
                        key={node.id || node.node_id}
                        node={node}
                        isFavorite={favoriteNodes.has((node.id || node.node_id).toString())}
                        isDeleting={isDeleting}
                        onToggleFavorite={toggleFavorite}
                        onEdit={handleEditNode}
                        onDuplicate={handleDuplicateNode}
                        onDelete={handleDeleteNode}
                      />
                    ))}
                    {visibleCount < filteredNodes.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setVisibleCount(prev => prev + NODES_PER_PAGE)}
                      >
                        Show more ({filteredNodes.length - visibleCount} remaining)
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    {debouncedSearchQuery || selectedTags.size > 0 
                      ? 'No nodes match your filters' 
                      : 'No custom nodes found. Create one using the button above.'}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="favorites" className="mt-0 px-3 pb-3">
              <div className="flex flex-col gap-2 mt-3">
                {filteredNodes.length > 0 ? (
                  <>
                    <div className="text-[10px] text-muted-foreground px-1 pb-1">
                      Showing {Math.min(visibleCount, filteredNodes.length)} of {filteredNodes.length} favorite node{filteredNodes.length !== 1 ? 's' : ''}
                    </div>
                    {visibleNodes.map((node) => (
                      <NodeCard
                        key={node.id || node.node_id}
                        node={node}
                        isFavorite={favoriteNodes.has((node.id || node.node_id).toString())}
                        isDeleting={isDeleting}
                        onToggleFavorite={toggleFavorite}
                        onEdit={handleEditNode}
                        onDuplicate={handleDuplicateNode}
                        onDelete={handleDeleteNode}
                      />
                    ))}
                    {visibleCount < filteredNodes.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setVisibleCount(prev => prev + NODES_PER_PAGE)}
                      >
                        Show more ({filteredNodes.length - visibleCount} remaining)
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs">
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
          <div className="text-center py-8 px-4 text-muted-foreground text-xs">
            <p>Please log in to view your custom nodes.</p>
          </div>
        )}
        </ScrollArea>
      </div>
    </div>
  )
}

export default Nodebar
