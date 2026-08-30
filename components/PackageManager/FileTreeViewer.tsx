"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronRight, ChevronDown, File, Copy, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types — shared between local and hub services
// ---------------------------------------------------------------------------
export interface GitTreeEntry {
  path: string
  size: number
  is_binary: boolean
}

export interface GitFileContent {
  path: string
  content: string
  is_binary: boolean
}

interface FileTreeViewerProps {
  onFetchTree: (ref?: string) => Promise<GitTreeEntry[]>
  onFetchFile: (path: string, ref?: string) => Promise<GitFileContent>
  ref?: string
}

// ---------------------------------------------------------------------------
// Tree node
// ---------------------------------------------------------------------------
interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: TreeNode[]
  size?: number
  isBinary?: boolean
}

function buildTree(entries: GitTreeEntry[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isDir: true, children: [] }
  for (const entry of entries) {
    const parts = entry.path.split('/')
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const fullPath = parts.slice(0, i + 1).join('/')
      let child = current.children.find(c => c.name === part)
      if (!child) {
        child = {
          name: part,
          path: fullPath,
          isDir: !isLast,
          children: [],
          size: isLast ? entry.size : undefined,
          isBinary: isLast ? entry.is_binary : undefined,
        }
        current.children.push(child)
      }
      current = child
    }
  }
  function sortNode(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(sortNode)
  }
  sortNode(root)
  return root
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---------------------------------------------------------------------------
// Recursive tree row — uses shadcn Collapsible
// ---------------------------------------------------------------------------
function TreeRow({
  node,
  depth,
  expandedPaths,
  onToggle,
  selectedPath,
  onSelect,
}: {
  node: TreeNode
  depth: number
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  selectedPath: string | null
  onSelect: (node: TreeNode) => void
}) {
  const isOpen = expandedPaths.has(node.path)
  const indent = depth * 16

  if (node.isDir) {
    return (
      <Collapsible open={isOpen} onOpenChange={() => onToggle(node.path)}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            style={{ paddingLeft: `${indent + 8}px` }}
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate font-medium">{node.name}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {node.children.map(child => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <button
      className={cn(
        "flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-xs transition-colors",
        selectedPath === node.path
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
      style={{ paddingLeft: `${indent + 24}px` }}
      onClick={() => onSelect(node)}
    >
      <File className="h-3.5 w-3.5 shrink-0 opacity-50" />
      <span className="truncate flex-1 text-left">{node.name}</span>
      {node.size !== undefined && (
        <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
          {formatSize(node.size)}
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function FileTreeViewer({ onFetchTree, onFetchFile, ref }: FileTreeViewerProps) {
  const [tree, setTree] = useState<GitTreeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<GitFileContent | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)

  const loadTree = useCallback(async () => {
    setIsLoading(true)
    try {
      const entries = await onFetchTree(ref)
      setTree(entries)
      const topDirs = new Set<string>()
      for (const e of entries) {
        const top = e.path.split('/')[0]
        if (e.path.includes('/') && top) topDirs.add(top)
      }
      setExpandedPaths(topDirs)
    } catch (err: any) {
      toast.error(`Failed to load file tree: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [onFetchTree, ref])

  useEffect(() => { loadTree() }, [loadTree])

  const handleToggle = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleSelect = async (node: TreeNode) => {
    setSelectedPath(node.path)
    setIsLoadingFile(true)
    setFileContent(null)
    try {
      const content = await onFetchFile(node.path, ref)
      setFileContent(content)
    } catch (err: any) {
      toast.error(`Failed to load file: ${err.message}`)
    } finally {
      setIsLoadingFile(false)
    }
  }

  const rootTree = useMemo(() => buildTree(tree), [tree])

  const handleCopy = () => {
    if (fileContent && !fileContent.is_binary) {
      navigator.clipboard.writeText(fileContent.content)
      toast.success('Copied to clipboard')
    }
  }

  return (
    <div className="flex h-full min-h-0 rounded-md border">
      {/* Tree sidebar */}
      <div className="w-56 shrink-0 border-r bg-muted/30">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Repository Files</p>
        </div>
        <ScrollArea className="h-[calc(100%-2.5rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : tree.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No files in repo.</p>
          ) : (
            <div className="py-1">
              {rootTree.children.map(child => (
                <TreeRow
                  key={child.path}
                  node={child}
                  depth={0}
                  expandedPaths={expandedPaths}
                  onToggle={handleToggle}
                  selectedPath={selectedPath}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* File content viewer */}
      <div className="flex min-w-0 flex-1 flex-col">
        {isLoadingFile ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : fileContent ? (
          <>
            {/* File header bar */}
            <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
              <span className="truncate font-mono text-xs text-muted-foreground">
                {fileContent.path}
              </span>
              {!fileContent.is_binary && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={handleCopy}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              )}
            </div>
            {/* File body */}
            {fileContent.is_binary ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Binary file</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    {formatSize(fileContent.content.length)}
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="min-h-0 flex-1">
                <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-foreground">
                  {fileContent.content || '(empty file)'}
                </pre>
              </ScrollArea>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Select a file to view its content</p>
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                {tree.length} files in the repository
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
