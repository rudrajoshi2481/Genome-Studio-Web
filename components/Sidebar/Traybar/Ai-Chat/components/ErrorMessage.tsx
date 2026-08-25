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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Message as ChatMessage } from "./chatStore";

interface ErrorMessageProps {
  message: ChatMessage;
  onRetry?: () => void;
}

const KIND_CONFIG: Record<
  NonNullable<ChatMessage["errorKind"]>,
  { icon: React.ComponentType<{ className?: string }>; tone: string; ring: string; iconColor: string }
> = {
  rate_limit: {
    icon: Gauge,
    tone: "bg-amber-500/10 border-amber-500/25 dark:border-amber-400/20",
    ring: "ring-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  timeout: {
    icon: Clock,
    tone: "bg-orange-500/10 border-orange-500/25 dark:border-orange-400/20",
    ring: "ring-orange-500/20",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  context_length: {
    icon: AlertTriangle,
    tone: "bg-violet-500/10 border-violet-500/25 dark:border-violet-400/20",
    ring: "ring-violet-500/20",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  auth: {
    icon: KeyRound,
    tone: "bg-rose-500/10 border-rose-500/25 dark:border-rose-400/20",
    ring: "ring-rose-500/20",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  connection: {
    icon: WifiOff,
    tone: "bg-sky-500/10 border-sky-500/25 dark:border-sky-400/20",
    ring: "ring-sky-500/20",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  generic: {
    icon: AlertCircle,
    tone: "bg-red-500/10 border-red-500/25 dark:border-red-400/20",
    ring: "ring-red-500/20",
    iconColor: "text-red-600 dark:text-red-400",
  },
};

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const kind = message.errorKind || "generic";
  const cfg = KIND_CONFIG[kind] || KIND_CONFIG.generic;
  const Icon = cfg.icon;
  const title = message.errorTitle || "Something went wrong";
  const detail = message.errorDetail || message.content || "";
  const canRetry = message.canRetry !== false;

  const handleRetry = () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      onRetry();
    } finally {
      // Reset after a beat so the spinner is visible briefly
      setTimeout(() => setRetrying(false), 1200);
    }
  };

  // For rate-limit errors, show a friendly hint about waiting
  const hint =
    kind === "rate_limit"
      ? "The AI provider is throttling requests. Wait a few seconds before retrying."
      : kind === "timeout"
        ? "The model may still be loading. Retrying usually works within a few seconds."
        : kind === "context_length"
          ? "Try starting a new chat or removing some attached context."
          : kind === "auth"
            ? "Check that valid API credentials are configured for the selected model."
            : kind === "connection"
              ? "Check your network connection and that the backend is reachable."
              : null;

  return (
    <div className="my-1 px-1">
      <div className={cn("rounded-lg border px-3 py-2.5 flex gap-2.5 items-start", cfg.tone)}>
        <Icon className={cn("size-4 mt-0.5 shrink-0", cfg.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{title}</span>
            <span className={cn("text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded", cfg.iconColor, "bg-transparent border border-current/30")}>
              {kind.replace("_", " ")}
            </span>
          </div>
          {hint && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{hint}</p>
          )}
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
                <pre className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground bg-background/60 border border-border/40 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-words font-mono">
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
                onClick={handleRetry}
                disabled={retrying}
              >
                <RefreshCw className={cn("size-3", retrying && "animate-spin")} />
                {retrying ? "Retrying…" : "Retry"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorMessage;
