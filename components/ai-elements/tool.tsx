"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("group not-prose mb-1 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  command?: string;
  filePath?: string;
  actions?: ReactNode;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

const statusLabels: Record<ToolPart["state"], string> = {
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Responded",
  "input-available": "Running",
  "input-streaming": "Pending",
  "output-available": "Completed",
  "output-denied": "Denied",
  "output-error": "Error",
};

const statusIcons: Record<ToolPart["state"], ReactNode> = {
  "approval-requested": <ClockIcon className="size-3 text-yellow-600" />,
  "approval-responded": <CheckCircleIcon className="size-3 text-blue-600" />,
  "input-available": <ClockIcon className="size-3 animate-pulse" />,
  "input-streaming": <CircleIcon className="size-3" />,
  "output-available": <CheckCircleIcon className="size-3 text-green-600" />,
  "output-denied": <XCircleIcon className="size-3 text-orange-600" />,
  "output-error": <XCircleIcon className="size-3 text-red-600" />,
};

export const getStatusBadge = (status: ToolPart["state"]) => (
  <Badge className="gap-1 rounded-full text-[10px]" variant="secondary">
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

export const ToolHeader = ({
  className,
  title,
  command,
  filePath,
  actions,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  const fileParts = filePath ? (() => {
    const parts = filePath.split("/");
    const name = parts[parts.length - 1] || filePath;
    const dir = parts.slice(0, -1).join("/");
    return { name, dir };
  })() : null;

  return (
    <CollapsibleTrigger
      asChild
    >
      <div
        className={cn(
          "flex w-full items-center justify-between gap-2 p-2 cursor-pointer",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <WrenchIcon className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-bold text-xs shrink-0">{title ?? derivedName}</span>
          {command && (() => {
            const isPath = command.startsWith("/") || command.startsWith("./") || command.startsWith("~/");
            return isPath ? (
              <span dir="rtl" className="font-mono text-xs text-muted-foreground truncate min-w-0 max-w-[60%]">
                <span dir="ltr" className="inline-block">{command}</span>
              </span>
            ) : (
              <span className="font-mono text-xs text-muted-foreground truncate">{command}</span>
            );
          })()}
          {fileParts && (
            <span className="flex items-center gap-0.5 min-w-0 max-w-[60%]">
              {fileParts.dir && (
                <span dir="rtl" className="font-mono text-xs text-muted-foreground truncate min-w-0">
                  <span dir="ltr" className="inline-block">{fileParts.dir}/</span>
                </span>
              )}
              <span className="font-mono text-xs text-foreground/70 truncate shrink-0">{fileParts.name}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(state)}
          {actions}
          <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </div>
      </div>
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-2 p-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-1 overflow-hidden", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs p-2">
        {output}
      </pre>
    );
  }

  return (
    <div className={cn("space-y-1", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
