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

// ---------------------------------------------------------------------------
// Tool category → color mapping (for left strip + header stripes)
// ---------------------------------------------------------------------------
export type ToolCategory =
  | "command" | "file" | "database" | "web" | "canvas" | "todo" | "generic";

export const toolCategoryColors: Record<
  ToolCategory,
  { strip: string; stripe: string; bg: string; icon: string }
> = {
  command:  { strip: "bg-orange-500",   stripe: "rgba(249, 115, 22, 0.10)",  bg: "bg-orange-500/5",   icon: "text-orange-500" },
  file:     { strip: "bg-blue-500",     stripe: "rgba(59, 130, 246, 0.10)",  bg: "bg-blue-500/5",     icon: "text-blue-500" },
  database: { strip: "bg-purple-500",   stripe: "rgba(168, 85, 247, 0.10)",  bg: "bg-purple-500/5",   icon: "text-purple-500" },
  web:      { strip: "bg-cyan-500",     stripe: "rgba(6, 182, 212, 0.10)",   bg: "bg-cyan-500/5",     icon: "text-cyan-500" },
  canvas:   { strip: "bg-emerald-500",  stripe: "rgba(16, 185, 129, 0.10)",  bg: "bg-emerald-500/5",  icon: "text-emerald-500" },
  todo:     { strip: "bg-pink-500",     stripe: "rgba(236, 72, 153, 0.10)",  bg: "bg-pink-500/5",     icon: "text-pink-500" },
  generic:  { strip: "bg-muted-foreground", stripe: "rgba(107, 114, 128, 0.08)", bg: "bg-muted/30",    icon: "text-muted-foreground" },
};

export function categorizeTool(toolName: string): ToolCategory {
  if (toolName === "run_command") return "command";
  if (["read_file", "edit_file", "write_file", "list_directory", "notebook_edit", "lsp_tool"].includes(toolName)) return "file";
  if (["query_entrez_database", "bio_query", "query_bio_database"].includes(toolName)) return "database";
  if (["web_search", "web_fetch"].includes(toolName)) return "web";
  if (toolName.startsWith("canvas_")) return "canvas";
  if (toolName === "todo_write") return "todo";
  return "generic";
}

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("group not-prose mb-1 w-full rounded-md border overflow-hidden", className)}
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

  // --- Color-coded strip by tool category ---
  const category = toolName ? categorizeTool(toolName) : "generic";
  const colors = toolCategoryColors[category];
  const isRunning = state === "input-available" || state === "input-streaming";

  return (
    <CollapsibleTrigger
      asChild
    >
      <div
        className={cn(
          "flex w-full items-center justify-between gap-2 p-2 cursor-pointer relative overflow-hidden",
          colors.bg,
          className
        )}
        style={{
          backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 6px, ${colors.stripe} 6px, ${colors.stripe} 12px)`,
          backgroundSize: "200% 100%",
        }}
        {...props}
      >
        {/* Left color strip */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", colors.strip)} />
        <div className="flex items-center gap-1.5 min-w-0 pl-1">
          <WrenchIcon className={cn("size-3.5 shrink-0", colors.icon)} />
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
