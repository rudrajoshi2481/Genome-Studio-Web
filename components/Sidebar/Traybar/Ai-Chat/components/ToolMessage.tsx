"use client";

import React, { useState, useCallback } from "react";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import { Check, X, ChevronDown, Zap, ShieldCheck, CheckCircle2, Copy, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Message } from "./chatStore";
import AgentTaskPanel from "./AgentTaskPanel";
import type { QueueTodoItem } from "./chatStore";

interface ToolMessageProps {
  message: Message;
  isLast?: boolean;
  onStopCommand?: (toolMessageId: string) => void;
  onApprove?: (id: string, approvalMode?: 'once' | 'always' | 'lytic') => void;
  onReject?: (id: string) => void;
}

function ToolMessage({ message, isLast, onStopCommand, onApprove, onReject }: ToolMessageProps) {
  const toolName = message.metadata?.toolName || message.toolName || "tool";
  const toolArgs = message.metadata?.toolArgs || {};
  const isRunning = message.isRunning;
  const rawOutput = message.result || "";
  const hasError = message.toolResult?.error;

  const isCommandTool = toolName === "run_command";
  const isWebSearch = toolName === "web_search" || toolName === "web_fetch";
  const isTodoWrite = toolName === "todo_write";
  const command = toolArgs?.command || "";
  const explanation = toolArgs?.explanation || "";
  const needsApproval = message.confirmation?.state === "approval-requested";

  // --- Parse todo_write args into QueueTodoItem[] for AgentTaskPanel ---
  const todoItems: QueueTodoItem[] = isTodoWrite
    ? (() => {
        try {
          let rawTodos = toolArgs?.todos;
          if (typeof rawTodos === "string") {
            rawTodos = JSON.parse(rawTodos);
          }
          if (!Array.isArray(rawTodos)) return [];
          return rawTodos.map((item: any, idx: number) => {
            const status: QueueTodoItem["status"] =
              item.status === "completed"
                ? "completed"
                : item.status === "in_progress" || item.status === "active"
                  ? "active"
                  : "pending";
            return {
              id: `todo-${idx}-${item.content?.slice(0, 20) || idx}`,
              title: item.content || item.title || "",
              description: item.description,
              status,
            };
          });
        } catch {
          return [];
        }
      })()
    : [];

  const filePathTools = ["read_file", "edit_file", "write_file", "list_directory", "notebook_edit", "lsp_tool"];
  const filePath = filePathTools.includes(toolName)
    ? toolArgs?.filepath || toolArgs?.path || toolArgs?.notebook_path || toolArgs?.file_path || ""
    : "";

  // Subtitle/pattern shown next to tool name in the header for all tools
  const toolSubtitles: Record<string, (args: Record<string, any>) => string> = {
    run_command: (a) => a.command || "",
    glob_find: (a) => a.pattern || "",
    grep_search: (a) => a.query || a.search_term || "",
    read_file: (a) => a.filepath || a.path || "",
    edit_file: (a) => a.filepath || a.path || "",
    write_file: (a) => a.filepath || a.path || "",
    list_directory: (a) => a.path || a.directory || "",
    notebook_edit: (a) => a.notebook_path || a.path || "",
    lsp_tool: (a) => a.path || a.filepath || "",
    web_search: (a) => a.query || "",
    web_fetch: (a) => a.url || "",
    canvas_add_node: (a) => a.title || a.node_name || "",
    canvas_add_edge: (a) => a.source_node_id && a.target_node_id ? `${a.source_node_id} → ${a.target_node_id}` : "",
    canvas_remove_node: (a) => a.node_id || "",
    canvas_remove_nodes: (a) => a.node_ids || "",
    canvas_edit_node: (a) => a.node_id || "",
    canvas_get_node_details: (a) => a.node_id || "",
    canvas_search_nodes: (a) => a.query || "",
    canvas_read: (a) => a.scope ? `scope=${a.scope}` : "",
    canvas_create_flow: (a) => a.file_path || "",
    canvas_verify_flow: (a) => a.file_path || "",
    canvas_clear: (a) => a.file_path || "",
    canvas_get_active_flow: () => "",
    canvas_list_nodes: () => "",
    canvas_get_flow_nodes: () => "",
    log_experiment: (a) => a.experiment_name || a.name || "",
    ask_user: (a) => a.question || "",
    todo_write: () => "",
    query_entrez_database: (a) => a.database || "",
    bio_query: (a) => a.database || "",
  };
  const toolSubtitle = toolSubtitles[toolName] ? toolSubtitles[toolName](toolArgs) : "";

  // For file path tools, don't pass the path as command — filePath prop handles display with left truncation
  const isFilePathTool = filePathTools.includes(toolName);
  const headerCommand = isFilePathTool
    ? (isCommandTool ? command : "") || undefined
    : toolSubtitle || (isCommandTool ? command : "") || undefined;

  const headerTitle = toolName;

  const [copied, setCopied] = useState(false);

  const toolState = isRunning
    ? "input-available"
    : hasError
      ? "output-error"
      : "output-available";

  const parseSearchResults = (output: string): Array<{ href: string; title: string }> => {
    const results: Array<{ href: string; title: string }> = [];
    for (const line of output.split("\n")) {
      const match = line.match(/^-\s*(.+?):\s*(https?:\/\/.+)$/);
      if (match) {
        results.push({ title: match[1].trim(), href: match[2].trim() });
      }
    }
    return results;
  };

  const handleCopyOutput = useCallback(() => {
    const textToCopy = rawOutput || message.content || "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [rawOutput, message.content]);

  const isToolComplete = !isRunning && !needsApproval && (rawOutput || hasError);

  // --- Sources rendering for web_search ---
  const searchResults = isWebSearch && rawOutput ? parseSearchResults(rawOutput) : [];

  // --- Generic tool rendering using ai-elements Tool ---
  return (
    <div className="px-1 mt-1 mb-1 py-0 group/tool">
      {/* --- Special rendering for todo_write: use AgentTaskPanel --- */}
      {isTodoWrite && todoItems.length > 0 && !needsApproval ? (
        <AgentTaskPanel
          todos={todoItems}
          readOnly
          defaultOpen={true}
        />
      ) : needsApproval && explanation ? (
        // When awaiting approval, show the explanation as the primary content
        // instead of raw tool args JSON
        <div className="rounded-lg border border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <ShieldCheck className="size-3" />
            <span>Permission required: {toolName}</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{explanation}</p>
          {(command || filePath) && (
            <code className="block text-[10px] font-mono text-muted-foreground bg-muted/40 rounded px-2 py-1 truncate">
              {command || filePath}
            </code>
          )}
        </div>
      ) : (
        <>
          {explanation && (
            <p className="text-sm text-foreground mb-1 leading-relaxed font-sans">{explanation}</p>
          )}
          <Tool defaultOpen={needsApproval}>
            <ToolHeader
              title={headerTitle}
              command={headerCommand}
              filePath={filePath || undefined}
              type="dynamic-tool"
              state={toolState as any}
              toolName={toolName}
              actions={isRunning && onStopCommand ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStopCommand(message.metadata?.toolMessageId || message.id);
                  }}
                  title="Stop command"
                >
                  <Square className="size-2.5" />
                </Button>
              ) : undefined}
            />
            <ToolContent className="space-y-2">
              {Object.keys(toolArgs).length > 0 && (
                <ToolInput input={toolArgs} />
              )}
              {rawOutput && (
                <ToolOutput
                  output={rawOutput}
                  errorText={hasError || undefined}
                />
              )}
              {searchResults.length > 0 && (
                <Sources>
                  <SourcesTrigger count={searchResults.length} />
                  <SourcesContent>
                    {searchResults.map((source, idx) => (
                      <Source
                        key={`${source.href}-${idx}`}
                        href={source.href}
                        title={source.title}
                      />
                    ))}
                  </SourcesContent>
                </Sources>
              )}
            </ToolContent>
          </Tool>
        </>
      )}
      {needsApproval && (
        <ApprovalButtons messageId={message.id} onApprove={onApprove} onReject={onReject} />
      )}
    </div>
  );
}

