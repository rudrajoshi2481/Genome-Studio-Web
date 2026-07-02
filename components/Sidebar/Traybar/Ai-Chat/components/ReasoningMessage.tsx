"use client";

import React, { useState, useEffect } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Message } from "./chatStore";

interface ReasoningMessageProps {
  message: Message;
}

function ReasoningMessage({ message }: ReasoningMessageProps) {
  const isStreaming = message.reasoning?.isStreaming ?? message.isStreaming ?? false;
  const orderedSteps = (message.reasoning?.orderedSteps || []).filter(
    (s) => (s.kind === "text" ? s.text.trim().length > 0 : true)
  );

  const reasoningContent = (message.reasoning?.content || message.content || "").trim();
  const textSteps = reasoningContent
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const hasContent =
    orderedSteps.some((s) => s.kind === "text" && s.text.trim()) || textSteps.length > 0;

  const startedAt = message.reasoning?.startedAt;
  const storedDuration = message.reasoning?.duration;
  const [elapsed, setElapsed] = useState(() => {
    if (storedDuration != null) return storedDuration;
    if (startedAt != null) return Math.floor((Date.now() - startedAt) / 1000);
    return 0;
  });
  const [isOpen, setIsOpen] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      const startTime = startedAt ?? Date.now();
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else if (storedDuration != null) {
      setElapsed(storedDuration);
    }
  }, [isStreaming, startedAt, storedDuration]);

  useEffect(() => {
    setIsOpen(isStreaming);
  }, [isStreaming]);

  if (!hasContent) {
    return null;
  }

  return (
    <div className="px-3 py-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {isOpen ? (
          <ChevronDown className="size-3 shrink-0" />
        ) : (
          <ChevronRight className="size-3 shrink-0" />
        )}
        <Brain className="size-3 shrink-0 text-muted-foreground" />
        {isStreaming ? (
          <span className="font-medium animate-pulse text-muted-foreground">Reasoning</span>
        ) : (
          <span className="font-medium text-muted-foreground">Reasoning</span>
        )}
        {elapsed > 0 && (
          <span className="text-muted-foreground/50 tabular-nums">{elapsed}s</span>
        )}
      </button>
      {isOpen && (
        <div className="mt-1 ml-4 pl-2 border-l border-border/50 space-y-1">
          {orderedSteps.length > 0 ? (
            orderedSteps.map((step, idx) => {
              if (step.kind === "text") {
                const lines = step.text.split("\n").map((s) => s.trim()).filter(Boolean);
                return lines.map((line, lineIdx) => (
                  <div
                    key={`${step.id}-${lineIdx}`}
                    className={cn(
                      "text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5",
                    )}
                  >
<span>{line}</span>
                  </div>
                ));
              }
              return null;
            })
          ) : (
            textSteps.map((step, idx) => (
              <div
                key={`reasoning-${idx}`}
                className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5"
              >
<span>{step}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ReasoningMessage;
