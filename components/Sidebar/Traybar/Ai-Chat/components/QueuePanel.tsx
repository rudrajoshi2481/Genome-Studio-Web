"use client";

import React, { memo, useCallback } from 'react';
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
import { ArrowUp, Trash2 } from 'lucide-react';
import { useChatStore, type QueueTodoItem } from './chatStore';

interface QueuePanelProps {
  onSendMessage?: (content: string, model?: string) => void;
}

interface MessageActionsProps {
  messageId: string;
  onRemove: (e: React.MouseEvent, id: string) => void;
  onSend: (e: React.MouseEvent, id: string) => void;
}

const MessageActions = memo(
  ({ messageId, onRemove, onSend }: MessageActionsProps) => {
    const handleRemove = useCallback(
      (e: React.MouseEvent) => onRemove(e, messageId),
      [onRemove, messageId]
    );
    const handleSend = useCallback(
      (e: React.MouseEvent) => onSend(e, messageId),
      [onSend, messageId]
    );
    return (
      <QueueItemActions>
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
);

MessageActions.displayName = "MessageActions";

interface TodoItemProps {
  todo: QueueTodoItem;
  onRemove: (id: string) => void;
}

const TodoItem = memo(({ todo, onRemove }: TodoItemProps) => {
  const isCompleted = todo.status === 'completed';
  const handleRemove = useCallback(
    () => onRemove(todo.id),
    [onRemove, todo.id]
  );

  return (
    <QueueItem key={todo.id}>
      <div className="flex items-center gap-2">
        <QueueItemIndicator completed={isCompleted} />
        <QueueItemContent completed={isCompleted}>
          {todo.title}
        </QueueItemContent>
        <QueueItemActions>
          <QueueItemAction aria-label="Remove todo" onClick={handleRemove}>
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
  } = useChatStore();

  const handleRemoveMessage = useCallback((id: string) => {
    removeQueuedMessage(id);
  }, [removeQueuedMessage]);

  const handleRemoveTodo = useCallback((id: string) => {
    removeQueuedTodo(id);
  }, [removeQueuedTodo]);

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
                    <div className="flex items-center gap-2">
                      <QueueItemIndicator />
                      <QueueItemContent>{summary}</QueueItemContent>
                      <MessageActions
                        messageId={message.id}
                        onRemove={handleMessageRemove}
                        onSend={handleMessageSend}
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
