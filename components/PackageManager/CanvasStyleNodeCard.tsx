"use client"

import React from 'react'
import { ChevronDown } from 'lucide-react'
import { getHandleTypeInfo, HandleType } from '@/components/Editorwindow_new/editors/canvas/handleTypes'
import { PackageNode } from '@/lib/services/package-manager-service'
import { cn } from '@/lib/utils'

interface CanvasStyleNodeCardProps {
  node: PackageNode
  className?: string
}

/**
 * Static replica of the canvas CustomNode visual style.
 * Shows the striped language header, input/output ports with colored handle dots,
 * type badges, and function name — exactly like a node on the canvas.
 */
export default function CanvasStyleNodeCard({ node, className }: CanvasStyleNodeCardProps) {
  const lang = (node.language || 'python').toLowerCase()

  // Language-based stripe + badge styles (same logic as canvas CustomNode)
  const langBgClass =
    lang === 'python' ? 'bg-blue-500/10' :
    lang === 'r' ? 'bg-green-500/10' :
    (lang === 'bash' || lang === 'shell') ? 'bg-orange-500/10' :
    'bg-muted'

  const stripeColor =
    lang === 'python' ? 'rgba(59, 130, 246, 0.12)' :
    lang === 'r' ? 'rgba(34, 197, 94, 0.12)' :
    (lang === 'bash' || lang === 'shell') ? 'rgba(249, 115, 22, 0.12)' :
    'rgba(107, 114, 128, 0.08)'

  const langBadgeClass =
    lang === 'python' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
    lang === 'r' ? 'bg-green-500/10 text-green-700 border-green-500/20' :
    (lang === 'bash' || lang === 'shell') ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' :
    'bg-background text-muted-foreground'

  const renderHandleDot = (type: string) => {
    const info = getHandleTypeInfo(type || 'any')
    return (
      <div
        className="rounded-full flex-shrink-0"
        style={{
          background: info.handleColor,
          width: 10,
          height: 10,
          border: '2px solid hsl(var(--background))',
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1)',
        }}
      />
    )
  }

  const renderTypeBadge = (type: string) => {
    const info = getHandleTypeInfo(type || 'any')
    return (
      <span
        className={cn(
          'text-[9px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0',
          info.badgeClass,
        )}
      >
        {info.label}
      </span>
    )
  }

  const maxPorts = Math.max(node.inputs.length, node.outputs.length)

  return (
    <div
      className={cn(
        'shadow-md rounded-md overflow-visible bg-background border border-border relative',
        className,
      )}
      style={{ width: 240 }}
    >
      {/* ── Header with striped background ── */}
      <div
        className={cn(
          'border-b border-border px-3 py-2 flex items-center justify-between relative overflow-hidden',
          langBgClass,
        )}
        style={{
          backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 6px, ${stripeColor} 6px, ${stripeColor} 12px)`,
          backgroundSize: '200% 100%',
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 relative z-10">
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="font-medium text-sm truncate text-foreground">
            {node.title || 'Untitled Node'}
          </div>
        </div>
        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <div className={cn('text-xs px-2 py-0.5 rounded-full border', langBadgeClass)}>
            {node.language || 'python'}
          </div>
        </div>
      </div>

      {/* ── Content: description + function name ── */}
      <div className="p-3">
        {node.description && (
          <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {node.description}
          </div>
        )}
        {node.tags.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {node.tags.map(t => (
              <span key={t} className="text-[9px] text-muted-foreground/70 bg-muted/50 px-1 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
        {/* Function name badge */}
        <div className="flex justify-end">
          <div className="px-2 py-0.5 bg-muted rounded-sm border border-border text-xs text-muted-foreground font-mono">
            {node.function_name || 'function'}
          </div>
        </div>
      </div>

      {/* ── Ports section ── */}
      <div className="border-t border-border">
        {/* Input ports */}
        {node.inputs.length > 0 && (
          <div className="py-1">
            {node.inputs.map((input, idx) => (
              <div key={`input-${input.id || idx}`} className="relative h-8 flex items-center px-3">
                {/* Handle dot on left edge */}
                <div
                  className="flex-shrink-0"
                  style={{ position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)', zIndex: 100 }}
                >
                  {renderHandleDot(input.type)}
                </div>
                {/* Label */}
                <div className="text-xs font-medium text-foreground ml-2 flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="shrink-0">{input.name}</span>
                  {renderTypeBadge(input.type)}
                  {input.description && (
                    <span className="text-[10px] text-muted-foreground truncate flex-1 min-w-0" title={input.description}>
                      {input.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Output ports */}
        {node.outputs.length > 0 && (
          <div className={cn('py-1', node.inputs.length > 0 && 'border-t border-border')}>
            {node.outputs.map((output, idx) => (
              <div key={`output-${output.id || idx}`} className="relative h-8 flex items-center justify-end px-3">
                {/* Label */}
                <div className="text-xs font-medium text-foreground mr-2 text-right flex items-center gap-1.5 flex-1 min-w-0">
                  {output.description && (
                    <span className="text-[10px] text-muted-foreground truncate flex-1 min-w-0" title={output.description}>
                      {output.description}
                    </span>
                  )}
                  <span className="shrink-0">{output.name}</span>
                  {renderTypeBadge(output.type)}
                </div>
                {/* Handle dot on right edge */}
                <div
                  className="flex-shrink-0"
                  style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', zIndex: 100 }}
                >
                  {renderHandleDot(output.type)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {node.inputs.length === 0 && node.outputs.length === 0 && (
          <div className="py-3 text-center text-[10px] text-muted-foreground">
            No ports
          </div>
        )}
      </div>
    </div>
  )
}
