"use client"

import React, { useEffect, useState } from 'react'
import { FlipVertical2, RefreshCcw, Code2, Trash2, Edit, Copy } from 'lucide-react'
import CustomNode from './CustomNode/CustomNode'
import { useAuthStore } from '@/lib/stores/auth-store'
import { fetchCustomNodes, deleteCustomNode, CustomNode as CustomNodeType } from '@/lib/services/custom-node-service'
import { toast } from 'sonner'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"


function Nodebar() {
  const [customNodes, setCustomNodes] = useState<CustomNodeType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  // State for editing nodes
  const [editingNode, setEditingNode] = useState<CustomNodeType | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { token, isAuthenticated } = useAuthStore()

  // Ensure component only renders on client after hydration
  useEffect(() => {
    setIsClient(true)
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

  // Load custom nodes on component mount and when auth state changes
  useEffect(() => {
    if (isClient) {
      loadCustomNodes()
    }
  }, [token, isAuthenticated, isClient])

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
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium">Nodebar</h3>
        <button 
          className="p-1 rounded hover:bg-gray-200" 
          onClick={loadCustomNodes}
          disabled={isLoading}
          title="Refresh nodes"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
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
      
      {/* Nodebar content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Custom nodes section */}
        {isAuthenticated && (
          <>
            <h1 className="text-sm font-medium mb-2 mt-4">My Custom Nodes</h1>
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
              ) : customNodes.length > 0 ? (
                customNodes.map((node) => (
                  <ContextMenu key={node.id || node.node_id}>
                    <ContextMenuTrigger>
                      <div
                        className="flex items-center justify-between gap-2 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 group cursor-grab"
                        draggable
                        onDragStart={(event) => {
                          // Set the drag data with the custom node information
                          console.log('🎯 Nodebar: Drag start:', node);
                          event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4" />
                          <div className="flex flex-col items-start ml-2">
                            <span className="text-sm">{node.title}</span>
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {node.description ? 
                                (node.description.length > 30 ? 
                                  `${node.description.substring(0, 30)}...` : 
                                  node.description) : 
                                `${node.language} function`}
                            </p>
                          </div>
                        </div>
                        {isDeleting === node.id?.toString() || isDeleting === node.node_id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
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
                        onClick={() => toast.info('Copy functionality coming soon')}
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
                <div className="text-center py-4 text-gray-500 text-sm">
                  No custom nodes found. Create one using the button above.
                </div>
              )}
            </div>
          </>
        )}
        
        {!isAuthenticated && (
          <div className="text-center py-4 text-gray-500 text-sm">
            Please log in to view your custom nodes.
          </div>
        )}
      </div>
    </div>
  )
}

export default Nodebar
