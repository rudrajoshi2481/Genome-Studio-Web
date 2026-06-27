"use client";

import React from 'react';
import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanTrigger,
  PlanAction,
} from '@/components/ai-elements/plan';
import {
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Message } from './chatStore';

interface PlanMessageProps {
  message: Message;
}

function PlanMessage({ message }: PlanMessageProps) {
  const plan = message.plan;
  if (!plan) return null;

  const getStepIcon = (status?: string) => {
    if (status === 'complete') return CheckCircle2;
    if (status === 'active') return Loader2;
    return Circle;
  };

  return (
    <div className="px-3 py-1">
      <Plan isStreaming={plan.isStreaming} className="w-full">
        <PlanHeader className="p-3">
          <div className="space-y-0.5">
            <PlanTitle className="text-xs">{plan.title}</PlanTitle>
            {plan.description && <PlanDescription className="text-xs">{plan.description}</PlanDescription>}
          </div>
          <PlanAction>
            <PlanTrigger className="size-7" />
          </PlanAction>
        </PlanHeader>
        {plan.steps && plan.steps.length > 0 && (
          <PlanContent className="p-3 pt-0">
            <div className="space-y-1.5">
              {plan.steps.map((step, idx) => {
                const Icon = getStepIcon(step.status);
                return (
                  <ChainOfThoughtStep
                    key={idx}
                    icon={Icon}
                    label={step.label}
                    description={step.description}
                    status={step.status as 'complete' | 'active' | 'pending'}
                  />
                );
              })}
            </div>
          </PlanContent>
        )}
      </Plan>
    </div>
  );
}

export default PlanMessage;
