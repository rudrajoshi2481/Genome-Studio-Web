"use client";

import React from "react";
import { RefreshCw, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Message as ChatMessage } from "./chatStore";

interface RetryMessageProps {
  message: ChatMessage;
}

function parseErrorReason(reason: string | undefined): {
  title: string;
  code?: string;
} {
  if (!reason) return { title: "" };

  // Try to extract a JSON-ish error payload
  // Backend sends Python-style single quotes: {'error': {'code': '1305', 'message': '...'}}
  const jsonMatch = reason.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      // Convert Python single quotes to JSON double quotes
      const jsonStr = jsonMatch[0].replace(/'/g, '"');
      const parsed = JSON.parse(jsonStr);
      const error = parsed.error || parsed;
      if (typeof error === "object" && error !== null) {
        const message =
          error.message ||
          error.error_message ||
          (typeof error.error === "string" ? error.error : "");
        const code = error.code;
        if (message) {
          return {
            title: message,
            code: typeof code === "string" ? code : (typeof code === "number" ? String(code) : undefined),
          };
        }
      }
    } catch {
      // fall through to text cleanup
    }
  }

  // Friendly text cleanup
  const title = reason
    .replace(/^LLM stream timed out.*?(?:\(.*?\))?/i, "Model is taking a while to respond")
    .replace(/^LLM error:\s*/i, "")
    .replace(/^Error code:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return { title };
}

function RetryMessage({ message }: RetryMessageProps) {
  const attempt = message.retryAttempt;
  const maxAttempts = message.retryMaxAttempts;
  const delay = message.retryDelay;
  const reason = message.content;

  // If the WebSocket handler already parsed the error, use that code.
  // Otherwise parse the content ourselves.
  const { title } = parseErrorReason(reason);
  const code = message.errorCode;

  return (
    <div className="my-1 px-1">
      <Alert className="py-2.5 px-3">
        <RefreshCw className="size-4" />
        <AlertTitle className="flex items-center gap-2 flex-wrap text-sm">
          Retrying
          {typeof attempt === "number" && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
              attempt {attempt}
              {typeof maxAttempts === "number" ? ` / ${maxAttempts}` : ""}
            </Badge>
          )}
          {typeof delay === "number" && delay > 0 && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 font-normal">
              <Clock className="size-3" />
              in {delay}s
            </span>
          )}
        </AlertTitle>
        {title && (
          <AlertDescription className="text-xs leading-relaxed break-words">
            {title}
            {code && (
              <span className="ml-1.5 text-[10px] text-muted-foreground/70 font-mono">
                (code {code})
              </span>
            )}
          </AlertDescription>
        )}
      </Alert>
    </div>
  );
}

export default RetryMessage;
