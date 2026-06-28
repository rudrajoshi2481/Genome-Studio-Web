import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp, Settings, SquareIcon, Pin, PinOff, Paperclip, X, AtSign, Slash, Terminal } from 'lucide-react'
import ChatFeaturesDialog from './ChatFeaturesDialog'
import { useChatStore } from './components/chatStore'
import {
  PromptInput,
  PromptInputFooter,
  PromptInputTools,
  type PromptInputMessage,
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
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
  ContextContentFooter,
} from '@/components/ai-elements/context'
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
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      const stored = localStorage.getItem(SELECTED_MODEL_KEY)
      return stored || 'qwen3.5:latest'
    } catch {
      return 'qwen3.5:latest'
    }
  })
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [pinnedModels, setPinnedModels] = useState<string[]>([])
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
    if (model?.context_length) {
      setContextWindow(model.context_length)
    }
  }, [selectedModel, ollamaModels, setContextWindow])

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    try {
      localStorage.setItem(SELECTED_MODEL_KEY, value)
    } catch {}
    const model = ollamaModels.find(m => m.name === value)
    if (model?.context_length) {
      setContextWindow(model.context_length)
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
        clearMessages()
        clearInput()
        break
      case '/help':
        if (onSendCommand) {
          onSendCommand('help', [], selectedModel)
        }
        clearInput()
        break
      default:
        if (onSendCommand) {
          onSendCommand(cmdName.replace(/^\//, ''), [], selectedModel)
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
      const messageParts: PromptInputMessage = {
        text,
        parts: [
          { text, type: 'text' as const },
          ...uploadedFiles.map(f => ({
            filename: f.name,
            mediaType: f.mimeType,
            type: 'file' as const,
            url: f.previewUrl,
          })),
        ],
      }
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

    const { from } = editor.state.selection
    const textBefore = editor.state.doc.textBetween(0, from, '', '')
    const lastSlashIdx = textBefore.lastIndexOf('/')

    const mentionNode = {
      type: 'mention' as const,
      attrs: {
        label: cmd.name,
        id: JSON.stringify({ type: 'command', name: cmd.name, id: cmd.name, description: cmd.description }),
      },
    }
    const spaceNode = { type: 'text' as const, text: ' ' }

    if (lastSlashIdx >= 0) {
      const deleteFrom = from - (textBefore.length - lastSlashIdx)
      editor.chain().focus()
        .deleteRange({ from: Math.max(1, deleteFrom), to: from })
        .insertContent([mentionNode, spaceNode])
        .run()
    } else {
      editor.chain().focus().insertContent([mentionNode, spaceNode]).run()
    }
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

            <ModelSelector>
              <ModelSelectorTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Select model"
                >
                  <span className="whitespace-nowrap">{formatModelName(selectedModel)}</span>
                </Button>
              </ModelSelectorTrigger>
              <ModelSelectorContent>
                <ModelSelectorInput placeholder="Search models..." />
                <ModelSelectorList>
                  <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>

                  {ollamaAvailable && ollamaModels.length > 0 && (
                    <>
                      {pinnedModels.length > 0 && (
                        <ModelSelectorGroup heading="Pinned">
                          {pinnedModels
                            .map(name => ollamaModels.find(m => m.name === name))
                            .filter((m): m is OllamaModel => !!m)
                            .map((model) => (
                              <ModelSelectorItem
                                key={`pinned-${model.name}`}
                                value={model.name}
                                onSelect={() => handleModelChange(model.name)}
                              >
                                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                  <Pin size={12} className="text-primary shrink-0 fill-primary" />
                                  <span className="truncate">{formatModelName(model.name)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {model.size && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {formatModelSize(model.size)}
                                    </Badge>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-5 p-0 text-muted-foreground hover:text-foreground"
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
                                    <PinOff size={12} />
                                  </Button>
                                </div>
                              </ModelSelectorItem>
                            ))}
                        </ModelSelectorGroup>
                      )}
                      <ModelSelectorGroup heading="Ollama (Local)">
                        {ollamaModels.map((model) => (
                          <ModelSelectorItem
                            key={model.name}
                            value={model.name}
                            onSelect={() => handleModelChange(model.name)}
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className="truncate">{formatModelName(model.name)}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {model.size && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {formatModelSize(model.size)}
                                  </Badge>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-5 p-0 text-muted-foreground hover:text-foreground"
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
                                  {pinnedModels.includes(model.name) ? (
                                    <Pin size={12} className="text-primary fill-primary" />
                                  ) : (
                                    <Pin size={12} />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </ModelSelectorItem>
                        ))}
                      </ModelSelectorGroup>
                    </>
                  )}

                  {modelsLoading && (
                    <ModelSelectorGroup heading="Loading...">
                      <ModelSelectorItem value="__loading__" disabled>
                        <span className="flex items-center gap-2">
                          <Spinner className="size-3" /> Fetching Ollama models...
                        </span>
                      </ModelSelectorItem>
                    </ModelSelectorGroup>
                  )}

                  {!ollamaAvailable && !modelsLoading && (
                    <ModelSelectorGroup heading="Ollama (Offline)">
                      <ModelSelectorItem value="__ollama_offline__" disabled>
                        <span className="text-xs text-muted-foreground">
                          Ollama not running. Start with `ollama serve`
                        </span>
                      </ModelSelectorItem>
                    </ModelSelectorGroup>
                  )}
                </ModelSelectorList>
              </ModelSelectorContent>
            </ModelSelector>
          </PromptInputTools>

          <div className="flex items-center gap-1 shrink-0">
            <Context
              usedTokens={tokenUsage.totalTokens}
              maxTokens={contextWindow}
              usage={{
                inputTokens: tokenUsage.inputTokens,
                outputTokens: tokenUsage.outputTokens,
                totalTokens: tokenUsage.totalTokens,
                inputTokenDetails: { cacheReadTokens: 0, cacheWriteTokens: 0, noCacheTokens: 0 },
                outputTokenDetails: { reasoningTokens: 0, textTokens: 0 },
              }}
              modelId={selectedModel}
            >
              <ContextTrigger className="h-7 px-2 text-xs gap-1.5" />
              <ContextContent side="top" align="center">
                <ContextContentHeader />
                <ContextContentBody>
                  <ContextInputUsage />
                  <ContextOutputUsage />
                  <ContextReasoningUsage />
                  <ContextCacheUsage />
                </ContextContentBody>
                <ContextContentFooter />
              </ContextContent>
            </Context>

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

