"use client";

import React, { memo, useCallback, useState } from 'react';
import {
  Queue,
  QueueItem,
  QueueItemAction,
  QueueItemActions,
  QueueItemAttachment,
  QueueItemContent,
  QueueItemDescription,
  QueueItemFile,
  QueueItemImage,
  QueueItemIndicator,
  QueueList,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from '@/components/ai-elements/queue';
import { ArrowUp, Trash2, Pencil, Check, X } from 'lucide-react';
import { useChatStore, type QueueTodoItem, type QueueMessageItem } from './chatStore';

interface QueuePanelProps {
  onSendMessage?: (content: string, model?: string) => void;
}

interface MessageActionsProps {
  messageId: string;
  onRemove: (e: React.MouseEvent, id: string) => void;
  onSend: (e: React.MouseEvent, id: string) => void;
  onEdit: (e: React.MouseEvent, id: string) => void;
}

const MessageActions = memo(
  ({ messageId, onRemove, onSend, onEdit }: MessageActionsProps) => {
    const handleRemove = useCallback(
      (e: React.MouseEvent) => onRemove(e, messageId),
      [onRemove, messageId]
    );
    const handleSend = useCallback(
      (e: React.MouseEvent) => onSend(e, messageId),
      [onSend, messageId]
    );
    const handleEdit = useCallback(
      (e: React.MouseEvent) => onEdit(e, messageId),
      [onEdit, messageId]
    );
    return (
      <QueueItemActions>
        <QueueItemAction
          aria-label="Edit queued message"
          onClick={handleEdit}
          title="Edit"
        >
          <Pencil size={12} />
        </QueueItemAction>
        <QueueItemAction
          aria-label="Remove from queue"
          onClick={handleRemove}
          title="Remove from queue"
        >
          <Trash2 size={12} />
        </QueueItemAction>
        <QueueItemAction aria-label="Send now" onClick={handleSend}>
          <ArrowUp size={14} />
        </QueueItemAction>
      </QueueItemActions>
    );
  }
)

MessageActions.displayName = "MessageActions";

interface TodoItemProps {
  todo: QueueTodoItem;
  onRemove: (id: string) => void;
  onEdit: (id: string, title: string, description?: string) => void;
}

const TodoItem = memo(({ todo, onRemove, onEdit }: TodoItemProps) => {
  const isCompleted = todo.status === 'completed';
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description || '');

  const handleRemove = useCallback(
    () => onRemove(todo.id),
    [onRemove, todo.id]
  );

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

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  if (isEditing) {
    return (
      <QueueItem key={todo.id}>
        <div className="flex flex-col gap-1.5 w-full">
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
      </QueueItem>
    );
  }

  return (
    <QueueItem key={todo.id}>
      <div className="flex items-center gap-2">
        <QueueItemIndicator completed={isCompleted} />
        <QueueItemContent completed={isCompleted}>
          {todo.title}
        </QueueItemContent>
        <QueueItemActions>
          <QueueItemAction aria-label="Edit todo" onClick={handleStartEdit} title="Edit">
            <Pencil size={12} />
          </QueueItemAction>
          <QueueItemAction aria-label="Remove todo" onClick={handleRemove} title="Remove">
            <Trash2 size={12} />
          </QueueItemAction>
        </QueueItemActions>
      </div>
      {todo.description && (
        <QueueItemDescription completed={isCompleted}>
          {todo.description}
        </QueueItemDescription>
      )}
    </QueueItem>
  );
});

TodoItem.displayName = "TodoItem";

function QueuePanel({ onSendMessage }: QueuePanelProps) {
  const {
    queuedMessages,
    queuedTodos,
    removeQueuedMessage,
    removeQueuedTodo,
    updateQueuedMessage,
    updateQueuedTodo,
  } = useChatStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleRemoveMessage = useCallback((id: string) => {
    removeQueuedMessage(id);
  }, [removeQueuedMessage]);

  const handleRemoveTodo = useCallback((id: string) => {
    removeQueuedTodo(id);
  }, [removeQueuedTodo]);

  const handleEditTodo = useCallback((id: string, title: string, description?: string) => {
    updateQueuedTodo(id, { title, description });
  }, [updateQueuedTodo]);

  const handleSendNow = useCallback((id: string) => {
    const msg = useChatStore.getState().queuedMessages.find((m) => m.id === id);
    if (msg && onSendMessage) {
      const text = msg.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join(' ')
        .trim();
      if (text) {
        onSendMessage(text);
      }
    }
    removeQueuedMessage(id);
  }, [onSendMessage, removeQueuedMessage]);

  const handleMessageRemove = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      handleRemoveMessage(id);
    },
    [handleRemoveMessage]
  );

  const handleMessageSend = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      handleSendNow(id);
    },
    [handleSendNow]
  );

  const handleMessageEdit = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const msg = useChatStore.getState().queuedMessages.find((m) => m.id === id);
      if (msg) {
        const text = msg.parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join(' ')
          .trim();
        setEditValue(text);
        setEditingId(id);
      }
    },
    []
  );

  const handleSaveEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      updateQueuedMessage(editingId, {
        parts: [{ type: 'text' as const, text: editValue.trim() }],
      });
    }
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue, updateQueuedMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  if (queuedMessages.length === 0 && queuedTodos.length === 0) {
    return null;
  }

  return (
    <Queue>
      {queuedMessages.length > 0 && (
        <QueueSection>
          <QueueSectionTrigger>
            <QueueSectionLabel count={queuedMessages.length} label="Queued" />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {queuedMessages.map((message) => {
                const summary = (() => {
                  const textParts = message.parts.filter(
                    (p) => p.type === 'text'
                  );
                  const text = textParts
                    .map((p) => p.text)
                    .join(' ')
                    .trim();
                  return text || '(queued message)';
                })();

                const fileParts = message.parts.filter(
                  (p): p is { filename?: string; mediaType?: string; type: 'file'; url?: string } =>
                    p.type === 'file' && !!p.url
                );
                const hasFiles = fileParts.length > 0;

                return (
                  <QueueItem key={message.id}>
                    {editingId === message.id ? (
                      <div className="flex flex-col gap-1.5 w-full">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit();
                            }
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
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <QueueItemIndicator />
                          <QueueItemContent>{summary}</QueueItemContent>
                          <MessageActions
                            messageId={message.id}
                            onRemove={handleMessageRemove}
                            onSend={handleMessageSend}
                            onEdit={handleMessageEdit}
                          />
                        </div>
                        {hasFiles && (
                          <QueueItemAttachment>
                            {fileParts.map((file) => {
                              if (
                                file.mediaType?.startsWith('image/') &&
                                file.url
                              ) {
                                return (
                                  <QueueItemImage
                                    alt={file.filename || 'attachment'}
                                    key={file.url}
                                    src={file.url}
                                  />
                                );
                              }
                              return (
                                <QueueItemFile key={file.url}>
                                  {file.filename || 'file'}
                                </QueueItemFile>
                              );
                            })}
                          </QueueItemAttachment>
                        )}
                      </>
                    )}
                  </QueueItem>
                );
              })}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      )}
      {queuedTodos.length > 0 && (
        <QueueSection>
          <QueueSectionTrigger>
            <QueueSectionLabel count={queuedTodos.length} label="Todo" />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {queuedTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  onRemove={handleRemoveTodo}
                  onEdit={handleEditTodo}
                  todo={todo}
                />
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      )}
    </Queue>
  );
}

export default QueuePanel;
