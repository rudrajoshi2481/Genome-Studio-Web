"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/config/server";
import {
  Terminal,
} from "lucide-react";

export interface SlashCommand {
  name: string;
  description: string;
  icon: React.ReactNode;
}

const DEFAULT_COMMANDS: SlashCommand[] = [];

let _cachedCommands: SlashCommand[] | null = null;
let _commandsFetchPromise: Promise<SlashCommand[]> | null = null;

async function fetchBackendCommands(): Promise<SlashCommand[]> {
  try {
    const resp = await fetch(`${getApiBaseUrl()}/ai-chat/commands`);
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data)) return [];
    return data.map((cmd: any) => ({
      name: cmd.name?.startsWith('/') ? cmd.name : `/${cmd.name}`,
      description: cmd.description || '',
      icon: <Terminal className="size-3.5" />,
    }));
  } catch {
    return [];
  }
}

/** Invalidate the cached command list so the next fetch hits the backend. */
export function invalidateSlashCommandCache() {
  _cachedCommands = null;
  _commandsFetchPromise = null;
}

async function getAllCommands(): Promise<SlashCommand[]> {
  if (_cachedCommands) return _cachedCommands;
  if (_commandsFetchPromise) return _commandsFetchPromise;
  _commandsFetchPromise = (async () => {
    const backend = await fetchBackendCommands();
    const merged = [...DEFAULT_COMMANDS];
    const seen = new Set(merged.map(c => c.name));
    for (const cmd of backend) {
      if (!seen.has(cmd.name)) {
        merged.push(cmd);
        seen.add(cmd.name);
      }
    }
    _cachedCommands = merged;
    _commandsFetchPromise = null;
    return merged;
  })();
  return _commandsFetchPromise;
}

interface SlashCommandSuggestionProps {
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  top: number;
  left: number;
  width?: number;
  searchValue?: string;
}

export function SlashCommandSuggestion({
  onSelect,
  onClose,
  top,
  left,
  width = 400,
  searchValue = "",
}: SlashCommandSuggestionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const [allCommands, setAllCommands] = useState<SlashCommand[]>(DEFAULT_COMMANDS);

  useEffect(() => {
    // The component mounts fresh each time the menu opens, so invalidate the
    // module-level cache to pick up backend command changes without a reload.
    invalidateSlashCommandCache();
    getAllCommands().then(setAllCommands);
  }, []);

  const filteredCommands = useMemo(() => {
    return allCommands.filter(
      (cmd) =>
        !searchValue ||
        cmd.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        cmd.description.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [searchValue, allCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  useEffect(() => {
    const selectedCmd = filteredCommands[selectedIndex];
    if (selectedCmd && itemRefs.current[selectedCmd.name]) {
      itemRefs.current[selectedCmd.name]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex, filteredCommands]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [filteredCommands, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 rounded-lg border bg-popover shadow-md"
      style={{
        top,
        left,
        width: `${width}px`,
        maxWidth: "450px",
        transform: "translateY(-100%)",
        marginTop: "-4px",
      }}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Terminal className="size-3.5 shrink-0 opacity-50" />
          <span className="flex h-5 w-full items-center text-xs text-muted-foreground">
            {searchValue ? `/${searchValue}` : "Type to search commands..."}
          </span>
        </div>

        <div className="overflow-hidden max-h-[240px] overflow-y-auto p-1">
          {filteredCommands.length === 0 ? (
            <div className="flex items-center justify-center text-xs text-muted-foreground p-6">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.name}
                ref={(el) => { itemRefs.current[cmd.name] = el; }}
                className={cn(
                  "flex items-center gap-2 w-full rounded-sm px-2.5 py-2 text-xs outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
                  idx === selectedIndex && "bg-accent text-accent-foreground",
                )}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => onSelect(cmd)}
              >
                <span className="text-muted-foreground shrink-0">{cmd.icon}</span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-mono font-medium truncate">{cmd.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{cmd.description}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_COMMANDS };
export default SlashCommandSuggestion;
