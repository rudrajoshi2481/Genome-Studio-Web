"use client"

import React, { useState, useEffect } from 'react'
import { Puzzle, Search, RefreshCw, Download, Star, ExternalLink, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ExtensionItem {
  id: string
  name: string
  description: string
  version: string
  versions: string[]
  author: string
  category: string
  installed: boolean
  enabled: boolean
  rating: number
  downloads: number
}

const MOCK_EXTENSIONS: ExtensionItem[] = [
  {
    id: '1',
    name: 'Genome Browser',
    description: 'Interactive genome visualization tool with track-based rendering.',
    version: '1.2.0',
    versions: ['1.2.0', '1.1.0', '1.0.0', '0.9.0'],
    author: 'Genome Studio',
    category: 'Visualization',
    installed: true,
    enabled: true,
    rating: 4.8,
    downloads: 15420,
  },
  {
    id: '2',
    name: 'Variant Annotation',
    description: 'Annotate genetic variants with functional consequences and population frequencies.',
    version: '0.9.3',
    versions: ['0.9.3', '0.9.2', '0.9.0', '0.8.0'],
    author: 'BioTools Inc',
    category: 'Analysis',
    installed: true,
    enabled: false,
    rating: 4.5,
    downloads: 8730,
  },
  {
    id: '3',
    name: 'Phylogenetic Tree',
    description: 'Build and visualize phylogenetic trees from sequence alignments.',
    version: '2.1.1',
    versions: ['2.1.1', '2.1.0', '2.0.0', '1.9.5'],
    author: 'EvoLab',
    category: 'Visualization',
    installed: false,
    enabled: false,
    rating: 4.7,
    downloads: 12100,
  },
  {
    id: '4',
    name: 'Batch QC Reports',
    description: 'Generate quality control reports for sequencing batches automatically.',
    version: '1.0.0',
    versions: ['1.0.0', '0.9.5', '0.9.0'],
    author: 'QC Team',
    category: 'Quality Control',
    installed: false,
    enabled: false,
    rating: 4.3,
    downloads: 5400,
  },
  {
    id: '5',
    name: 'CRISPR Design',
    description: 'Design guide RNAs for CRISPR-Cas9 experiments with off-target analysis.',
    version: '3.0.2',
    versions: ['3.0.2', '3.0.1', '3.0.0', '2.9.0', '2.8.0'],
    author: 'GeneEdit',
    category: 'Analysis',
    installed: false,
    enabled: false,
    rating: 4.9,
    downloads: 22300,
  },
  {
    id: '6',
    name: 'Expression Heatmap',
    description: 'Create interactive heatmaps from gene expression matrices.',
    version: '1.4.5',
    versions: ['1.4.5', '1.4.0', '1.3.0', '1.2.0'],
    author: 'Genome Studio',
    category: 'Visualization',
    installed: false,
    enabled: false,
    rating: 4.6,
    downloads: 9800,
  },
]

const CATEGORIES = ['All', 'Visualization', 'Analysis', 'Quality Control']

function Extensions() {
  const [extensions, setExtensions] = useState<ExtensionItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({})

  useEffect(() => {
    setIsClient(true)
    loadExtensions()
  }, [])

  const loadExtensions = () => {
    setIsLoading(true)
    setTimeout(() => {
      setExtensions(MOCK_EXTENSIONS)
      setIsLoading(false)
    }, 300)
  }

  const handleInstall = (id: string) => {
    const ext = extensions.find(e => e.id === id)
    if (!ext) return
    const version = selectedVersions[id] || ext.version
    setExtensions(prev =>
      prev.map(e =>
        e.id === id ? { ...e, installed: true, enabled: true, version } : e
      )
    )
    toast.success(`Installed "${ext.name}" v${version}`)
  }

  const handleUninstall = (id: string) => {
    const ext = extensions.find(e => e.id === id)
    if (!ext) return
    setExtensions(prev =>
      prev.map(e =>
        e.id === id ? { ...e, installed: false, enabled: false } : e
      )
    )
    toast.success(`Uninstalled "${ext.name}"`)
  }

  const handleToggle = (id: string) => {
    const ext = extensions.find(e => e.id === id)
    if (!ext) return
    setExtensions(prev =>
      prev.map(e =>
        e.id === id ? { ...e, enabled: !e.enabled } : e
      )
    )
    toast.success(ext.enabled ? `Disabled "${ext.name}"` : `Enabled "${ext.name}"`)
  }

  const filteredExtensions = extensions.filter(ext => {
    const matchesSearch =
      ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      activeCategory === 'All' || ext.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const installedCount = extensions.filter(e => e.installed).length

  if (!isClient) {
    return (
      <div className="h-full flex items-center justify-center">
        <Puzzle className="h-6 w-6 text-muted-foreground animate-pulse" />
      </div>
    )
  }

  return (
    <TooltipProvider>
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-xs font-medium">Extensions</h1>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{installedCount} installed</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={loadExtensions}
                >
                  <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b">
        <div className="flex items-center gap-1 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs whitespace-nowrap"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Extensions List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredExtensions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Puzzle className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs">No extensions found</p>
              </div>
            ) : (
              filteredExtensions.map(ext => (
                <div
                  key={ext.id}
                  className="rounded-lg border p-2.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{ext.name}</span>
                        {ext.installed && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            {ext.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {ext.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        <span>v{ext.version}</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span>{ext.author}</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span className="flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          {ext.rating}
                        </span>
                        <Separator orientation="vertical" className="h-3" />
                        <span className="flex items-center gap-0.5">
                          <Download className="h-2.5 w-2.5" />
                          {(ext.downloads / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href="https://genome-studio.rudhrajoshi.me/genomic-hub"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md h-6 w-6 hover:bg-accent transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Show in Genomic Hub</TooltipContent>
                    </Tooltip>
                  </div>
                  {!ext.installed && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-6 text-xs"
                        onClick={() => handleInstall(ext.id)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Install
                      </Button>
                      <Select
                        value={selectedVersions[ext.id] || ext.version}
                        onValueChange={(value) =>
                          setSelectedVersions(prev => ({ ...prev, [ext.id]: value }))
                        }
                      >
                        <SelectTrigger className="!h-6 w-[70px] text-xs !px-1.5 !py-0 gap-1 [&_svg]:size-3 data-[size=default]:!h-6">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ext.versions.map(v => (
                            <SelectItem key={v} value={v} className="text-xs">
                              v{v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
    </TooltipProvider>
  )
}

export default Extensions
