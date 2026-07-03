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

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const STALL_THRESHOLD_MS = 3000;
const STALL_FADE_MS = 2000;
const SHOW_TOKENS_AFTER_MS = 30_000;
const SHOW_TIP_AFTER_MS = 30_000;

const TIPS = [
  "You can @mention files, databases, and tools in your message",
  "Use /commands for quick actions — try /clear to start fresh",
  "Pin frequently used models for faster access",
  "Queue multiple messages while the AI is working — they'll send in order",
  "Enable databases like PubMed to ground responses in literature",
];

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

function useSmoothCounter(target: number, durationMs = 400): number {
  const [displayed, setDisplayed] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === displayed) return;
    fromRef.current = displayed;
    startRef.current = null;
    const from = fromRef.current;
    const diff = target - from;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(from + diff * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, displayed]);

  return displayed;
}

function useStalledDetection(mode: SpinnerMode, hasActiveTools: boolean) {
  const [stalledIntensity, setStalledIntensity] = useState(0);
  const lastTickRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    lastTickRef.current = Date.now();
    setStalledIntensity(0);
  }, [mode]);

  useEffect(() => {
    if (mode !== "responding" || hasActiveTools) {
      setStalledIntensity(0);
      return;
    }

    const check = () => {
      const timeSinceLastTick = Date.now() - lastTickRef.current;
      lastTickRef.current = Date.now();

      if (timeSinceLastTick > 500) {
        const stalledFor = timeSinceLastTick;
        if (stalledFor > STALL_THRESHOLD_MS) {
          const intensity = Math.min((stalledFor - STALL_THRESHOLD_MS) / STALL_FADE_MS, 1);
          setStalledIntensity(intensity);
        } else {
          setStalledIntensity(0);
        }
      }
    };

    const interval = setInterval(check, 200);
    return () => clearInterval(interval);
  }, [mode, hasActiveTools]);

  const isStalled = stalledIntensity > 0.01;
  return { isStalled, stalledIntensity };
}

function SpinnerGlyph({ mode, stalledIntensity }: { mode: SpinnerMode; stalledIntensity: number }) {
  const isUp = mode === "requesting";
  const colorClass =
    stalledIntensity > 0.3
      ? "text-orange-500 dark:text-orange-400"
      : "text-muted-foreground/50";

  return (
    <span className={cn("inline-flex w-4 justify-center text-xs", colorClass)}>
      {isUp ? "↑" : "↓"}
    </span>
  );
}

function GlimmerText({
  text,
  mode,
  stalledIntensity,
  className,
}: {
  text: string;
  mode: SpinnerMode;
  stalledIntensity: number;
  className?: string;
}) {
  const [phase, setPhase] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const speed = mode === "requesting" ? 50 : 200;
    let acc = 0;

    const tick = (now: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      acc += dt;
      if (acc >= speed) {
        setPhase((p) => p + Math.floor(acc / speed));
        acc = acc % speed;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = 0;
    };
  }, [mode]);

  const textWidth = text.length;
  const cycleLength = textWidth + 20;
  const glimmerPos = phase % cycleLength;

  const isStalled = stalledIntensity > 0.3;
  const baseColor = isStalled
    ? "rgb(249 115 22)"
    : "rgb(100 116 139)";
  const shimmerColor = isStalled
    ? "rgb(251 146 60)"
    : "rgb(99 102 241)";

  const chars = text.split("").map((char, i) => {
    const distance = Math.abs(i - glimmerPos);
    const shimmerWidth = 8;
    if (distance < shimmerWidth) {
      const t = 1 - distance / shimmerWidth;
      const r = Math.round(Number(baseColor.match(/\d+/g)![0]) * (1 - t) + Number(shimmerColor.match(/\d+/g)![0]) * t);
      const g = Math.round(Number(baseColor.match(/\d+/g)![1]) * (1 - t) + Number(shimmerColor.match(/\d+/g)![1]) * t);
      const b = Math.round(Number(baseColor.match(/\d+/g)![2]) * (1 - t) + Number(shimmerColor.match(/\d+/g)![2]) * t);
      return (
        <span key={i} style={{ color: `rgb(${r} ${g} ${b})` }}>
          {char}
        </span>
      );
    }
    return (
      <span key={i} style={{ color: baseColor }}>
        {char}
      </span>
    );
  });

  return <span className={cn("font-source-sans", className)}>{chars}</span>;
}

