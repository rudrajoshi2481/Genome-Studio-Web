"use client";

import React from 'react';
import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from '@/components/ai-elements/confirmation';
import { Message } from './chatStore';

interface ConfirmationMessageProps {
  message: Message;
  onApprove?: (toolName: string, approved: boolean, reason?: string) => void;
}

function ConfirmationMessage({ message, onApprove }: ConfirmationMessageProps) {
  const conf = message.confirmation;
  if (!conf) return null;

  return (
    <div className="px-3 py-1">
      <Confirmation
        state={conf.state as any}
        approval={conf.approved !== undefined ? { id: message.id, approved: conf.approved, reason: conf.reason } : { id: message.id }}
        className="w-full p-2.5"
      >
        <ConfirmationTitle>
          <span className="font-medium text-xs">{conf.toolName}</span>
          {conf.toolArgs && Object.keys(conf.toolArgs).length > 0 && (
            <code className="ml-1.5 px-1 py-0 rounded bg-muted text-[10px] font-mono">
              {JSON.stringify(conf.toolArgs)}
            </code>
          )}
        </ConfirmationTitle>
        <ConfirmationRequest>
          <ConfirmationActions className="gap-1.5">
            <ConfirmationAction
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => onApprove?.(conf.toolName, false)}
            >
              Reject
            </ConfirmationAction>
            <ConfirmationAction
              className="h-7 px-2.5 text-xs"
              onClick={() => onApprove?.(conf.toolName, true)}
            >
              Approve
            </ConfirmationAction>
          </ConfirmationActions>
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
