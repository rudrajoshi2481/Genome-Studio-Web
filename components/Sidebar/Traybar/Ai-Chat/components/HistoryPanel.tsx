"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Conversation } from "./chatStore";
import { getApiBaseUrl } from "@/config/server";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoryPanelProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
  onSelectConversation: (conv: Conversation) => void;
  onConversationDeleted: (id: string) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
  return date.toLocaleDateString();
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  conversations,
  currentConversationId,
  isLoading,
  showAll,
  onToggleShowAll,
  onSelectConversation,
  onConversationDeleted,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = searchQuery.trim()
    ? conversations.filter((c) =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : conversations;

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setDeletingId(convId);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/ai-chat/sessions/${convId}`,
        { method: "DELETE" },
      );
      if (response.ok) {
        onConversationDeleted(convId);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading && conversations.length === 0) {
    return (
      <div className="px-3 pt-2 pb-1 space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-xs text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-3 pt-2 pb-1">
      <Input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
        className="h-7 text-xs mb-2"
      />
      <div className="overflow-y-auto max-h-[240px] space-y-0.5">
        {filtered.map((conv) => {
          const isActive = currentConversationId === conv.id;
          const isDeleting = deletingId === conv.id;
          return (
            <div
              key={conv.id}
              onClick={() => !isDeleting && onSelectConversation(conv)}
              className={cn(
                "group/conv flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                isDeleting && "opacity-40 pointer-events-none",
              )}
            >
              <span className="flex-1 truncate">{conv.title || "Untitled"}</span>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                {formatDate(conv.last_message_at || conv.updated_at)}
              </span>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className="shrink-0 size-4 rounded flex items-center justify-center opacity-0 group-hover/conv:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                title="Delete"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
      {!searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleShowAll}
          className="w-full text-[10px] text-muted-foreground hover:text-foreground h-6 mt-1"
        >
          {showAll ? (
            <><ChevronUp className="size-3" /> Show Less</>
          ) : (
            <><ChevronDown className="size-3" /> Show All</>
          )}
        </Button>
      )}
    </div>
  );
};

export default HistoryPanel;
