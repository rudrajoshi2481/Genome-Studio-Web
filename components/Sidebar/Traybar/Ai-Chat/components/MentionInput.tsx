"use client";

import Mention from "@tiptap/extension-mention";
import {
  EditorContent,
  Range,
  useEditor,
  UseEditorOptions,
  Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";
import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  RefObject,
} from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

interface MentionInputProps {
  disabled?: boolean;
  defaultContent?: any;
  content?: any;
  onChange?: (content: {
    json: any;
    text: string;
    mentions: { label: string; id: string }[];
  }) => void;
  onEnter?: () => void;
  placeholder?: string;
  suggestionChar?: string;
  className?: string;
  disabledMention?: boolean;
  editorRef?: RefObject<Editor | null>;
  onFocus?: () => void;
  onBlur?: () => void;
  fullWidthSuggestion?: boolean;
  MentionItem?: FC<{
    label: string;
    id: string;
  }>;
  Suggestion?: FC<{
    top: number;
    left: number;
    onClose: () => void;
    onSelectMention: (item: { label: string; id: string }) => void;
    onDeleteTrigger?: () => void;
    style?: React.CSSProperties;
  }>;
}

export default function MentionInput({
  defaultContent,
  content,
  onChange,
  disabled,
  onEnter,
  placeholder = "",
  suggestionChar = "@",
  MentionItem,
  disabledMention,
  Suggestion,
  className,
  editorRef,
  onFocus,
  onBlur,
  fullWidthSuggestion = false,
}: MentionInputProps) {
  const [open, setOpen] = useState(false);
  const position = useRef<{
    top: number;
    left: number;
    range: Range;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(
    undefined,
  );
  const latestContent = useRef<{
    json: any;
    text: string;
  } | null>(null);

  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const fullWidthSuggestionRef = useRef(fullWidthSuggestion);

  useEffect(() => {
    onChangeRef.current = onChange;
    onFocusRef.current = onFocus;
    onBlurRef.current = onBlur;
    fullWidthSuggestionRef.current = fullWidthSuggestion;
  });

  const editorConfig = useMemo<UseEditorOptions>(() => {
    return {
      editable: !disabled,
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          blockquote: false,
          code: false,
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          renderHTML: (props: any) => {
            const el = document.createElement("div");
            el.className = "inline-flex";
            const root = createRoot(el);
            if (MentionItem)
              root.render(
                <MentionItem
                  label={props.node.attrs.label}
                  id={props.node.attrs.id}
                />,
              );
            return el;
          },
          suggestion: {
            char: suggestionChar,
            render: () => {
              return {
                onStart: (props: any) => {
                  if (fullWidthSuggestionRef.current) {
                    const containerRect =
                      containerRef.current?.getBoundingClientRect();
                    if (containerRect) {
                      position.current = {
                        top: containerRect.top,
                        left: containerRect.left,
                        range: props.range,
                      };
                      setContainerWidth(containerRect.width);
                      setOpen(true);
                    }
                  } else {
                    const rect = props.clientRect?.();
                    if (rect) {
                      position.current = {
                        top: rect.top,
                        left: rect.left,
                        range: props.range,
                      };
                      setContainerWidth(undefined);
                      setOpen(true);
                    }
                  }
                },
                onUpdate: (props: any) => {
                  if (fullWidthSuggestionRef.current) {
                    const containerRect =
                      containerRef.current?.getBoundingClientRect();
                    if (containerRect) {
                      position.current = {
                        top: containerRect.top,
                        left: containerRect.left,
                        range: props.range,
                      };
                    }
                  } else {
                    const rect = props.clientRect?.();
                    if (rect) {
                      position.current = {
                        top: rect.top,
                        left: rect.left,
                        range: props.range,
                      };
                    }
                  }
                },
                onExit: () => setOpen(false),
                onDestroy: () => {
                  setOpen(false);
                  position.current = null;
                },
                onKeyDown: (props: any) => {
                  if (props.event.key === "Escape") {
                    setOpen(false);
                    return true;
                  }
                  return false;
                },
              };
            },
          },
        }),
      ],
      content: defaultContent ?? content,
      autofocus: true,
      onUpdate: ({ editor }) => {
        const json = editor.getJSON();
        const text = editor.getText();
        const mentions = json?.content
          ?.flatMap((c: any) => {
            return c?.content
              ?.filter((v: any) => v.type == "mention")
              .map(
                (v: any) =>
                  v.attrs as { label: string; id: string },
              );
          })
          .filter(Boolean) as { label: string; id: string }[];
        latestContent.current = {
          json,
          text,
        };
        onChangeRef.current?.({
          json,
          text,
          mentions: mentions || [],
        });
      },
      onFocus: () => {
        onFocusRef.current?.();
      },
      onBlur: () => {
        onBlurRef.current?.();
      },
      editorProps: {
        attributes: {
          class:
            "w-full max-h-40 min-h-[2rem] break-words overflow-y-auto resize-none focus:outline-none px-1 py-1.5 prose prose-sm dark:prose-invert text-xs",
        },
        style: {
          width: "100%",
        },
      },
    };
  }, [disabled, MentionItem, suggestionChar]);

  const editor = useEditor(editorConfig);

  useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const hasContent = editor && (editor.getText().trim().length > 0 || editor.getJSON()?.content?.some((c: any) => c?.content?.some((v: any) => v?.type === "mention")));
      const isSubmit =
        !open &&
        e.key === "Enter" &&
        hasContent &&
        !e.shiftKey &&
        !e.metaKey &&
        !e.nativeEvent.isComposing;
      if (isSubmit) {
        e.preventDefault();
        onEnter?.();
        editor?.commands.blur();
      }
    },
    [editor, onEnter, open],
  );

  const suggestion = useMemo(() => {
    if (!open || disabledMention) return null;
    if (!Suggestion) return null;
    return createPortal(
      <Suggestion
        top={position.current?.top ?? 0}
        left={position.current?.left ?? 0}
        onClose={() => {
          setOpen(false);
          editor?.commands.focus();
        }}
        onDeleteTrigger={() => {
          if (position.current) {
            editor?.chain().focus().deleteRange(position.current.range).run();
          } else {
            editor?.commands.focus();
          }
          setOpen(false);
        }}
        onSelectMention={(item) => {
          editor
            ?.chain()
            .focus()
            .insertContentAt(position.current!.range, [
              {
                type: "mention",
                attrs: item,
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();
          setOpen(false);
        }}
        style={{
          width:
            fullWidthSuggestion && containerWidth
              ? `${containerWidth}px`
              : undefined,
        }}
      />,
      document.body,
    );
  }, [open, disabledMention, containerWidth, fullWidthSuggestion, Suggestion, editor]);

  const placeholderElement = useMemo(() => {
    if (!editor?.isEmpty) return null;

    return (
      <div className="absolute top-1.5 left-2 text-muted-foreground pointer-events-none text-xs">
        {placeholder}
      </div>
    );
  }, [editor?.isEmpty, placeholder]);


  useEffect(() => {
    if (content != undefined && onChangeRef.current) {
      if (
        typeof content == "string" &&
        content != latestContent.current?.text
      ) {
        editor?.commands.setContent(content);
      } else if (
        typeof content != "string" &&
        content != latestContent.current?.json
      ) {
        editor?.commands.setContent(content);
      }
    }
  }, [content, editor]);

  const focus = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  return (
    <div
      ref={containerRef}
      onClick={focus}
      className={cn("relative w-full", className)}
    >
      <EditorContent editor={editor} onKeyDown={handleKeyDown} />
      {suggestion}
      {placeholderElement}
    </div>
  );
}
