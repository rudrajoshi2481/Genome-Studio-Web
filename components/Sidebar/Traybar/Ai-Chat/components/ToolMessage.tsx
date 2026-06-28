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

interface ToolMessageProps {
  message: Message;
  isLast?: boolean;
  onStopCommand?: (toolMessageId: string) => void;
  onApprove?: (id: string, approvalMode?: 'once' | 'always' | 'yolo') => void;
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
  const command = toolArgs?.command || "";
  const explanation = toolArgs?.explanation || "";
  const needsApproval = message.confirmation?.state === "approval-requested";

  const filePathTools = ["read_file", "edit_file", "write_file", "list_directory", "grep_search", "glob_find", "notebook_edit", "lsp_tool"];
  const filePath = filePathTools.includes(toolName)
    ? toolArgs?.filepath || toolArgs?.path || toolArgs?.notebook_path || toolArgs?.file_path || ""
    : "";

  const canvasSubtitleTools: Record<string, (args: Record<string, any>) => string> = {
    canvas_add_node: (a) => a.title || "",
    canvas_add_edge: (a) => a.source_node_id && a.target_node_id ? `${a.source_node_id} → ${a.target_node_id}` : "",
    canvas_remove_node: (a) => a.node_id || "",
    canvas_remove_nodes: (a) => a.node_ids || "",
    canvas_get_node_details: (a) => a.node_id || "",
    canvas_search_nodes: (a) => a.query || "",
  };
  const canvasSubtitle = canvasSubtitleTools[toolName] ? canvasSubtitleTools[toolName](toolArgs) : "";

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
    <div className="px-3 mt-4 py-0.5 group/tool">
      {explanation && (
        <p className="text-xs text-foreground mb-1 leading-relaxed">{explanation}</p>
      )}
      <Tool defaultOpen={needsApproval}>
        <ToolHeader
          title={headerTitle}
          command={isCommandTool ? command : canvasSubtitle || undefined}
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
      {needsApproval && (
        <ApprovalButtons messageId={message.id} onApprove={onApprove} onReject={onReject} />
      )}
      {isLast && isToolComplete && (
        <div className="flex items-center gap-0.5 mt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleCopyOutput}
          >
            {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}

function ApprovalButtons({ messageId, onApprove, onReject }: {
  messageId: string;
  onApprove?: (id: string, approvalMode?: 'once' | 'always' | 'yolo') => void;
  onReject?: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 pt-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-xs gap-1"
        onClick={() => onReject?.(messageId)}
      >
        <X className="size-2.5" />
        Decline
      </Button>
      <div className="flex items-center">
        <Button
          size="sm"
          className="h-6 text-xs gap-1 rounded-r-none"
          onClick={() => onApprove?.(messageId, 'once')}
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
              <DropdownMenuItem onClick={() => onApprove?.(messageId, 'once')}>
                <CheckCircle2 className="size-3.5" />
                <div className="flex flex-col">
                  <span className="font-medium">Just once</span>
                  <span className="text-[10px] text-muted-foreground">Ask again next time</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onApprove?.(messageId, 'always')}>
                <ShieldCheck className="size-3.5" />
                <div className="flex flex-col">
                  <span className="font-medium">Always allow</span>
                  <span className="text-[10px] text-muted-foreground">Auto-approve this tool</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onApprove?.(messageId, 'yolo')}>
                <Zap className="size-3.5" />
                <div className="flex flex-col">
                  <span className="font-medium">YOLO mode</span>
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