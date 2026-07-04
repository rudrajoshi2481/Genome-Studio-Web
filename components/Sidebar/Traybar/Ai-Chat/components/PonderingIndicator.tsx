"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type SpinnerMode = "requesting" | "responding" | "thinking" | "tool-use";

const PONDERING_VERBS = [
  "Aligning",
  "Amplifying",
  "Annealing",
  "Assembling",
  "BLASTing",
  "Base-calling",
  "Bootstrapping",
  "Brewing",
  "Calibrating",
  "Calling",
  "Clauding",
  "Clustering",
  "Cogitating",
  "Composing",
  "Computing",
  "Contemplating",
  "Cooking",
  "Crunching",
  "Decoding",
  "Deciphering",
  "Delineating",
  "Denoising",
  "Differencing",
  "Digesting",
  "Disentangling",
  "Distilling",
  "Elucidating",
  "Extrapolating",
  "Filtering",
  "Fishing",
  "Forging",
  "Fragmenting",
  "Genotyping",
  "Hatching",
  "Ideating",
  "Imputing",
  "Incubating",
  "Inferring",
  "Iterating",
  "Ligating",
  "Mulling",
  "Mapping",
  "Musing",
  "Normalizing",
  "Orchestrating",
  "Pondering",
  "Percolating",
  "Phasing",
  "Pipelining",
  "Polymerizing",
  "Processing",
  "Quantifying",
  "Querying",
  "Reasoning",
  "Resolving",
  "Reticulating",
  "Scaffolding",
  "Sequencing",
  "Simmering",
  "Splicing",
  "Synthesizing",
  "Thinking",
  "Transcribing",
  "Translating",
  "Trimming",
  "Unwinding",
  "Variant-calling",
  "Wrangling",
];

const VERB_SWITCH_MS = 5000;

interface PonderingIndicatorProps {
  verb?: string;
  compact?: boolean;
  className?: string;
  mode?: SpinnerMode;
}

export function PonderingIndicator({
  verb,
  compact = false,
  className,
  mode = "requesting",
}: PonderingIndicatorProps) {
  const [verbIdx, setVerbIdx] = useState(() => Math.floor(Math.random() * PONDERING_VERBS.length));
  const lastSwitchRef = useRef(Date.now());

  useEffect(() => {
    const verbInterval = setInterval(() => {
      if (Date.now() - lastSwitchRef.current >= VERB_SWITCH_MS) {
        lastSwitchRef.current = Date.now();
        setVerbIdx((prev) => {
          let next = prev;
          while (next === prev && PONDERING_VERBS.length > 1) {
            next = Math.floor(Math.random() * PONDERING_VERBS.length);
          }
          return next;
        });
      }
    }, 500);

    return () => clearInterval(verbInterval);
  }, []);

  const displayVerb = verb || PONDERING_VERBS[verbIdx];

  return (
    <div className={cn("flex items-center gap-1.5 ml-3", className)}>
      <span className={cn("text-sm text-muted-foreground/50 font-source-sans")}>
        {displayVerb}
      </span>
      <span className="inline-flex gap-0.5 text-muted-foreground/30 font-source-sans" style={{ fontSize: "1rem", lineHeight: 1 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              animation: `pondering-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          >
            .
          </span>
        ))}
      </span>
    </div>
  );
}

interface ThinkingBadgeProps {
  durationSeconds?: number | null;
  className?: string;
}

export function ThinkingBadge({ durationSeconds, className }: ThinkingBadgeProps) {
  if (durationSeconds === null || durationSeconds === undefined) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-sm italic text-muted-foreground/70 font-source-sans",
          className
        )}
      >
        <span className="inline-block size-1 rounded-full bg-muted-foreground/60 animate-pulse" />
        thinking…
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm italic text-muted-foreground/50 font-source-sans",
        className
      )}
    >
      <span className="inline-block size-1 rounded-full bg-muted-foreground/40" />
      thought for {durationSeconds}s
    </span>
  );
}

