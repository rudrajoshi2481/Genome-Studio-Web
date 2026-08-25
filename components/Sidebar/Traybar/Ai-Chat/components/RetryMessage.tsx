"use client";

import React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Message as ChatMessage } from "./chatStore";

interface RetryMessageProps {
  message: ChatMessage;
}

function RetryMessage({ message }: RetryMessageProps) {
  const attempt = message.retryAttempt;
  const maxAttempts = message.retryMaxAttempts;
  const delay = message.retryDelay;
  const reason = message.content;

  // Friendly reason text — strip verbose prefixes from the backend
  const friendlyReason = reason
    ? reason
        .replace(/^LLM stream timed out.*?(?:\(.*?\))?/i, "Model is taking a while to respond")
        .replace(/^LLM error:\s*/i, "")
        .trim()
    : "";

  return (
    <div className="my-1 px-1">
      <div className="rounded-lg border border-amber-500/25 dark:border-amber-400/20 bg-amber-500/10 px-3 py-2 flex gap-2.5 items-center">
        <Loader2 className="size-4 shrink-0 text-amber-600 dark:text-amber-400 animate-spin" />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap text-xs">
          <span className="font-medium text-foreground inline-flex items-center gap-1.5">
            <RefreshCw className="size-3 text-amber-600 dark:text-amber-400" />
            Retrying
            {typeof attempt === "number" && (
              <span className="text-muted-foreground font-normal">
                attempt {attempt}
                {typeof maxAttempts === "number" ? ` of ${maxAttempts}` : ""}
              </span>
            )}
          </span>
          {friendlyReason && (
            <span className="text-muted-foreground truncate">— {friendlyReason}</span>
          )}
          {typeof delay === "number" && delay > 0 && (
            <span className={cn("text-[10px] text-amber-700/80 dark:text-amber-300/80")}>
              in {delay}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default RetryMessage;
