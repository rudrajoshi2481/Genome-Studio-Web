import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp, Settings, SquareIcon, Pin, PinOff } from 'lucide-react'
import ChatFeaturesDialog from './ChatFeaturesDialog'
import { useChatStore } from './components/chatStore'
import {
  PromptInput,
  PromptInputTextarea,
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
}

const PINNED_MODELS_KEY = 'pinned-models'

function Footer({ onSendMessage, onStop }: FooterProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('qwen3.5:0.8b')
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [pinnedModels, setPinnedModels] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PINNED_MODELS_KEY)
      const pinned = stored ? JSON.parse(stored) : []
      if (Array.isArray(pinned)) {
        setPinnedModels(pinned)
        if (pinned.length > 0) setSelectedModel(pinned[0])
      }
    } catch {}
  }, [])

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
  const {
    isLoading: storeLoading,
    tokenUsage,
    contextWindow,
    setContextWindow,
    addQueuedMessage,
  } = useChatStore()

  const fetchOllamaModels = useCallback(async () => {
    setModelsLoading(true)
    try {
      const resp = await fetch(`${getApiBaseUrl()}/ai-chat/models`)
      if (!resp.ok) throw new Error('Failed to fetch models')
      const data: OllamaModelsResponse = await resp.json()
      setOllamaAvailable(data.available)
      setOllamaModels(data.models)
      // Set context window from the selected model or default
      const model = data.models.find(m => m.name === selectedModel)
      if (model?.context_length) {
        setContextWindow(model.context_length)
      }
    } catch (err) {
      console.error('Error fetching Ollama models:', err)
      setOllamaAvailable(false)
      setOllamaModels([])
    } finally {
      setModelsLoading(false)
    }
  }, [selectedModel, setContextWindow])

  useEffect(() => {
    fetchOllamaModels()
  }, [fetchOllamaModels])

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    const model = ollamaModels.find(m => m.name === value)
    if (model?.context_length) {
      setContextWindow(model.context_length)
    }
  }

  const loading = isLoading || storeLoading

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return
    if (loading) {
      addQueuedMessage({
        id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        parts: [{ text: message.text.trim(), type: 'text' }],
      })
      return
    }
    if (onSendMessage) {
      onSendMessage(message.text.trim(), selectedModel)
    }
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

  return (
    <TooltipProvider>
    <div className="rounded-xl border bg-background shadow-sm">
      <PromptInput onSubmit={handleSubmit} className="rounded-xl">
        <PromptInputTextarea
          placeholder="Ask anything..."
          className="min-h-8 text-xs"
        />
        <PromptInputFooter className="py-2">
          <PromptInputTools className="flex-wrap gap-1">
            <ChatFeaturesDialog>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                <Settings size={15} />
              </Button>
            </ChatFeaturesDialog>

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
                                className="relative"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <Pin size={12} className="text-primary shrink-0 fill-primary" />
                                  <span className="truncate">{formatModelName(model.name)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {model.size && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {formatModelSize(model.size)}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 size-5 p-0 text-muted-foreground hover:text-foreground z-10"
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
                            className="relative"
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className="truncate">{formatModelName(model.name)}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {model.size && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {formatModelSize(model.size)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="absolute right-1 top-1/2 -translate-y-1/2 size-5 p-0 text-muted-foreground hover:text-foreground z-10"
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
              disabled={!loading && false}
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