function ApprovalButtons({ messageId, onApprove, onReject }: {
  messageId: string;
  onApprove?: (id: string, approvalMode?: 'once' | 'always' | 'lytic') => void;
  onReject?: (id: string) => void;
}) {
  const [responded, setResponded] = useState(false);

  // Hide the buttons immediately after the user clicks — don't wait for backend round-trip
  if (responded) return null;

  return (
    <div className="flex items-center gap-1.5 pt-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-xs gap-1"
        onClick={() => { setResponded(true); onReject?.(messageId); }}
      >
        <X className="size-2.5" />
        Decline
      </Button>
      <div className="flex items-center">
        <Button
          size="sm"
          className="h-6 text-xs gap-1 rounded-r-none"
          onClick={() => { setResponded(true); onApprove?.(messageId, 'once'); }}
        >
          <Check className="size-2.5" />
          Accept
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-6 w-6 p-0 rounded-l-none border-l border-primary-foreground/20"
              aria-label="More approval options"
            >
              <ChevronDown className="size-2.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => { setResponded(true); onApprove?.(messageId, 'once'); }}>
                <CheckCircle2 className="size-3.5" />
                <div className="flex flex-col">
                  <span className="font-medium">Just once</span>
                  <span className="text-[10px] text-muted-foreground">Ask again next time</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setResponded(true); onApprove?.(messageId, 'always'); }}>
                <ShieldCheck className="size-3.5" />
                <div className="flex flex-col">
                  <span className="font-medium">Always allow</span>
                  <span className="text-[10px] text-muted-foreground">Auto-approve this tool</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => { setResponded(true); onApprove?.(messageId, 'lytic'); }}>
                <Zap className="size-3.5" />
                <div className="flex flex-col">
                  <span className="font-medium">Lytic mode</span>
                  <span className="text-[10px] text-muted-foreground">Auto-approve everything</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default ToolMessage;