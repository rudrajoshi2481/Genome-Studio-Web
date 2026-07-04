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

  const [isOpen, setIsOpen] = useState(isStreaming);

  useEffect(() => {
    setIsOpen(isStreaming);
  }, [isStreaming]);

  if (!hasContent) {
    return null;
  }

  return (
    <div className="px-1 py-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground/70 hover:text-muted-foreground transition-colors w-full py-0.5"
      >
        {isOpen ? (
          <ChevronDown className="size-3 shrink-0" />
        ) : (
          <ChevronRight className="size-3 shrink-0" />
        )}
        <Brain className="size-3 shrink-0 text-muted-foreground/70" />
        <span className="font-medium text-muted-foreground/70 text-sm">Reasoning</span>
      </button>
      {isOpen && (
        <div className="mt-1.5 ml-4 pl-2.5 border-l border-border/40 space-y-1.5">
          {orderedSteps.length > 0 ? (
            orderedSteps.map((step, idx) => {
              if (step.kind === "text") {
                const lines = step.text.split("\n").map((s) => s.trim()).filter(Boolean);
                return lines.map((line, lineIdx) => (
                  <div
                    key={`${step.id}-${lineIdx}`}
                    className={cn(
                      "text-sm text-muted-foreground/80 leading-relaxed font-source-sans",
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
                className="text-sm text-muted-foreground/80 leading-relaxed font-source-sans"
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
