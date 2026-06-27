"use client";

import React from 'react';
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought';
import { Message } from './chatStore';

interface ReasoningMessageProps {
  message: Message;
}

function ReasoningMessage({ message }: ReasoningMessageProps) {
  const isStreaming = message.reasoning?.isStreaming ?? message.isStreaming ?? false;
  const orderedSteps = (message.reasoning?.orderedSteps || []).filter(
    s => s.kind === 'text' ? s.text.trim().length > 0 : true
  );

  // Fallback to content-based text steps if orderedSteps not available
  const reasoningContent = (message.reasoning?.content || message.content || '').trim();
  const textSteps = reasoningContent
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const hasContent = orderedSteps.some(s => s.kind === 'text' && s.text.trim()) || textSteps.length > 0;

  if (!hasContent) {
    return null;
  }

  const showStreaming = isStreaming;

  // Track elapsed seconds while thinking
  const [elapsed, setElapsed] = React.useState(0);
  const startRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (showStreaming) {
      if (startRef.current === null) {
        startRef.current = Date.now();
      }
      const interval = setInterval(() => {
        if (startRef.current !== null) {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      if (startRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }
  }, [showStreaming]);

  // Auto-collapse when streaming finishes, but let user toggle manually
  const [isOpen, setIsOpen] = React.useState(showStreaming);
  React.useEffect(() => {
    if (showStreaming) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [showStreaming]);

  const lastStepIdx = orderedSteps.length > 0 ? orderedSteps.length - 1 : -1;

  return (
    <div className="px-3 py-0.5">
      <ChainOfThought open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
        <ChainOfThoughtHeader className="text-xs">
          {showStreaming ? `Thinking... ${elapsed}s` : `Thinking ${elapsed}s`}
        </ChainOfThoughtHeader>
        <ChainOfThoughtContent className="mt-1 space-y-1.5">
          {orderedSteps.length > 0 ? (
            orderedSteps.map((step, idx) => {
              if (step.kind === 'text') {
                const lines = step.text.split('\n').map(s => s.trim()).filter(Boolean);
                return lines.map((line, lineIdx) => (
                  <ChainOfThoughtStep
                    key={`${step.id}-${lineIdx}`}
                    label={line}
                    status={showStreaming && idx === lastStepIdx && lineIdx === lines.length - 1 ? 'active' : 'complete'}
                  />
                ));
              }
              return null;
            })
          ) : (
            textSteps.map((step, idx) => (
              <ChainOfThoughtStep
                key={`reasoning-${idx}`}
                label={step}
                status={isStreaming && idx === textSteps.length - 1 ? 'active' : 'complete'}
              />
            ))
          )}
        </ChainOfThoughtContent>
      </ChainOfThought>
    </div>
  );
}

export default ReasoningMessage;
