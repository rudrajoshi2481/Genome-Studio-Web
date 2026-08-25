"use client";

import React, {
  RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";

import {
  CheckIcon,
  SearchIcon,
  Wrench,
  Bot,
  Workflow,
  Terminal,
  Database,
  FileIcon,
  Zap,
} from "lucide-react";

import MentionInput from "./MentionInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Editor } from "@tiptap/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getApiBaseUrl } from "@/config/server";
import { useChatStore } from "./chatStore";

export interface ChatMention {
  type: "tool" | "agent" | "workflow" | "database" | "command" | "file" | "skill";
  name: string;
  id?: string;
  description?: string;
  icon?: string;
}

interface ChatMentionInputProps {
  onChange: (text: string) => void;
  onChangeMention: (mentions: ChatMention[]) => void;
  onEnter?: () => void;
  placeholder?: string;
  input: string;
  disabledMention?: boolean;
  ref?: RefObject<Editor | null>;
  onFocus?: () => void;
  onBlur?: () => void;
}

const DEFAULT_TOOLS: ChatMention[] = [];
const DEFAULT_AGENTS: ChatMention[] = [];
const DEFAULT_WORKFLOWS: ChatMention[] = [];
const DEFAULT_DATABASES: ChatMention[] = [];

async function fetchBackendMentions(): Promise<{ agents: ChatMention[]; files: ChatMention[]; skills: ChatMention[]; commands: ChatMention[]; databases: ChatMention[]; tools: ChatMention[] }> {
  const rootPath = typeof window !== 'undefined' ? localStorage.getItem('fileExplorer_rootPath') : null;
  const filesQuery = rootPath
    ? `${getApiBaseUrl()}/ai-chat/files?limit=50&root_path=${encodeURIComponent(rootPath)}`
    : `${getApiBaseUrl()}/ai-chat/files?limit=50`;
  const [agentsResp, filesResp, skillsResp, cmdResp, dbResp, toolsResp] = await Promise.allSettled([
    fetch(`${getApiBaseUrl()}/ai-chat/agents`).then(r => r.ok ? r.json() : []),
    fetch(filesQuery).then(r => r.ok ? r.json() : []),
    fetch(`${getApiBaseUrl()}/ai-chat/skills`).then(r => r.ok ? r.json() : []),
    fetch(`${getApiBaseUrl()}/ai-chat/commands`).then(r => r.ok ? r.json() : []),
    fetch(`${getApiBaseUrl()}/ai-chat/databases`).then(r => r.ok ? r.json() : []),
    fetch(`${getApiBaseUrl()}/ai-chat/tools`).then(r => r.ok ? r.json() : []),
  ]);

  const tools: ChatMention[] = toolsResp.status === 'fulfilled'
    ? (toolsResp.value || []).filter((t: any) => t.is_enabled !== false).map((t: any) => ({ type: "tool" as const, name: t.name, description: t.description || t.search_hint, id: t.name }))
    : [];

  const agents: ChatMention[] = agentsResp.status === 'fulfilled'
    ? (agentsResp.value || []).map((a: any) => ({ type: "agent" as const, name: a.name, description: a.description || a.body?.slice(0, 80), id: a.name }))
    : [];

  const files: ChatMention[] = filesResp.status === 'fulfilled'
    ? (filesResp.value || []).map((f: any) => ({ type: "file" as const, name: f.name || f.path, description: f.path, id: f.path || f.name }))
    : [];

  const skills: ChatMention[] = skillsResp.status === 'fulfilled'
    ? (skillsResp.value || []).map((s: any) => ({ type: "skill" as const, name: s.name, description: s.description, id: s.name }))
    : [];

  const commands: ChatMention[] = cmdResp.status === 'fulfilled'
    ? (cmdResp.value || []).map((c: any) => ({ type: "command" as const, name: c.name?.startsWith('/') ? c.name : `/${c.name}`, description: c.description, id: c.name }))
    : [];

  const databases: ChatMention[] = dbResp.status === 'fulfilled'
    ? (dbResp.value || []).map((d: any) => ({ type: "database" as const, name: d.name, description: d.description, id: d.id }))
    : [];

  return { agents, files, skills, commands, databases, tools };
}

