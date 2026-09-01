"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Clock,
  Gauge,
  KeyRound,
  WifiOff,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Message as ChatMessage } from "./chatStore";

interface ErrorMessageProps {
  message: ChatMessage;
  onRetry?: () => void;
}

const KIND_ICON: Record<
  NonNullable<ChatMessage["errorKind"]>,
  React.ComponentType<{ className?: string }>
> = {
  rate_limit: Gauge,
  timeout: Clock,
  context_length: AlertTriangle,
  auth: KeyRound,
  connection: WifiOff,
  generic: AlertCircle,
};

const KIND_HINT: Record<NonNullable<ChatMessage["errorKind"]>, string> = {
  rate_limit: "The AI provider is throttling requests. Wait a few seconds before retrying.",
  timeout: "The model may still be loading. Retrying usually works within a few seconds.",
  context_length: "Try starting a new chat or removing some attached context.",
  auth: "Check that valid API credentials are configured for the selected model.",
  connection: "Check your network connection and that the backend is reachable.",
  generic: "An unexpected error occurred.",
};

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const [showDetail, setShowDetail] = useState(false);

  const kind = message.errorKind || "generic";
  const Icon = KIND_ICON[kind] || KIND_ICON.generic;
  const title = message.errorTitle || "Something went wrong";
  const detail = message.errorDetail || message.content || "";
  const errorCode = message.errorCode;
  const canRetry = message.canRetry !== false;
  const hint = KIND_HINT[kind];

  return (
    <div className="my-1 px-1">
      <Alert variant="destructive" className="py-2.5 px-3">
        <Icon className="size-4" />
        <AlertTitle className="flex items-center gap-2 flex-wrap text-sm">
          {title}
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal uppercase tracking-wide">
            {kind.replace("_", " ")}
          </Badge>
          {errorCode && (
            <span className="text-[10px] text-muted-foreground/70 font-mono">
              code {errorCode}
            </span>
          )}
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed">
          <p>{hint}</p>
          {detail && detail !== hint && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setShowDetail(v => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                {showDetail ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                {showDetail ? "Hide details" : "Show details"}
              </button>
              {showDetail && (
                <pre className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground bg-muted/50 border border-border rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  {detail}
                </pre>
              )}
            </div>
          )}
          {canRetry && onRetry && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={onRetry}
              >
                <RefreshCw className="size-3" />
                Retry
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default ErrorMessage;
