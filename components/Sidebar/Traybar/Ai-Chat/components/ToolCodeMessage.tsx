"use client";

import React, { useState, useCallback } from "react";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ai-elements/code-block";
import { Check, ChevronDown, Copy, Square, Terminal, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "./chatStore";

interface ToolCodeMessageProps {
  message: Message;
  isLast?: boolean;
  onStopCommand?: (toolMessageId: string) => void;
}

function ToolCodeMessage({ message, isLast, onStopCommand }: ToolCodeMessageProps) {
  const toolName = message.metadata?.toolName || message.toolName || "tool";
  const code = message.code || "";
  const language = message.codeLanguage || "bash";
  const isRunning = message.isRunning;
  const hasError = message.toolResult?.error;
  const outputLines = message.outputLines || [];
  const output = outputLines.join("\n");

  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const toolState = isRunning
    ? "input-available"
    : hasError
      ? "output-error"
      : "output-available";

  const handleCopyOutput = useCallback(() => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  const isToolComplete = !isRunning && (output || hasError);
  const isCommandTool = toolName === "run_command";
  const headerIcon = isCommandTool ? <Terminal className="size-3.5" /> : <FileCode2 className="size-3.5" />;

  return (
    <div className="px-3 mt-4 py-0.5 group/tool">
      <Tool defaultOpen={false}>
        <ToolHeader
          title={toolName}
          type="dynamic-tool"
          state={toolState as any}
          toolName={toolName}
          actions={
            <div className="flex items-center gap-0.5">
              {isRunning && onStopCommand && (
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
              )}
            </div>
          }
        />
        <ToolContent className="space-y-2">
          {/* Code block with syntax highlighting */}
          {code && (
            <CodeBlock
              code={code}
              language={language as any}
              className="text-xs"
            >
              <CodeBlockHeader>
                <CodeBlockTitle>
                  {headerIcon}
                  <span className="font-mono text-[10px] uppercase tracking-wide">{language}</span>
                </CodeBlockTitle>
                <CodeBlockCopyButton />
              </CodeBlockHeader>
            </CodeBlock>
          )}

          {/* Collapsible output section */}
          {output && (
            <div className="border-t pt-1">
              <button
                onClick={() => setShowOutput(!showOutput)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <ChevronDown
                  className={`size-3 transition-transform ${showOutput ? "" : "-rotate-90"}`}
                />
                <span>Output ({outputLines.length} lines)</span>
              </button>
              {showOutput && (
                <div className="relative mt-1">
                  <ToolOutput
                    output={output}
                    errorText={hasError || undefined}
                  />
                  <div className="absolute top-1 right-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      onClick={handleCopyOutput}
                      title="Copy output"
                    >
                      {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Running indicator */}
          {isRunning && !output && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground py-1">
              <div className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Executing...</span>
            </div>
          )}

          {/* Error display */}
          {hasError && !isRunning && (
            <div className="text-[10px] text-destructive py-1 px-2 bg-destructive/10 rounded">
              {hasError}
            </div>
          )}
        </ToolContent>
      </Tool>

      {/* Copy button for completed tool */}
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

export default ToolCodeMessage;
