"use client";

import React from 'react';
import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
} from '@/components/ai-elements/confirmation';
import { Button } from '@/components/ui/button';
import { Check, X, ChevronDown, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Message } from './chatStore';

interface ConfirmationMessageProps {
  message: Message;
  onApprove?: (toolName: string, approved: boolean, reason?: string, approvalMode?: 'once' | 'always' | 'lytic') => void;
  onRespond?: (toolMessageId: string, response: string) => void;
}

function ConfirmationMessage({ message, onApprove, onRespond }: ConfirmationMessageProps) {
  const conf = message.confirmation;
  if (!conf) return null;

  const isAskUserQuestion = conf.toolName === 'ask_user_question';
  const options: string[] = isAskUserQuestion && conf.toolArgs?.options ? conf.toolArgs.options : [];
  const toolMessageId = message.metadata?.toolMessageId || message.id;

  return (
    <div className="px-1 py-1">
      <Confirmation
        state={conf.state as any}
        approval={conf.approved !== undefined ? { id: message.id, approved: conf.approved, reason: conf.reason } : { id: message.id }}
        className="w-full p-2.5"
      >
        <ConfirmationTitle>
          <span className="font-medium text-xs">{conf.toolName}</span>
          {conf.toolArgs && Object.keys(conf.toolArgs).length > 0 && !isAskUserQuestion && (
            <code className="ml-1.5 px-1 py-0 rounded bg-muted text-[10px] font-mono">
              {JSON.stringify(conf.toolArgs)}
            </code>
          )}
        </ConfirmationTitle>
        <ConfirmationRequest>
          {isAskUserQuestion ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">{conf.toolArgs?.question || message.content}</p>
              {options.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      className="h-7 px-2.5 text-xs rounded-md border bg-background hover:bg-accent transition-colors"
                      onClick={() => onRespond?.(toolMessageId, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  className="flex h-7 w-full rounded-md border bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
                  placeholder="Type your response..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      onRespond?.(toolMessageId, e.currentTarget.value.trim());
                      e.currentTarget.value = '';
                    }
                  }}
                />
              )}
            </div>
          ) : (
            <ConfirmationApprovalButtons
              toolName={conf.toolName}
              onApprove={onApprove}
            />
          )}
        </ConfirmationRequest>
        <ConfirmationAccepted>
          <p className="text-xs text-green-600 dark:text-green-400">Approved</p>
        </ConfirmationAccepted>
        <ConfirmationRejected>
          <p className="text-xs text-red-600 dark:text-red-400">
            Rejected{conf.reason ? `: ${conf.reason}` : ''}
          </p>
        </ConfirmationRejected>
      </Confirmation>
    </div>
  );
}

export default ConfirmationMessage;


function ConfirmationApprovalButtons({ toolName, onApprove }: {
  toolName: string;
  onApprove?: (toolName: string, approved: boolean, reason?: string, approvalMode?: 'once' | 'always' | 'lytic') => void;
}) {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <div className="flex items-center gap-1.5" ref={dropdownRef}>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs gap-1"
        onClick={() => onApprove?.(toolName, false)}
      >
        <X className="size-3" />
        Decline
      </Button>
      <div className="relative">
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs gap-1"
          onClick={() => onApprove?.(toolName, true, undefined, 'once')}
        >
          <Check className="size-3" />
          Accept
        </Button>
        <button
          className="absolute right-0 top-0 bottom-0 px-1 hover:bg-primary/20 rounded-r-md transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          type="button"
          aria-label="More approval options"
        >
          <ChevronDown className="size-3" />
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-8 z-50 w-44 rounded-md border bg-popover shadow-md py-1">
            <button
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-left"
              onClick={() => {
                setShowDropdown(false);
                onApprove?.(toolName, true, undefined, 'once');
              }}
            >
              <CheckCircle2 className="size-3.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium">Just once</span>
                <span className="text-[10px] text-muted-foreground">Ask again next time</span>
              </div>
            </button>
            <button
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-left"
              onClick={() => {
                setShowDropdown(false);
                onApprove?.(toolName, true, undefined, 'always');
              }}
            >
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium">Always allow</span>
                <span className="text-[10px] text-muted-foreground">Auto-approve this tool</span>
              </div>
            </button>
            <div className="border-t my-0.5" />
            <button
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-left"
              onClick={() => {
                setShowDropdown(false);
                onApprove?.(toolName, true, undefined, 'lytic');
              }}
            >
              <Zap className="size-3.5 text-orange-500" />
              <div className="flex flex-col">
                <span className="font-medium text-orange-600 dark:text-orange-400">Lytic mode</span>
                <span className="text-[10px] text-muted-foreground">Auto-approve everything</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
