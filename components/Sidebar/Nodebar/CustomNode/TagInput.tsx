"use client"
import React, { useState, useEffect, KeyboardEvent } from 'react'
import { X, TagIcon, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagProps {
  id?: string
  label: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

interface TagInputProps {
  tags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  className?: string
  placeholder?: string
  maxTags?: number
  disabled?: boolean
  suggestions?: string[]
}

// Individual Tag Component
export const Tag = ({
  id,
  label,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  onClick,
  className
}: TagProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const baseClasses = cn(
    'inline-flex items-center gap-1 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
      // Variants
      'bg-primary text-primary-foreground hover:bg-primary/80': variant === 'default',
      'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
      'bg-destructive text-destructive-foreground hover:bg-destructive/80': variant === 'destructive',
      'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
      
      // Sizes
      'text-xs px-2 py-1 rounded-md': size === 'sm',
      'text-sm px-2.5 py-1.5 rounded-md': size === 'md',
      'text-base px-3 py-2 rounded-lg': size === 'lg',
      
      // Interactive
      'cursor-pointer': onClick,
    },
    className
  )

  if (!mounted) {
    return (
      <span className={baseClasses}>
        <TagIcon className="w-3 h-3" />
        <span>{label}</span>
      </span>
    )
  }

  return (
    <span className={baseClasses} onClick={onClick}>
      <TagIcon className="w-3 h-3" />
      <span>{label}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${label} tag`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

// Enhanced TagInput Component
const TagInput = ({
  tags,
  onAddTag,
  onRemoveTag,
  className,
  placeholder = "Add a tag...",
  maxTags,
  disabled = false,
  suggestions = []
}: TagInputProps) => {
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (input && suggestions.length > 0) {
      const filtered = suggestions.filter(
        suggestion => 
          suggestion.toLowerCase().includes(input.toLowerCase()) &&
          !tags.includes(suggestion)
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }, [input, suggestions, tags])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      addTag(input.trim())
    }
    
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemoveTag(tags[tags.length - 1])
    }

    if (e.key === 'Escape') {
      setShowSuggestions(false)
      setInput('')
    }
  }

  const addTag = (tagValue: string) => {
    if (tags.includes(tagValue)) return
    if (maxTags && tags.length >= maxTags) return
    
    onAddTag(tagValue)
    setInput('')
    setShowSuggestions(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    if (!disabled) {
      onRemoveTag(tagToRemove)
    }
  }

  if (!mounted) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center border rounded-md px-3 py-2">
          <TagIcon className="h-4 w-4 text-muted-foreground mr-2" />
          <input
            type="text"
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm"
            disabled
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center gap-1 font-medium bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md"
              >
                <TagIcon className="w-3 h-3" />
                <span>{tag}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2 relative", className)}>
      <div className={cn(
        "flex items-center border rounded-md px-3 py-2 focus-within:ring-1 focus-within:ring-ring",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        <TagIcon className="h-4 w-4 text-muted-foreground mr-2" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input && setShowSuggestions(filteredSuggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={disabled ? "Disabled" : placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-sm disabled:cursor-not-allowed"
        />
        {input && (
          <button
            type="button"
            onClick={() => addTag(input.trim())}
            // disabled={disabled || !input.trim() || tags.includes(input.trim()) || (maxTags && tags.length >= maxTags)}
            className="ml-2 p-1 hover:bg-muted rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => addTag(suggestion)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      
      {/* Display Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 font-medium bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md"
            >
              <TagIcon className="w-3 h-3" />
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${tag} tag`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Max tags indicator */}
      {maxTags && (
        <div className="text-xs text-muted-foreground">
          {tags.length}/{maxTags} tags
        </div>
      )}
    </div>
  )
}

export default TagInput
