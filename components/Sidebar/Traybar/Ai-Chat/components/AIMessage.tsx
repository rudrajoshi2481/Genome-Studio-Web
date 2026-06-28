"use client";

import React, { useState, useCallback } from "react";
import { Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Message as ChatMessage } from "./chatStore";
import { Markdown } from "./Markdown";
import { PonderingIndicator } from "./PonderingIndicator";

interface AIMessageProps {
  message: ChatMessage;
  isLast?: boolean;
  isLoading?: boolean;
  onRegenerate?: () => void;
  onDelete?: (id: string) => void;
}

function AIMessage({ message, isLast, isLoading, onRegenerate, onDelete }: AIMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleDelete = useCallback(() => {
    if (onDelete) onDelete(message.id);
  }, [message.id, onDelete]);

  return (
    <div className="flex flex-col gap-1 my-1 px-3 group/msg">
      <div className={cn(
        "px-3 py-2 w-full",
      )}>
        {message.content ? (
          <Markdown>{message.content}</Markdown>
        ) : message.isStreaming ? (
          <PonderingIndicator compact mode="responding" />
        ) : null}
      </div>
      {!message.isStreaming && message.content && (
        <div className="flex items-center gap-0.5">
          {isLast && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
            </Button>
          )}
          {onRegenerate && isLast && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={onRegenerate}
              disabled={isLoading}
            >
              <RefreshCw className="size-2.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="size-2.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default AIMessage;