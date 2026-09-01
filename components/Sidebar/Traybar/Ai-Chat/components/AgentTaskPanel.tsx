"use client";

import React, { memo, useCallback, useState } from 'react';
import { Check, ChevronDown, ListTodo, Loader2, Pencil, Trash2, X } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { type QueueTodoItem } from './chatStore';

// ---------------------------------------------------------------------------
// Status indicator
// ---------------------------------------------------------------------------
function TaskStatusIcon({ status }: { status: QueueTodoItem['status'] }) {
  if (status === 'completed') {
    return (
      <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="flex-shrink-0 relative flex items-center justify-center w-4 h-4">
        {/* Dashed rotating ring */}
        <span
          className="absolute inset-0 rounded-full border border-primary/40 border-t-primary animate-spin"
          style={{ animationDuration: '600ms' }}
        />
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      </span>
    );
  }
  // pending
  return (
    <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full border border-muted-foreground/30" />
  );
}

// ---------------------------------------------------------------------------
// Single task row
// ---------------------------------------------------------------------------
interface AgentTaskRowProps {
  todo: QueueTodoItem;
  onRemove: (id: string) => void;
  onEdit: (id: string, title: string, description?: string) => void;
  onToggleStatus: (id: string) => void;
  readOnly?: boolean;
}

const AgentTaskRow = memo(({ todo, onRemove, onEdit, onToggleStatus, readOnly }: AgentTaskRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description || '');

  const isCompleted = todo.status === 'completed';
  const isActive = todo.status === 'active';

  const handleStartEdit = useCallback(() => {
    setEditTitle(todo.title);
    setEditDesc(todo.description || '');
    setIsEditing(true);
  }, [todo.title, todo.description]);

  const handleSaveEdit = useCallback(() => {
    if (editTitle.trim()) {
      onEdit(todo.id, editTitle.trim(), editDesc.trim() || undefined);
    }
    setIsEditing(false);
  }, [todo.id, editTitle, editDesc, onEdit]);

  const handleCancelEdit = useCallback(() => setIsEditing(false), []);

  const handleRemove = useCallback(() => onRemove(todo.id), [onRemove, todo.id]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleStatus(todo.id);
    },
    [onToggleStatus, todo.id],
  );

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1.5 px-3 py-2 rounded-lg border bg-background">
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit();
            if (e.key === 'Escape') handleCancelEdit();
          }}
        />
        <input
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit();
            if (e.key === 'Escape') handleCancelEdit();
          }}
        />
        <div className="flex gap-1.5 justify-end">
          <button
            onClick={handleCancelEdit}
            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border bg-background hover:bg-accent transition-colors text-muted-foreground"
          >
            <X size={10} /> Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Check size={10} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-2 px-3 py-1 rounded-lg transition-colors',
        readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-accent/40',
        isActive && 'bg-primary/5',
      )}
      onClick={readOnly ? undefined : handleToggle}
      title={readOnly ? undefined : 'Click to cycle status'}
    >
      {/* Status indicator */}
      <div className="pt-px">
        <TaskStatusIcon status={todo.status} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-xs leading-relaxed truncate transition-opacity',
            isCompleted && 'line-through text-muted-foreground/60',
            isActive && 'text-foreground font-medium',
            !isCompleted && !isActive && 'text-muted-foreground',
          )}
        >
          {todo.title}
        </p>
        {todo.description && (
          <p
            className={cn(
              'text-[10px] leading-relaxed mt-0.5 truncate',
              isCompleted ? 'text-muted-foreground/40 line-through' : 'text-muted-foreground/70',
            )}
          >
            {todo.description}
          </p>
        )}
      </div>

      {/* Hover actions */}
      {!readOnly && (
      <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          aria-label="Edit task"
          onClick={(e) => {
            e.stopPropagation();
            handleStartEdit();
          }}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Edit"
        >
          <Pencil size={11} />
        </button>
        <button
          aria-label="Remove task"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove"
        >
          <Trash2 size={11} />
        </button>
      </div>
      )}
    </div>
  );
});

AgentTaskRow.displayName = 'AgentTaskRow';

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
interface AgentTaskPanelProps {
  todos: QueueTodoItem[];
  onRemove?: (id: string) => void;
  onEdit?: (id: string, title: string, description?: string) => void;
  onUpdate?: (id: string, updates: Partial<QueueTodoItem>) => void;
  readOnly?: boolean;
  defaultOpen?: boolean;
}

function AgentTaskPanel({ todos, onRemove, onEdit, onUpdate, readOnly, defaultOpen = true }: AgentTaskPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (todos.length === 0) return null;

  const completedCount = todos.filter((t) => t.status === 'completed').length;
  const totalCount = todos.length;

  const handleToggleStatus = useCallback(
    (id: string) => {
      if (readOnly || !onUpdate) return;
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;
      // Cycle: pending -> active -> completed -> pending
      const next: QueueTodoItem['status'] =
        todo.status === 'pending'
          ? 'active'
          : todo.status === 'active'
            ? 'completed'
            : 'pending';
      onUpdate(id, { status: next });
    },
    [todos, onUpdate, readOnly],
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-2 w-full px-3 h-10',
              'hover:bg-accent/30 transition-colors',
              'text-left',
            )}
          >
            <ListTodo className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              <span className="text-foreground/80 font-medium">{completedCount}</span>
              <span className="text-muted-foreground/60">/{totalCount} done</span>
            </span>
            <div className="flex-1" />
            {/* Progress bar */}
            <div className="hidden sm:flex items-center w-20 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500/70 transition-all duration-300"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200',
                !isOpen && '-rotate-90',
              )}
            />
          </button>
        </CollapsibleTrigger>

        {/* Task list */}
        <CollapsibleContent>
          <div className="px-1.5 pb-1 pt-px space-y-0">
            {todos.map((todo) => (
              <AgentTaskRow
                key={todo.id}
                todo={todo}
                onRemove={onRemove || (() => {})}
                onEdit={onEdit || (() => {})}
                onToggleStatus={handleToggleStatus}
                readOnly={readOnly}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default AgentTaskPanel;
