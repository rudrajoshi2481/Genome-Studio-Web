"use client";

import React, { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CheckCircle2, Circle, Loader2, ChevronsUpDown, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from './chatStore';

interface PlanMessageProps {
  message: Message;
}

function PlanMessage({ message }: PlanMessageProps) {
  const plan = message.plan;
  const [isOpen, setIsOpen] = useState(true);
  if (!plan) return null;

  const getStepIcon = (status?: string) => {
    if (status === 'complete') return CheckCircle2;
    if (status === 'active') return Loader2;
    return Circle;
  };

  return (
    <div className="px-3 py-1">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold truncate">{plan.title}</span>
            {plan.description && (
              <span className="text-xs text-muted-foreground truncate">{plan.description}</span>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <button
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Toggle plan"
            >
              <ChevronsUpDown className="size-3" />
            </button>
          </CollapsibleTrigger>
        </div>
        {plan.steps && plan.steps.length > 0 && (
          <CollapsibleContent>
            <div className="mt-1 ml-1 pl-2 border-l border-border/40 space-y-1.5">
              {plan.steps.map((step, idx) => {
                const Icon = getStepIcon(step.status);
                return (
                  <div key={idx} className="flex items-start gap-1.5">
                    <Icon
                      className={cn(
                        "size-3 shrink-0 mt-0.5",
                        step.status === 'complete' && "text-green-600",
                        step.status === 'active' && "text-primary animate-spin",
                        (!step.status || step.status === 'pending') && "text-muted-foreground"
                      )}
                    />
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium leading-tight">{step.label}</span>
                        {step.toolName && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono px-1 py-px">
                            <Wrench className="size-2.5" />
                            {step.toolName}
                          </span>
                        )}
                      </div>
                      {step.description && (
                        <span className="text-xs text-muted-foreground leading-tight">{step.description}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export default PlanMessage;