type BackendMentions = { agents: ChatMention[]; files: ChatMention[]; skills: ChatMention[]; commands: ChatMention[]; databases: ChatMention[]; tools: ChatMention[] };

let _cachedMentions: BackendMentions | null = null;
let _cachedMentionsRootPath: string | null = null;
let _mentionsFetchPromise: Promise<BackendMentions> | null = null;

function getBackendMentions(): Promise<BackendMentions> {
  const currentRootPath = typeof window !== 'undefined' ? localStorage.getItem('fileExplorer_rootPath') : null;
  if (_cachedMentions && _cachedMentionsRootPath === currentRootPath) return Promise.resolve(_cachedMentions);
  _cachedMentions = null;
  if (_mentionsFetchPromise) return _mentionsFetchPromise;
  _mentionsFetchPromise = fetchBackendMentions().then(result => {
    _cachedMentions = result;
    _cachedMentionsRootPath = typeof window !== 'undefined' ? localStorage.getItem('fileExplorer_rootPath') : null;
    _mentionsFetchPromise = null;
    return result;
  }).catch(() => {
    _mentionsFetchPromise = null;
    return { agents: [], files: [], skills: [], commands: [], databases: [], tools: [] };
  });
  return _mentionsFetchPromise!;
}

const SLASH_COMMANDS: ChatMention[] = [];

function getMentionIcon(mention: ChatMention): React.ReactNode {
  switch (mention.type) {
    case "agent":
      return <Bot className="size-3 shrink-0" />;
    case "workflow":
      return <Workflow className="size-3 shrink-0" />;
    case "database":
      return <Database className="size-3 shrink-0" />;
    case "command":
      return <Terminal className="size-3 shrink-0" />;
    case "file":
      return <FileIcon className="size-3 shrink-0" />;
    case "skill":
      return <Zap className="size-3 shrink-0" />;
    default:
      return <Wrench className="size-3 shrink-0" />;
  }
}

/** Per-type badge styles using only shadcn design tokens. */
const BADGE_TYPE_STYLES: Record<string, string> = {
  command:
    "bg-primary/10 text-primary border-primary/30",
  skill:
    "bg-secondary text-secondary-foreground border-border",
  agent:
    "bg-accent text-accent-foreground border-border",
  database:
    "bg-muted text-foreground border-border",
  tool:
    "bg-secondary text-secondary-foreground border-border",
  workflow:
    "bg-accent text-accent-foreground border-border",
  file:
    "bg-muted text-muted-foreground border-border",
};

type MentionItemType = {
  id: string;
  type: string;
  label: string;
  onSelect: () => void;
  icon: React.ReactNode;
  suffix?: React.ReactNode;
};

export default function ChatMentionInput({
  onChange,
  onChangeMention,
  onEnter,
  placeholder,
  ref,
  input,
  disabledMention,
  onFocus,
  onBlur,
}: ChatMentionInputProps) {
  const latestMentions = useRef<string[]>([]);

  const handleChange = useCallback(
    ({
      text,
      mentions,
    }: { text: string; mentions: { label: string; id: string }[] }) => {
      onChange(text);
      const mentionsIds = mentions.map((m) => m.id);
      const parsedMentions = mentionsIds.map(
        (id) => JSON.parse(id) as ChatMention,
      );
      if (JSON.stringify(latestMentions.current) === JSON.stringify(mentionsIds)) return;
      latestMentions.current = mentionsIds;
      onChangeMention(parsedMentions);
    },
    [onChange, onChangeMention],
  );

  return (
    <MentionInput
      content={input}
      onEnter={onEnter}
      placeholder={placeholder}
      suggestionChar="@"
      disabledMention={disabledMention}
      onChange={handleChange}
      MentionItem={ChatMentionInputMentionItem}
      Suggestion={ChatMentionInputSuggestion}
      editorRef={ref}
      onFocus={onFocus}
      onBlur={onBlur}
      fullWidthSuggestion={true}
    />
  );
}