interface PonderingIndicatorProps {
  verb?: string;
  showTimer?: boolean;
  tokenCount?: number;
  compact?: boolean;
  className?: string;
  mode?: SpinnerMode;
  hasActiveTools?: boolean;
  startTime?: number;
}

export function PonderingIndicator({
  verb,
  showTimer = true,
  tokenCount,
  compact = false,
  className,
  mode = "requesting",
  hasActiveTools = false,
  startTime,
}: PonderingIndicatorProps) {
  const [randomVerb] = useState(() => {
    const idx = Math.floor(Math.random() * PONDERING_VERBS.length);
    return PONDERING_VERBS[idx];
  });
  const [frameIdx, setFrameIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const startTimeRef = useRef(startTime ?? Date.now());
  const shownTipRef = useRef(false);

  useEffect(() => {
    if (startTime) startTimeRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    const frameInterval = setInterval(() => {
      setFrameIdx((f) => (f + 1) % FRAMES.length);
    }, 80);

    const timerInterval = setInterval(() => {
      const ms = Date.now() - startTimeRef.current;
      setElapsed(ms);
    }, 1000);

    return () => {
      clearInterval(frameInterval);
      clearInterval(timerInterval);
    };
  }, []);

  const { isStalled, stalledIntensity } = useStalledDetection(mode, hasActiveTools);
  const smoothTokenCount = useSmoothCounter(tokenCount ?? 0);
  const displayVerb = verb || randomVerb;
  const timerText = formatDuration(elapsed);
  const showTokens = (tokenCount !== undefined && tokenCount > 0) || elapsed > SHOW_TOKENS_AFTER_MS;
  const showTip = elapsed > SHOW_TIP_AFTER_MS && !shownTipRef.current;

  useEffect(() => {
    if (showTip) {
      shownTipRef.current = true;
      const tipTimer = setInterval(() => {
        setTipIdx((i) => (i + 1) % TIPS.length);
      }, 15000);
      return () => clearInterval(tipTimer);
    }
  }, [showTip]);

  const spinnerColorClass = isStalled
    ? stalledIntensity > 0.5
      ? "text-orange-500 dark:text-orange-400"
      : "text-orange-400 dark:text-orange-500/80"
    : "text-muted-foreground";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 text-sm text-muted-foreground font-source-sans", className)}>
        <span className={cn("font-mono text-sm", spinnerColorClass)}>
          {FRAMES[frameIdx]}
        </span>
        <GlimmerText text={displayVerb} mode={mode} stalledIntensity={stalledIntensity} />
        <span className="text-muted-foreground/40">…</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5 py-1.5 px-1", className)}>
      <div className="flex items-center gap-2">
        <span className={cn("font-mono text-base", spinnerColorClass)}>
          {FRAMES[frameIdx]}
        </span>
        <GlimmerText
          text={displayVerb}
          mode={mode}
          stalledIntensity={stalledIntensity}
          className="text-sm font-medium"
        />
        <span className="text-muted-foreground/40">…</span>
        {showTimer && elapsed > 0 && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-xs text-muted-foreground/60 tabular-nums font-source-sans">{timerText}</span>
          </>
        )}
        {showTokens && smoothTokenCount > 0 && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground/60 tabular-nums font-source-sans">
              <SpinnerGlyph mode={mode} stalledIntensity={stalledIntensity} />
              {smoothTokenCount.toLocaleString()} tokens
            </span>
          </>
        )}
      </div>
      {showTip && (
        <div className="text-xs text-muted-foreground/40 pl-7 pt-0.5 font-source-sans">
          Tip: {TIPS[tipIdx]}
        </div>
      )}
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

export { PONDERING_VERBS };
