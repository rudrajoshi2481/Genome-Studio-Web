import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp, Settings, SquareIcon, Pin, PinOff, Paperclip, X, AtSign, Slash, Terminal, RefreshCw, Cpu, Check, WifiOff, Download, Boxes } from 'lucide-react'
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

interface ModelPricing {
  input: number | null
  output: number | null
  is_free: boolean
}

interface OllamaModel {
  name: string
  provider?: string
  size?: number
  digest?: string
  modified_at?: string
  context_length?: number
  pricing?: ModelPricing
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

interface AllModelsResponse {
  providers: { id: string; name: string; available: boolean; base_url: string }[]
  models: OllamaModel[]
}

interface FooterProps {
  onSendMessage?: (message: string, model?: string) => void;
  onStop?: () => void;
  onSendCommand?: (command: string, commandArgs?: string[], model?: string) => void;
  setInputRef?: (setter: (text: string) => void) => void;
}

const PINNED_MODELS_KEY = 'pinned-models'
const SELECTED_MODEL_KEY = 'selected-model'

function Footer({ onSendMessage, onStop, onSendCommand, setInputRef }: FooterProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [zaiModels, setZaiModels] = useState<OllamaModel[]>([])
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const [zaiAvailable, setZaiAvailable] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [mentions, setMentions] = useState<ChatMention[]>([])
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 })
  const editorRef = useRef<Editor | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const justInsertedCommand = useRef(false)

  // Register input setter with parent so prompt suggestions can fill the input
  useEffect(() => {
    if (setInputRef) {
      setInputRef((text: string) => {
        setInputValue(text)
        if (editorRef.current) {
          editorRef.current.commands.focus()
          editorRef.current.commands.setContent(text)
        }
      })
    }
  }, [setInputRef])

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
    selectedModel: storeSelectedModel,
    setSelectedModel: storeSetSelectedModel,
    pinnedModels: storePinnedModels,
    setPinnedModels: storeSetPinnedModels,
  } = useChatStore()

  // Use store values as source of truth. Initialize with default for SSR consistency;
  // actual value from localStorage/store is applied in useEffect after hydration.
  const [selectedModel, setSelectedModelState] = useState<string>('')
  const [pinnedModels, setPinnedModelsState] = useState<string[]>([])

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model)
    storeSetSelectedModel(model)
    try { localStorage.setItem(SELECTED_MODEL_KEY, model) } catch {}
  }, [storeSetSelectedModel])

  const setPinnedModels = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    const next = typeof updater === 'function' ? (updater as (prev: string[]) => string[])(pinnedModels) : updater
    setPinnedModelsState(next)
    storeSetPinnedModels(next)
    try {
      localStorage.setItem(PINNED_MODELS_KEY, JSON.stringify(next))
    } catch {}
  }, [storeSetPinnedModels, pinnedModels])

  // Sync selected model and pinned models from store/localStorage after hydration
  useEffect(() => {
    // Prefer store value, fall back to localStorage for migration
    const model = storeSelectedModel || (() => {
      try { return localStorage.getItem(SELECTED_MODEL_KEY) || '' } catch { return '' }
    })()
    setSelectedModelState(model)

    const pinned = storePinnedModels.length > 0 ? storePinnedModels : (() => {
      try {
        const stored = localStorage.getItem(PINNED_MODELS_KEY)
        const parsed = stored ? JSON.parse(stored) : []
        return Array.isArray(parsed) ? parsed as string[] : []
      } catch { return [] }
    })()
    setPinnedModelsState(pinned)

    // Migrate old localStorage keys to store
    try {
      const storedModel = localStorage.getItem(SELECTED_MODEL_KEY)
      if (storedModel && !storeSelectedModel) {
        storeSetSelectedModel(storedModel)
      }
      const stored = localStorage.getItem(PINNED_MODELS_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      if (Array.isArray(parsed) && parsed.length > 0 && storePinnedModels.length === 0) {
        storeSetPinnedModels(parsed)
      }
    } catch {}
  }, [storeSelectedModel, storePinnedModels, storeSetSelectedModel, storeSetPinnedModels])

  useEffect(() => {
    if (ollamaModels.length === 0) return

    // Only auto-select if no valid model is currently selected
    const allModels = [...ollamaModels, ...zaiModels]
    const currentValid = allModels.some(m => m.name === selectedModel)
    if (currentValid) return

    let nextModel: string | null = null

    if (pinnedModels.length > 0) {
      const validPinned = pinnedModels.filter(name =>
        allModels.some(m => m.name === name)
      )
      if (validPinned.length > 0) {
        nextModel = validPinned[0]
      }
    }

    if (!nextModel) {
      const hasDefault = ollamaModels.some(m => m.name === 'qwen3.5:latest')
      nextModel = hasDefault ? 'qwen3.5:latest' : (allModels[0]?.name || '')
    }

    const modelToSet = nextModel as string
    setSelectedModel(modelToSet)
  }, [ollamaModels, zaiModels, pinnedModels])

  const togglePin = useCallback((modelName: string) => {
    setPinnedModels(prev =>
      prev.includes(modelName)
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    )
  }, [setPinnedModels])

  const fetchOllamaModels = useCallback(async () => {
    setModelsLoading(true)
    try {
      // Fetch all models (Ollama + Z.ai) from the unified endpoint
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/models`)
      if (!resp.ok) throw new Error('Failed to fetch models')
      const data: AllModelsResponse = await resp.json()

      // Split models by provider
      const ollama = data.models.filter(m => !m.provider || m.provider === 'ollama')
      const zai = data.models.filter(m => m.provider === 'zai')

      setOllamaModels(ollama)
      setOllamaAvailable(ollama.length > 0)
      setZaiModels(zai)
      setZaiAvailable(zai.length > 0)
    } catch (err) {
      console.error('Error fetching models:', err)
      setOllamaAvailable(false)
      setZaiAvailable(false)
      setOllamaModels([])
      setZaiModels([])
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOllamaModels()
  }, [fetchOllamaModels])

  useEffect(() => {
    // Look up model from both Ollama and Z.ai lists
    const model = [...ollamaModels, ...zaiModels].find(m => m.name === selectedModel)
    const ctxLen = model?.context_length || model?.capabilities?.context_length
    if (ctxLen) {
      setContextWindow(ctxLen)
    }
  }, [selectedModel, ollamaModels, zaiModels, setContextWindow])

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    setModelSelectorOpen(false)
    // Look up model from both Ollama and Z.ai lists
    const model = [...ollamaModels, ...zaiModels].find(m => m.name === value)
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

    // Normalize: accept both "/new" and "new" forms
    const normalized = cmdName.replace(/^\/+/, '')

    switch (normalized) {
      case 'new':
        // Cache the outgoing session so its messages aren't lost when we
        // switch to the fresh tab (matches handleNewConversation behavior).
        cacheCurrentSession()
        clearMentions()
        clearUploadedFiles()
        {
          const tempId = `temp-${Date.now()}`
          openSession(tempId, 'New Chat')
          setCurrentConversation(null)
          clearMessages()
        }
        clearInput()
        break
      case 'clear':
        if (onSendCommand) {
          onSendCommand('clear', [], selectedModel)
        }
        clearMessages()
        clearInput()
        break
      case 'compact':
      case 'compaction':
        if (onSendCommand) {
          onSendCommand('compact', [], selectedModel)
        }
        clearInput()
        break
      case 'help':
        if (onSendCommand) {
          onSendCommand('help', [], selectedModel)
        }
        clearInput()
        break
      default:
        if (onSendCommand) {
          onSendCommand(normalized, [], selectedModel)
        }
        clearInput()
        break
    }
  }

  const handleSubmit = () => {
    const text = inputValue.trim()
    const commandMentions = mentions.filter(m => m.type === 'command')
    if (commandMentions.length > 0) {
      // Command badge(s) present in the editor. Execute them.
      const builtin = ['new', 'clear', 'compact', 'compaction', 'help']
      // Strip all command badge labels from the text to get extra args.
      let extraText = text
      for (const cm of commandMentions) {
        const cmdName = cm.name.startsWith('/') ? cm.name : `/${cm.name}`
        extraText = extraText.replace(`command("${cmdName}")`, '')
      }
      extraText = extraText.trim()
      const extraArgs = extraText ? extraText.split(/\s+/) : []

      // Execute each command badge. Built-ins execute locally; custom
      // commands are sent to the backend (only the last one carries args).
      for (let i = 0; i < commandMentions.length; i++) {
        const cm = commandMentions[i]
        const cmdName = cm.name.startsWith('/') ? cm.name : `/${cm.name}`
        const normalized = cmdName.replace(/^\/+/, '')
        const isLast = i === commandMentions.length - 1
        if (builtin.includes(normalized)) {
          executeSlashCommand(cmdName)
        } else if (onSendCommand) {
          onSendCommand(normalized, isLast ? extraArgs : [], selectedModel)
        }
      }
      setInputValue('')
      setMentions([])
      clearMentions()
      clearUploadedFiles()
      editorRef.current?.commands.clearContent()
      return
    }
    if (!text && uploadedFiles.length === 0) return

    // Slash command typed as plain text: "/cmd" or "/cmd arg1 arg2".
    if (text.startsWith('/')) {
      const parts = text.split(/\s+/)
      const cmd = parts[0]
      const args = parts.slice(1)
      if (cmd.length > 1) {
        const builtin = ['new', 'clear', 'compact', 'compaction', 'help']
        const normalizedName = cmd.replace(/^\/+/, '')
        if (builtin.includes(normalizedName)) {
          executeSlashCommand(cmd)
        } else if (onSendCommand) {
          onSendCommand(normalizedName, args, selectedModel)
          setInputValue('')
          setMentions([])
          clearMentions()
          clearUploadedFiles()
          editorRef.current?.commands.clearContent()
        }
        return
      }
    }

    if (loading) {
      addQueuedMessage({
        id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        parts: [{ text, type: 'text' }],
      })
      setInputValue('')
      setMentions([])
      clearMentions()
      clearUploadedFiles()
      editorRef.current?.commands.clearContent()
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
    // Don't set justInsertedCommand — we're inserting a badge, not executing,
    // and setting it would suppress the next slash trigger.

    const editor = editorRef.current
    if (!editor) return

    // Delete only the typed slash trigger text (e.g. "/ne"), NOT the entire
    // editor content — otherwise existing badges get wiped when stacking
    // multiple commands. Walk the doc nodes to find the last "/" character
    // position before the cursor, then delete from there to the cursor.
    const cursorPos = editor.state.selection.head
    let slashDocPos = -1
    editor.state.doc.nodesBetween(0, cursorPos, (node, pos) => {
      if (node.isText) {
        const text = node.text || ''
        const idx = text.lastIndexOf('/')
        if (idx !== -1) {
          // pos is the doc position of this text node; idx is the offset within it
          slashDocPos = pos + idx
        }
      }
    })

    if (slashDocPos !== -1) {
      editor.chain().focus().deleteRange({ from: slashDocPos, to: cursorPos }).run()
    }

    const cmdName = cmd.name.startsWith('/') ? cmd.name : `/${cmd.name}`
    const mentionId = JSON.stringify({
      type: 'command',
      name: cmdName,
      description: cmd.description || '',
    })

    // Insert the command as a mention badge followed by a space so the
    // user can type additional text/arguments after it.
    editor
      .chain()
      .focus()
      .insertContent([
        { type: 'mention', attrs: { label: `command("${cmdName}")`, id: mentionId } },
        { type: 'text', text: ' ' },
      ])
      .run()
    // Focus back to the editor so the user can type immediately
    editor.commands.focus()
  }

  const checkForSlashTrigger = (text: string) => {
    if (justInsertedCommand.current) {
      justInsertedCommand.current = false
      setShowSlashMenu(false)
      return
    }
    // Trigger the slash menu when "/" appears at the start of the input OR
    // right after a whitespace (e.g. after a command badge + space). This
    // allows stacking multiple command badges in the same message.
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
    // Strip provider prefix for display
    const display = name.replace(/^(zai|ollama):/, '')
    return display.replace(/[:]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatPricing = (pricing?: ModelPricing) => {
    if (!pricing) return null
    if (pricing.is_free) return 'Free'
    if (pricing.input != null && pricing.output != null) {
      return `$${pricing.input}/$${pricing.output}`
    }
    return null
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
          searchValue={(inputValue.split(/\s+/).filter(Boolean).pop() || '').replace(/^\//, '')}
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
            placeholder="Ask anything... (@ for skills/agents, / for commands)"
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
                  <span className="whitespace-nowrap truncate max-w-[120px]">{selectedModel ? formatModelName(selectedModel) : 'No model'}</span>
                </Button>
              </ModelSelectorTrigger>
              <ModelSelectorContent title="Select Model">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="text-xs font-medium text-muted-foreground">
                    {[...ollamaModels, ...zaiModels].length > 0 ? `${[...ollamaModels, ...zaiModels].length} models available` : 'Models'}
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
                  {(ollamaAvailable || zaiAvailable) && (
                    <ModelSelectorEmpty>
                      <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <p className="text-xs text-muted-foreground">No models found.</p>
                      </div>
                    </ModelSelectorEmpty>
                  )}

                  {ollamaAvailable && ollamaModels.length > 0 && (
                    <>
                      {pinnedModels.length > 0 && (
                        <ModelSelectorGroup heading="Pinned">
                          {pinnedModels
                            .map(name => [...ollamaModels, ...zaiModels].find(m => m.name === name))
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
                                      {model.capabilities?.supports_tools && (
                                        <span>tools</span>
                                      )}
                                      {model.capabilities?.supports_reasoning && (
                                        <span>reasoning</span>
                                      )}
                                      {model.capabilities?.supports_vision && (
                                        <span>vision</span>
                                      )}
                                      {model.size && (
                                        <span>{formatModelSize(model.size)}</span>
                                      )}
                                      {formatPricing(model.pricing) && (
                                        <span className={model.pricing?.is_free ? 'text-green-500 font-semibold' : ''}>
                                          {formatPricing(model.pricing)}
                                        </span>
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
                      <ModelSelectorGroup heading={`Ollama (${ollamaModels.length})`}>
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
                                    {model.capabilities?.supports_tools && (
                                      <span>tools</span>
                                    )}
                                    {model.capabilities?.supports_reasoning && (
                                      <span>reasoning</span>
                                    )}
                                    {model.capabilities?.supports_vision && (
                                      <span>vision</span>
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

                  {zaiAvailable && zaiModels.length > 0 && (
                    <ModelSelectorGroup heading={`Z.ai Cloud (${zaiModels.length})`}>
                      {zaiModels
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
                                  {model.capabilities?.supports_tools && (
                                    <span>tools</span>
                                  )}
                                  {model.capabilities?.supports_reasoning && (
                                    <span>reasoning</span>
                                  )}
                                  {model.capabilities?.supports_vision && (
                                    <span>vision</span>
                                  )}
                                  {formatPricing(model.pricing) && (
                                    <span className={model.pricing?.is_free ? 'text-green-500 font-semibold' : ''}>
                                      {formatPricing(model.pricing)}
                                    </span>
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
                  )}

                  {modelsLoading && (
                    <ModelSelectorGroup heading="Loading...">
                      <ModelSelectorItem value="__loading__" disabled>
                        <span className="flex items-center gap-2">
                          <Spinner className="size-3" /> Fetching models...
                        </span>
                      </ModelSelectorItem>
                    </ModelSelectorGroup>
                  )}

                  {!ollamaAvailable && !zaiAvailable && !modelsLoading && (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                        <Boxes className="size-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold">No models available</p>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                          Install Ollama for local LLMs, or configure a Z.ai API key in your backend{' '}
                          <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted border border-border/40">.env</code>{' '}
                          file.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href="https://ollama.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 text-xs gap-1.5"
                          >
                            <Download size={13} /> Download Ollama
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => fetchOllamaModels()}
                        >
                          <RefreshCw size={13} /> Retry
                        </Button>
                      </div>
                    </div>
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