export function ChatMentionInputMentionItem({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const item = useMemo(() => JSON.parse(id) as ChatMention, [id]);

  const typeLabel = useMemo(() => {
    const labels: Record<string, string> = {
      agent: "Agent",
      workflow: "Workflow",
      database: "Database",
      command: "Command",
      tool: "Tool",
      file: "File",
      skill: "Skill",
    };
    return labels[item.type] || "Mention";
  }, [item.type]);

  const icon = getMentionIcon(item);
  const typeStyle = BADGE_TYPE_STYLES[item.type] || BADGE_TYPE_STYLES.tool;

  const label = useMemo(() => {
    return (
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0 h-5 text-[11px] font-medium rounded-md border cursor-default select-none",
          "transition-colors hover:opacity-80",
          typeStyle,
          className,
        )}
      >
        {icon}
        <span className="truncate max-w-[120px] leading-none">{item.name}</span>
      </Badge>
    );
  }, [item, className, icon, typeStyle]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{label}</TooltipTrigger>
        <TooltipContent side="top" className="p-2.5 max-w-[240px] text-xs">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-medium">
              {icon}
              <span>{item.name}</span>
              <span className="text-muted-foreground text-[10px] font-normal">
                {typeLabel}
              </span>
            </div>
            {item.description && (
              <p className="text-muted-foreground text-[10px] leading-relaxed line-clamp-3">
                {item.description}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ChatMentionInputSuggestion({
  onSelectMention,
  onClose,
  onDeleteTrigger,
  top,
  left,
  className,
  selectedIds,
  style,
}: {
  onClose: () => void;
  onDeleteTrigger?: () => void;
  onSelectMention: (item: { label: string; id: string }) => void;
  top: number;
  left: number;
  className?: string;
  selectedIds?: string[];
  style?: React.CSSProperties;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [backendMentions, setBackendMentions] = useState<BackendMentions>({ agents: [], files: [], skills: [], commands: [], databases: [], tools: [] });
  const { enabledDatabases } = useChatStore();
  const itemRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    getBackendMentions().then(setBackendMentions);
  }, []);

  const toolMentions = useMemo(() => {
    const merged = [...DEFAULT_TOOLS, ...backendMentions.tools];
    return merged.filter(
      (t) => !searchValue || t.name.toLowerCase().includes(searchValue.toLowerCase()),
    ).map((tool) => {
      const id = JSON.stringify(tool);
      return {
        id: tool.id!,
        type: "tool",
        label: tool.name,
        onSelect: () =>
          onSelectMention({
            label: `tool("${tool.name}")`,
            id,
          }),
        icon: getMentionIcon(tool),
        suffix: selectedIds?.includes(id) && (
          <CheckIcon className="size-3 ml-auto" />
        ),
      };
    });
  }, [selectedIds, searchValue, backendMentions]);

  const skillMentions = useMemo(() => {
    return backendMentions.skills.filter(
      (sk) => !searchValue || sk.name.toLowerCase().includes(searchValue.toLowerCase()) || (sk.description || "").toLowerCase().includes(searchValue.toLowerCase()),
    ).map((skill) => {
      const id = JSON.stringify(skill);
      return {
        id: skill.id!,
        type: "skill" as const,
        label: skill.name,
        onSelect: () =>
          onSelectMention({
            label: `skill("${skill.name}")`,
            id,
          }),
        icon: getMentionIcon(skill),
        suffix: selectedIds?.includes(id) && (
          <CheckIcon className="size-3 ml-auto" />
        ),
      };
    });
  }, [selectedIds, searchValue, backendMentions]);

  const fileMentions = useMemo(() => {
    return backendMentions.files.filter(
      (f) => !searchValue || f.name.toLowerCase().includes(searchValue.toLowerCase()),
    ).map((file) => {
      const id = JSON.stringify(file);
      return {
        id: file.id!,
        type: "file" as const,
        label: file.name,
        onSelect: () =>
          onSelectMention({
            label: `file("${file.name}")`,
            id,
          }),
        icon: getMentionIcon(file),
        suffix: selectedIds?.includes(id) && (
          <CheckIcon className="size-3 ml-auto" />
        ),
      };
    });
  }, [selectedIds, searchValue, backendMentions]);

  const agentMentions = useMemo(() => {
    const merged = [...DEFAULT_AGENTS, ...backendMentions.agents];
    const seen = new Set<string>();
    return merged.filter((a) => {
      const key = a.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return !searchValue || a.name.toLowerCase().includes(searchValue.toLowerCase());
    }).map((agent) => {
      const id = JSON.stringify(agent);
      return {
        id: agent.id!,
        type: "agent",
        label: agent.name,
        onSelect: () =>
          onSelectMention({
            label: `agent("${agent.name}")`,
            id,
          }),
        icon: getMentionIcon(agent),
        suffix: selectedIds?.includes(id) && (
          <CheckIcon className="size-3 ml-auto" />
        ),
      };
    });
  }, [selectedIds, searchValue, backendMentions]);

  const workflowMentions = useMemo(() => {
    return DEFAULT_WORKFLOWS.filter(
      (w) => !searchValue || w.name.toLowerCase().includes(searchValue.toLowerCase()),
    ).map((workflow) => {
      const id = JSON.stringify(workflow);
      return {
        id: workflow.id!,
        type: "workflow",
        label: workflow.name,
        onSelect: () =>
          onSelectMention({
            label: `workflow("${workflow.name}")`,
            id,
          }),
        icon: getMentionIcon(workflow),
        suffix: selectedIds?.includes(id) && (
          <CheckIcon className="size-3 ml-auto" />
        ),
      };
    });
  }, [selectedIds, searchValue]);

  const databaseMentions = useMemo(() => {
    const merged = [...DEFAULT_DATABASES, ...backendMentions.databases];
    const filtered = enabledDatabases.length > 0
      ? merged.filter((d) => enabledDatabases.includes(d.id || d.name))
      : merged;
    return filtered.filter(
      (d) => !searchValue || d.name.toLowerCase().includes(searchValue.toLowerCase()),
    ).map((db) => {
      const id = JSON.stringify(db);
      return {
        id: db.id!,
        type: "database",
        label: db.name,
        onSelect: () =>
          onSelectMention({
            label: `db("${db.name}")`,
            id,
          }),
        icon: getMentionIcon(db),
        suffix: selectedIds?.includes(id) && (
          <CheckIcon className="size-3 ml-auto" />
        ),
      };
    });
  }, [selectedIds, searchValue, backendMentions, enabledDatabases]);

  const allMentions = useMemo(() => {
    return [...skillMentions, ...databaseMentions, ...agentMentions, ...toolMentions, ...fileMentions, ...workflowMentions];
  }, [skillMentions, databaseMentions, agentMentions, toolMentions, fileMentions, workflowMentions]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [allMentions.length]);

  useEffect(() => {
    const selectedItem = allMentions[selectedIndex];
    if (selectedItem && itemRefs.current[selectedItem.id]) {
      itemRefs.current[selectedItem.id]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex, allMentions]);

  const groupedMentions = useMemo(() => {
    const groups = {
      skill: { title: "Skills", items: [] as MentionItemType[] },
      database: { title: "Databases", items: [] as MentionItemType[] },
      agent: { title: "Agents", items: [] as MentionItemType[] },
      tool: { title: "Tools", items: [] as MentionItemType[] },
      workflow: { title: "Workflows", items: [] as MentionItemType[] },
      file: { title: "Files", items: [] as MentionItemType[] },
    };
    allMentions.forEach((mention) => {
      const key = mention.type as keyof typeof groups;
      if (groups[key]) {
        groups[key].items.push(mention);
      }
    });
    return groups;
  }, [allMentions]);

  const trigger = useMemo(() => {
    return (
      <span
        className="fixed z-50"
        style={{
          top,
          left,
        }}
      ></span>
    );
  }, [top, left]);

  return (
    <Popover open={true} onOpenChange={(f: boolean) => { !f && onClose(); }}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className={cn("p-0 w-[420px] max-w-[500px] shadow-lg border rounded-lg", className)}
        align="start"
        side="top"
        style={{
          ...style,
          width: style?.width || "420px",
          maxWidth: "500px",
        }}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <SearchIcon className="size-3.5 shrink-0 opacity-50" />
            <input
              className="flex h-7 w-full rounded-md bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  onClose();
                }
                if (e.key === "Backspace" && !e.currentTarget.value) {
                  e.preventDefault();
                  onDeleteTrigger?.();
                }
                if (e.key === "Enter" && allMentions.length > 0) {
                  e.preventDefault();
                  allMentions[selectedIndex].onSelect();
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex((prev) =>
                    prev < allMentions.length - 1 ? prev + 1 : 0,
                  );
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex((prev) =>
                    prev > 0 ? prev - 1 : allMentions.length - 1,
                  );
                }
              }}
              autoFocus
            />
          </div>

          <div className="overflow-hidden max-h-[280px] overflow-y-auto">
            {allMentions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground p-8 gap-1.5">
                <SearchIcon className="size-4 opacity-40" />
                <div className="text-center">
                  {searchValue ? `No results for "${searchValue}"` : "Type @ to see available mentions"}
                </div>
              </div>
            ) : (
              <>
                {groupedMentions.skill.items.length > 0 && (
                  <div className="p-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
                      {groupedMentions.skill.title}
                    </div>
                    <div className="space-y-0.5">
                      {groupedMentions.skill.items.map((item) => (
                        <MentionItemRow
                          key={item.id}
                          item={item}
                          isSelected={allMentions[selectedIndex]?.id === item.id}
                          ref={(el) => { itemRefs.current[item.id] = el; }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {groupedMentions.database.items.length > 0 && (
                  <div className="p-1.5 border-t">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
                      {groupedMentions.database.title}
                    </div>
                    <div className="space-y-0.5">
                      {groupedMentions.database.items.map((item) => (
                        <MentionItemRow
                          key={item.id}
                          item={item}
                          isSelected={allMentions[selectedIndex]?.id === item.id}
                          ref={(el) => { itemRefs.current[item.id] = el; }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {groupedMentions.agent.items.length > 0 && (
                  <div className="p-1.5 border-t">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
                      {groupedMentions.agent.title}
                    </div>
                    <div className="space-y-0.5">
                      {groupedMentions.agent.items.map((item) => (
                        <MentionItemRow
                          key={item.id}
                          item={item}
                          isSelected={allMentions[selectedIndex]?.id === item.id}
                          ref={(el) => { itemRefs.current[item.id] = el; }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {groupedMentions.tool.items.length > 0 && (
                  <div className="p-1.5 border-t">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
                      {groupedMentions.tool.title}
                    </div>
                    <div className="space-y-0.5">
                      {groupedMentions.tool.items.map((item) => (
                        <MentionItemRow
                          key={item.id}
                          item={item}
                          isSelected={allMentions[selectedIndex]?.id === item.id}
                          ref={(el) => { itemRefs.current[item.id] = el; }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {groupedMentions.file.items.length > 0 && (
                  <div className="p-1.5 border-t">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
                      {groupedMentions.file.title}
                    </div>
                    <div className="space-y-0.5">
                      {groupedMentions.file.items.map((item) => (
                        <MentionItemRow
                          key={item.id}
                          item={item}
                          isSelected={allMentions[selectedIndex]?.id === item.id}
                          ref={(el) => { itemRefs.current[item.id] = el; }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {groupedMentions.workflow.items.length > 0 && (
                  <div className="p-1.5 border-t">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
                      {groupedMentions.workflow.title}
                    </div>
                    <div className="space-y-0.5">
                      {groupedMentions.workflow.items.map((item) => (
                        <MentionItemRow
                          key={item.id}
                          item={item}
                          isSelected={allMentions[selectedIndex]?.id === item.id}
                          ref={(el) => { itemRefs.current[item.id] = el; }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const MentionItemRow = React.forwardRef<
  HTMLButtonElement,
  { item: MentionItemType; isSelected: boolean }
>(({ item, isSelected }, ref) => {
  // Extract the ChatMention from the item id to get the type for coloring
  let mention: ChatMention | null = null;
  try { mention = JSON.parse(item.id) as ChatMention; } catch { /* ignore */ }

  return (
    <button
      ref={ref}
      className={cn(
        "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs outline-none cursor-pointer transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
      )}
      onClick={() => item.onSelect()}
    >
      <span className="shrink-0 text-muted-foreground">
        {item.icon}
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="truncate leading-tight">{item.label}</span>
        {mention?.description && (
          <span className="truncate text-[10px] text-muted-foreground leading-tight">
            {mention.description}
          </span>
        )}
      </div>
      {item.suffix}
    </button>
  );
});
MentionItemRow.displayName = "MentionItemRow";

export { SLASH_COMMANDS };
