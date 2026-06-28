"use client"

import React from 'react'
import { Code2, Trash2, Edit, Copy, Star, RefreshCcw } from 'lucide-react'
import { CustomNode as CustomNodeType } from '@/lib/services/custom-node-service'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface NodeCardProps {
  node: CustomNodeType
  isFavorite: boolean
  isDeleting: boolean | string | null
  onToggleFavorite: (nodeId: string) => void
  onEdit: (node: CustomNodeType) => void
  onDuplicate: (nodeId: string | number) => void
  onDelete: (nodeId: string | number) => void
}

function getLanguageStyle(language: string): { iconColor: string; borderColor: string; badgeClass: string; stripeColor: string } {
  const lang = (language || 'python').toLowerCase()
  switch (lang) {
    case 'python':
      return {
        iconColor: 'text-blue-600',
        borderColor: 'border-l-2 border-l-blue-500/60',
        badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
        stripeColor: 'rgba(59, 130, 246, 0.06)',
      }
    case 'r':
      return {
        iconColor: 'text-green-600',
        borderColor: 'border-l-2 border-l-green-500/60',
        badgeClass: 'bg-green-500/10 text-green-700 border-green-500/20',
        stripeColor: 'rgba(34, 197, 94, 0.06)',
      }
    case 'bash':
    case 'shell':
      return {
        iconColor: 'text-orange-600',
        borderColor: 'border-l-2 border-l-orange-500/60',
        badgeClass: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
        stripeColor: 'rgba(249, 115, 22, 0.06)',
      }
    default:
      return {
        iconColor: 'text-gray-600',
        borderColor: 'border-l-2 border-l-gray-500/60',
        badgeClass: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
        stripeColor: 'rgba(107, 114, 128, 0.06)',
      }
  }
}

function NodeCard({
  node,
  isFavorite,
  isDeleting,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
}: NodeCardProps) {
  const nodeId = node.id || node.node_id
  const nodeTags = (node as any).tags
  const isBeingDeleted = isDeleting === node.id?.toString() || isDeleting === node.node_id
  const langStyle = getLanguageStyle(node.language)

  return (
    <ContextMenu key={nodeId}>
      <ContextMenuTrigger>
        <div
          className={`relative flex items-center gap-2 px-3 py-2.5 border rounded-lg hover:bg-accent/50 group cursor-grab transition-all ${langStyle.borderColor}`}
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 6px, ${langStyle.stripeColor} 6px, ${langStyle.stripeColor} 12px)`,
          }}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
            event.dataTransfer.effectAllowed = 'move';
          }}
        >
          <Code2 className={`h-4 w-4 shrink-0 ${langStyle.iconColor}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5">
              <span className="text-xs font-medium break-words">{node.title}</span>
              {nodeTags && Array.isArray(nodeTags) && nodeTags.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                  {nodeTags[0]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`text-[9px] h-3.5 px-1 shrink-0 ${langStyle.badgeClass}`}>
                {node.language || 'python'}
              </Badge>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {node.description ?
                  (node.description.length > 35 ?
                    `${node.description.substring(0, 35)}...` :
                    node.description) :
                  'No description'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(nodeId.toString())
            }}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                isFavorite
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </Button>
          {isBeingDeleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
              <RefreshCcw className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onEdit(node)}
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </ContextMenuItem>
        <ContextMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onDuplicate(node.node_id || node.id)}
        >
          <Copy className="w-4 h-4" />
          <span>Duplicate</span>
        </ContextMenuItem>
        <ContextMenuItem
          className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500"
          onClick={() => onDelete(node.node_id || node.id)}
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default NodeCard
