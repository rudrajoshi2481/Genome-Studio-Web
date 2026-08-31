"use client";

import React from 'react';
import { ListTodo } from 'lucide-react';
import { Message } from './chatStore';

interface PlanMessageProps {
  message: Message;
}

function PlanMessage({ message }: PlanMessageProps) {
  const plan = message.plan;
  if (!plan) return null;

  return (
    <div className="px-1 py-0.5">
      <div className="flex items-start gap-1.5">
        <ListTodo className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="text-sm font-medium leading-tight">{plan.title}</span>
          {plan.description && (
            <span className="text-sm text-muted-foreground leading-tight font-sans">{plan.description}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlanMessage;
