"use client";

import React, { useState, useCallback, useRef } from "react";
import { User, Copy, Check, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Message as ChatMessage } from "./chatStore";
import { useAuthStore } from "@/lib/stores/auth-store";

const MAX_TEXT_LENGTH = 400;

interface UserMessageProps {
  message: ChatMessage;
  isLast?: boolean;
  onEdit?: (id: string, newContent: string) => void;
  onDelete?: (id: string) => void;
}

function UserMessage({ message, isLast, onEdit, onDelete }: UserMessageProps) {
  const user = useAuthStore((state) => state.user);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [expanded, setExpanded] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = (() => {
    const fullName = user?.full_name?.trim();
    if (fullName) {
      const parts = fullName.split(/\s+/);
      return parts[parts.length - 1];
    }
    return user?.username || "You";
  })();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleDelete = useCallback(() => {
    if (onDelete) onDelete(message.id);
  }, [message.id, onDelete]);

  const handleSaveEdit = useCallback(() => {
    if (onEdit && editValue.trim()) {
      onEdit(message.id, editValue.trim());
    }
    setMode("view");
  }, [editValue, message.id, onEdit]);

  const isLongText = message.content.length > MAX_TEXT_LENGTH;
  const displayText =
    expanded || !isLongText
      ? message.content
      : message.content.slice(0, MAX_TEXT_LENGTH);

  if (mode === "edit") {
    return (
      <div className="flex flex-col gap-1.5 items-end my-1 px-3">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full max-w-[85%] rounded-lg border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSaveEdit();
            }
            if (e.key === "Escape") setMode("view");
          }}
        />
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setMode("view")}>
            Cancel
          </Button>
          <Button size="sm" className="h-6 text-[10px]" onClick={handleSaveEdit}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex flex-col gap-1 items-end my-1 px-3 group/msg">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[9px] text-muted-foreground opacity-0 group-hover/msg:opacity-100 transition-opacity">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }) : ""}
        </span>
        <span className="text-[10px] font-medium text-foreground">{displayName}</span>
        <Avatar className="h-4 w-4">
          {user?.avatar && <AvatarImage src={user.avatar} alt={displayName} />}
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="h-2.5 w-2.5" />
          </AvatarFallback>
        </Avatar>
      </div>
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[85%] ring-1 ring-input relative overflow-hidden",
          isLast ? "bg-accent text-accent-foreground px-3 py-2" : "bg-muted/50 px-3 py-2",
        )}
      >
        {isLongText && !expanded && (
          <div className="absolute pointer-events-none bg-gradient-to-t from-accent to-transparent w-full h-16 bottom-0 left-0" />
        )}
        <p className="whitespace-pre-wrap text-xs break-words">{displayText}</p>
        {isLongText && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] self-center"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="size-2.5 mr-0.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="size-2.5 mr-0.5" />
                Show more
              </>
            )}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={handleCopy}
        >
          {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
        </Button>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => {
              setEditValue(message.content);
              setMode("edit");
            }}
          >
            <Pencil className="size-2.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="size-2.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default UserMessage;