"use client";

import React from "react";
import {
  Check,
  X,
  FileText,
  FileJson,
  FileCode,
  FileSpreadsheet,
  Download,
  CheckCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore, PendingFile } from "./chatStore";
import { shallow } from "zustand/shallow";
import { useTabStore } from "@/components/FileTabs/useTabStore";
import { getApiBaseUrl } from "@/config/server";

const fileTypeConfig: Record<string, { icon: typeof FileText }> = {
  py:   { icon: FileCode },
  js:   { icon: FileCode },
  ts:   { icon: FileCode },
  tsx:  { icon: FileCode },
  jsx:  { icon: FileCode },
  sh:   { icon: FileCode },
  r:    { icon: FileCode },
  yaml: { icon: FileCode },
  yml:  { icon: FileCode },
  xml:  { icon: FileCode },
  html: { icon: FileCode },
  json: { icon: FileJson },
  geojson: { icon: FileJson },
  csv:  { icon: FileSpreadsheet },
  tsv:  { icon: FileSpreadsheet },
  xlsx: { icon: FileSpreadsheet },
  xls:  { icon: FileSpreadsheet },
};

function getFileIcon(fileType: string) {
  return fileTypeConfig[fileType] || { icon: FileText };
}

function getFileName(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1] || filePath;
}

function getDirPath(filePath: string): string {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/");
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileApprovalPanelProps {
  sessionId?: string | null;
}

const FileApprovalPanel: React.FC<FileApprovalPanelProps> = ({ sessionId }) => {
  const {
    pendingFiles,
    showFilePanel,
    removePendingFile,
    clearPendingFiles,
    setShowFilePanel,
  } = useChatStore(s => ({
    pendingFiles: s.pendingFiles,
    showFilePanel: s.showFilePanel,
    removePendingFile: s.removePendingFile,
    clearPendingFiles: s.clearPendingFiles,
    setShowFilePanel: s.setShowFilePanel,
  }), shallow);

  const [collapsed, setCollapsed] = React.useState(false);

  const handleOpenInEditor = (filePath: string) => {
    const fileName = filePath.split("/").pop() || filePath;
    const tabId = useTabStore.getState().addTab(filePath, fileName, "");
    if (tabId) {
      useTabStore.getState().activateTab(tabId);
    }
  };

  const handleAccept = (file: PendingFile) => {
    removePendingFile(file.id);
  };

  const handleReject = async (file: PendingFile) => {
    if (sessionId && file.file_id) {
      try {
        await fetch(
          `${getApiBaseUrl()}/ai-chat/sessions/${sessionId}/files/${file.file_id}`,
          { method: "DELETE" }
        );
      } catch (e) {
        console.error("Failed to delete file:", e);
      }
    }
    removePendingFile(file.id);
  };

  const handleAcceptAll = () => {
    clearPendingFiles();
  };

  const handleRejectAll = async () => {
    if (sessionId) {
      for (const file of pendingFiles) {
        if (file.file_id) {
          try {
            await fetch(
              `${getApiBaseUrl()}/ai-chat/sessions/${sessionId}/files/${file.file_id}`,
              { method: "DELETE" }
            );
          } catch (e) {
            console.error("Failed to delete file:", e);
          }
        }
      }
    }
    clearPendingFiles();
  };

  if (!showFilePanel || pendingFiles.length === 0) return null;

  const pendingCount = pendingFiles.filter((f) => f.status === "pending").length;

  return (
    <div className="border-t bg-muted/80 backdrop-blur-sm">
      {/* Action bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">
            {pendingCount} file{pendingCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={handleAcceptAll}
          >
            <CheckCheck className="size-3" />
            Accept All
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs gap-1"
            onClick={handleRejectAll}
          >
            <XCircle className="size-3" />
            Reject All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </Button>
        </div>
      </div>

      {/* File list */}
      {!collapsed && (
        <div className="overflow-y-auto max-h-[200px] px-3 py-1">
          {pendingFiles.map((file) => {
            const { icon: FileIcon } = getFileIcon(file.file_type);
            const fileName = getFileName(file.file_path);
            const dirPath = getDirPath(file.file_path);
            return (
              <div
                key={file.id}
                className="flex items-center gap-2 py-1.5 px-1 rounded-sm hover:bg-muted/40 transition-colors group/file"
              >
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <button
                  onClick={() => handleOpenInEditor(file.file_path)}
                  className="min-w-0 flex-1 flex items-center gap-0.5 text-[10px] text-muted-foreground cursor-pointer hover:text-primary transition-colors text-left"
                  title="Open in editor"
                >
                  <span dir="rtl" className="truncate shrink min-w-0">
                    <span dir="ltr" className="inline-block">{dirPath}/</span>
                  </span>
                  <span className="font-bold text-foreground truncate shrink-0 hover:underline">{fileName}</span>
                  {file.size ? <span className="shrink-0"> · {formatFileSize(file.size)}</span> : null}
                  {file.toolName ? <span className="shrink-0"> · {file.toolName}</span> : null}
                  {file.additions != null && file.deletions != null && (file.additions > 0 || file.deletions > 0) ? (
                    <span className="shrink-0 ml-1">
                      <span className="text-green-600">+{file.additions}</span>{' '}
                      <span className="text-red-600">-{file.deletions}</span>
                    </span>
                  ) : null}
                </button>
                <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover/file:opacity-100 transition-opacity">
                  {file.file_id && sessionId && (
                    <a
                      href={`${getApiBaseUrl()}/ai-chat/sessions/${sessionId}/files/${file.file_id}`}
                      className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      title="Download"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleAccept(file)}
                    className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all"
                    title="Accept"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleReject(file)}
                    className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    title="Reject & delete"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileApprovalPanel;
