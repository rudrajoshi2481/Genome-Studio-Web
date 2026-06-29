import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp, Settings, SquareIcon, Pin, PinOff, Paperclip, X, AtSign, Slash, Terminal, RefreshCw, Cpu, Check } from 'lucide-react'
import ChatFeaturesDialog from './ChatFeaturesDialog'
import { useChatStore } from './components/chatStore'
import {
  PromptInput,
  PromptInputFooter,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
} from '@/components/ai-elements/model-selector'
import { Spinner } from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getApiBaseUrl } from '@/config/server'
import ChatMentionInput, { type ChatMention } from './components/ChatMentionInput'
import { SlashCommandSuggestion, type SlashCommand } from './components/SlashCommandSuggestion'
import { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

interface OllamaModel {
  name: string
  size?: number
  digest?: string
  modified_at?: string
  context_length?: number
  capabilities?: {
    context_length?: number
    supports_tools?: boolean
    supports_vision?: boolean
    supports_reasoning?: boolean
    parameter_size?: string
    quantization?: string
    family?: string
  }
}

interface OllamaModelsResponse {
  available: boolean
  models: OllamaModel[]
}

interface FooterProps {
  onSendMessage?: (message: string, model?: string) => void;
  onStop?: () => void;
  onSendCommand?: (command: string, commandArgs?: string[], model?: string) => void;
}

const PINNED_MODELS_KEY = 'pinned-models'
const SELECTED_MODEL_KEY = 'selected-model'

function Footer({ onSendMessage, onStop, onSendCommand }: FooterProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('qwen3.5:latest')
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [pinnedModels, setPinnedModels] = useState<string[]>([])
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [mentions, setMentions] = useState<ChatMention[]>([])
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 })
  const editorRef = useRef<Editor | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const justInsertedCommand = useRef(false)

  const {
    isLoading: storeLoading,
    tokenUsage,
    contextWindow,
    contextTokens,
    setContextWindow,
    addQueuedMessage,
    uploadedFiles,
    addUploadedFile,
    removeUploadedFile,
    clearUploadedFiles,
    clearMentions,
    setMentions: setStoreMentions,
    clearMessages,
    setCurrentConversation,
    openSession,
    cacheCurrentSession,
  } = useChatStore()

  useEffect(() => {
    try {
      const storedModel = localStorage.getItem(SELECTED_MODEL_KEY)
      if (storedModel) setSelectedModel(storedModel)
      const stored = localStorage.getItem(PINNED_MODELS_KEY)
      const pinned = stored ? JSON.parse(stored) : []
      if (Array.isArray(pinned)) {
        setPinnedModels(pinned)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (ollamaModels.length === 0) return

    // Only auto-select if no valid model is currently selected
    const currentValid = ollamaModels.some(m => m.name === selectedModel)
    if (currentValid) return

    let nextModel: string | null = null

    if (pinnedModels.length > 0) {
      const validPinned = pinnedModels.filter(name =>
        ollamaModels.some(m => m.name === name)
      )
      if (validPinned.length > 0) {
        nextModel = validPinned[0]
      }
    }

    if (!nextModel) {
      const hasDefault = ollamaModels.some(m => m.name === 'qwen3.5:latest')
      nextModel = hasDefault ? 'qwen3.5:latest' : ollamaModels[0].name
    }

    const modelToSet = nextModel as string
    setSelectedModel(modelToSet)
    try {
      localStorage.setItem(SELECTED_MODEL_KEY, modelToSet)
    } catch {}
  }, [ollamaModels, pinnedModels])

  const togglePin = useCallback((modelName: string) => {
    setPinnedModels(prev => {
      const next = prev.includes(modelName)
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
      try {
        localStorage.setItem(PINNED_MODELS_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const fetchOllamaModels = useCallback(async () => {
    setModelsLoading(true)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/ollama/models`)
      if (!resp.ok) throw new Error('Failed to fetch models')
      const data: OllamaModelsResponse = await resp.json()
      setOllamaAvailable(data.available)
      setOllamaModels(data.models)
    } catch (err) {
      console.error('Error fetching Ollama models:', err)
      setOllamaAvailable(false)
      setOllamaModels([])
    } finally {
      setModelsLoading(false)
    }
  }, [setContextWindow])

  useEffect(() => {
    fetchOllamaModels()
  }, [fetchOllamaModels])

  useEffect(() => {
    const model = ollamaModels.find(m => m.name === selectedModel)
    const ctxLen = model?.context_length || model?.capabilities?.context_length
    if (ctxLen) {
      setContextWindow(ctxLen)
    }
  }, [selectedModel, ollamaModels, setContextWindow])

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    setModelSelectorOpen(false)
    try {
      localStorage.setItem(SELECTED_MODEL_KEY, value)
    } catch {}
    const model = ollamaModels.find(m => m.name === value)
    const ctxLen = model?.context_length || model?.capabilities?.context_length
    if (ctxLen) {
      setContextWindow(ctxLen)
    }
  }

  const loading = isLoading || storeLoading

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files as ArrayLike<File>).forEach((file) => {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const fileData = {
        id: fileId,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }
      addUploadedFile(fileData)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [addUploadedFile])

  const executeSlashCommand = (cmdName: string) => {
    const clearInput = () => {
      setInputValue('')
      setMentions([])
      setShowSlashMenu(false)
      clearMentions()
      clearUploadedFiles()
      editorRef.current?.chain().focus().clearContent().run()
    }

    switch (cmdName) {
      case '/new':
        clearMentions()
        clearUploadedFiles()
        cacheCurrentSession()
        const tempId = `temp-${Date.now()}`
        openSession(tempId, 'New Chat')
        setCurrentConversation(null)
        clearMessages()
        clearInput()
        break
      case '/clear':
      case 'clear':
        if (onSendCommand) {
          onSendCommand('clear', [], selectedModel)
        }
        clearMessages()
        clearInput()
        break
      case '/compact':
      case 'compact':
      case '/compaction':
      case 'compaction':
        if (onSendCommand) {
          onSendCommand('compact', [], selectedModel)
        }
        clearInput()
        break
      case '/help':
      case 'help':
        if (onSendCommand) {
          onSendCommand('help', [], selectedModel)
        }
        clearInput()
        break
      default:
        if (onSendCommand) {
          onSendCommand(cmdName.replace(/^\/+/, ''), [], selectedModel)
        }
        clearInput()
        break
    }
  }

  const handleSubmit = () => {
    const text = inputValue.trim()
    const commandMention = mentions.find(m => m.type === 'command')
    if (commandMention) {
      executeSlashCommand(commandMention.name)
      return
    }
    if (!text && uploadedFiles.length === 0) return

    if (text.startsWith('/') && !text.includes(' ')) {
      executeSlashCommand(text)
      return
    }

    if (loading) {
      addQueuedMessage({
        id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        parts: [{ text, type: 'text' }],
      })
      return
    }

    if (onSendMessage) {
      onSendMessage(text, selectedModel)
    }

    setInputValue('')
    setMentions([])
    clearMentions()
    clearUploadedFiles()
    editorRef.current?.commands.clearContent()
  }

  const handleSlashCommandSelect = (cmd: SlashCommand) => {
    setShowSlashMenu(false)
    justInsertedCommand.current = true

    const editor = editorRef.current
    if (!editor) return

    editor.chain().focus().clearContent().run()
    setInputValue('')
    setMentions([])
    clearMentions()
    clearUploadedFiles()

    executeSlashCommand(`/${cmd.name}`)
  }

  const checkForSlashTrigger = (text: string) => {
    if (justInsertedCommand.current) {
      justInsertedCommand.current = false
      setShowSlashMenu(false)
      return
    }
    const lastSlashSegment = text.split(/\s+/).filter(Boolean).pop() || ''
    if (lastSlashSegment.startsWith('/') && lastSlashSegment.length > 0) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setSlashPosition({ top: rect.top, left: rect.left })
        setShowSlashMenu(true)
      }
    } else {
      setShowSlashMenu(false)
    }
  }

  const handleInputChange = (text: string) => {
    setInputValue(text)
    checkForSlashTrigger(text)
  }

  const formatModelName = (name: string) => {
    return name.replace(/[:]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatModelSize = (size?: number) => {
    if (!size) return ''
    const gb = size / (1024 ** 3)
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    const mb = size / (1024 ** 2)
    return `${mb.toFixed(0)} MB`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <TooltipProvider>
    <div ref={containerRef} className="rounded-xl border bg-background shadow-sm relative">
      {showSlashMenu && (
        <SlashCommandSuggestion
          onSelect={handleSlashCommandSelect}
          onClose={() => setShowSlashMenu(false)}
          top={slashPosition.top}
          left={slashPosition.left}
          width={containerRef.current?.offsetWidth || 400}
          searchValue={(inputValue.split(/\s+/).filter(Boolean).pop() || '').slice(1)}
        />
      )}

      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 border-b">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[10px]"
            >
              {file.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.previewUrl}
                  alt={file.name}
                  className="size-6 rounded object-cover"
                />
              )}
              {!file.previewUrl && <Paperclip className="size-3 text-muted-foreground" />}
              <span className="truncate max-w-[120px]">{file.name}</span>
              <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
              <button
                onClick={() => removeUploadedFile(file.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      <PromptInput onSubmit={handleSubmit} className="rounded-xl">
        <div className="w-full px-3 pt-3">
          <ChatMentionInput
            input={inputValue}
            onChange={handleInputChange}
            onChangeMention={(m) => { setMentions(m); setStoreMentions(m); }}
            onEnter={handleSubmit}
            placeholder="Ask anything... (@ for mentions, / for commands)"
            ref={editorRef}
          />
        </div>
        <PromptInputFooter className="py-2 px-1">
          <PromptInputTools className="flex-wrap gap-1">
            <ChatFeaturesDialog>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                <Settings size={15} />
              </Button>
            </ChatFeaturesDialog>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Upload files</TooltipContent>
            </Tooltip>

            <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
              <ModelSelectorTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  title="Select model"
                >
                  <Cpu size={13} className="shrink-0" />
                  <span className="whitespace-nowrap truncate max-w-[120px]">{formatModelName(selectedModel)}</span>
                </Button>
              </ModelSelectorTrigger>
              <ModelSelectorContent title="Select Model">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="text-xs font-medium text-muted-foreground">
                    {ollamaModels.length > 0 ? `${ollamaModels.length} models available` : 'Models'}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => fetchOllamaModels()}
                    disabled={modelsLoading}
                    title="Refresh models"
                  >
                    {modelsLoading ? <Spinner className="size-3" /> : <RefreshCw size={12} />}
                  </Button>
                </div>
                <ModelSelectorInput placeholder="Search models..." />
                <ModelSelectorList>
                  <ModelSelectorEmpty>
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <p className="text-xs text-muted-foreground">No models found.</p>
                    </div>
                  </ModelSelectorEmpty>

                  {ollamaAvailable && ollamaModels.length > 0 && (
                    <>
                      {pinnedModels.length > 0 && (
                        <ModelSelectorGroup heading="Pinned">
                          {pinnedModels
                            .map(name => ollamaModels.find(m => m.name === name))
                            .filter((m): m is OllamaModel => !!m)
                            .map((model) => {
                              const isSelected = model.name === selectedModel
                              return (
                                <ModelSelectorItem
                                  key={`pinned-${model.name}`}
                                  value={model.name}
                                  onSelect={() => handleModelChange(model.name)}
                                >
                                  <div className="flex items-center gap-2 w-full min-w-0">
                                    {isSelected ? (
                                      <Check size={14} className="text-primary shrink-0" />
                                    ) : (
                                      <Pin size={14} className="text-primary shrink-0 fill-primary" />
                                    )}
                                    <span className="truncate text-sm font-medium flex-1 min-w-0">{formatModelName(model.name)}</span>
                                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground font-mono">
                                      {model.capabilities?.context_length && (
                                        <span>{(model.capabilities.context_length / 1000).toFixed(0)}K ctx</span>
                                      )}
                                      {model.size && (
                                        <span>{formatModelSize(model.size)}</span>
                                      )}
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="size-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                                      onPointerDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                      }}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        togglePin(model.name)
                                      }}
                                    >
                                      <PinOff size={13} />
                                    </Button>
                                  </div>
                                </ModelSelectorItem>
                              )
                            })}
                        </ModelSelectorGroup>
                      )}
                      <ModelSelectorGroup heading={`All Models (${ollamaModels.length})`}>
                        {ollamaModels
                          .filter(m => !pinnedModels.includes(m.name))
                          .map((model) => {
                            const isSelected = model.name === selectedModel
                            return (
                              <ModelSelectorItem
                                key={model.name}
                                value={model.name}
                                onSelect={() => handleModelChange(model.name)}
                              >
                                <div className="flex items-center gap-2 w-full min-w-0">
                                  {isSelected ? (
                                    <Check size={14} className="text-primary shrink-0" />
                                  ) : (
                                    <Cpu size={14} className="text-muted-foreground shrink-0" />
                                  )}
                                  <span className="truncate text-sm font-medium flex-1 min-w-0">{formatModelName(model.name)}</span>
                                  <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground font-mono">
                                    {model.capabilities?.context_length && (
                                      <span>{(model.capabilities.context_length / 1000).toFixed(0)}K ctx</span>
                                    )}
                                    {model.size && (
                                      <span>{formatModelSize(model.size)}</span>
                                    )}
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                                    onPointerDown={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      togglePin(model.name)
                                    }}
                                  >
                                    <Pin size={13} />
                                  </Button>
                                </div>
                              </ModelSelectorItem>
                            )
                          })}
                      </ModelSelectorGroup>
                    </>
                  )}

                  {modelsLoading && (
                    <ModelSelectorGroup heading="Loading...">
                      <ModelSelectorItem value="__loading__" disabled>
                        <span className="flex items-center gap-2">
                          <Spinner className="size-3" /> Fetching models from Ollama...
                        </span>
                      </ModelSelectorItem>
                    </ModelSelectorGroup>
                  )}

                  {!ollamaAvailable && !modelsLoading && (
                    <ModelSelectorGroup heading="Ollama (Offline)">
                      <div className="flex flex-col items-center gap-3 py-6 px-4 text-center">
                        <Cpu className="size-8 text-muted-foreground/50" />
                        <div>
                          <p className="text-xs font-medium">Ollama is not reachable</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Start it with <code className="font-mono bg-muted px-1 rounded">ollama serve</code> or
                            configure a custom URL in Settings.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => fetchOllamaModels()}
                        >
                          <RefreshCw size={12} /> Retry
                        </Button>
                      </div>
                    </ModelSelectorGroup>
                  )}
                </ModelSelectorList>
              </ModelSelectorContent>
            </ModelSelector>
          </PromptInputTools>

          <div className="flex items-center gap-1 shrink-0">
            <span className="font-mono text-xs text-muted-foreground px-2">
              {new Intl.NumberFormat("en-US", { notation: "compact" }).format(contextTokens || tokenUsage.totalTokens || 0)} / {new Intl.NumberFormat("en-US", { notation: "compact" }).format(contextWindow)}
            </span>

            <Button
              size="sm"
              variant="default"
              className="h-7 w-7 p-0 rounded-full shrink-0 disabled:opacity-40"
              type={loading ? 'button' : 'submit'}
              aria-label={loading ? 'Stop generation' : 'Send message'}
              disabled={!loading && !inputValue.trim() && uploadedFiles.length === 0}
              onClick={loading ? onStop : undefined}
            >
              {loading ? <SquareIcon size={14} /> : <ArrowUp size={16} />}
            </Button>
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
    </TooltipProvider>
  )
}

export default Footer

