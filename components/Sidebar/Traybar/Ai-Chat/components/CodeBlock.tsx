"use client";

import React, { useEffect, useState, type JSX } from "react";
import { bundledLanguages, codeToHast, type BundledLanguage } from "shiki/bundle/web";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = React.useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);
  return { copied, copy };
}

const PurePre = ({
  children,
  className,
  code,
  lang,
}: {
  children: any;
  className?: string;
  code: string;
  lang: string;
}) => {
  const { copied, copy } = useCopy();

  return (
    <pre className={cn("relative", className)}>
      <div className="p-1.5 border-b z-20">
        <div className="w-full flex z-20 py-0.5 px-3 items-center">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">{lang}</span>
          <Button
            size="sm"
            variant={copied ? "secondary" : "ghost"}
            className="ml-auto z-10 h-6 w-6 p-0"
            onClick={() => copy(code)}
          >
            {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
          </Button>
        </div>
      </div>
      <div className="relative overflow-x-auto px-4 py-3 text-xs">{children}</div>
    </pre>
  );
};

export async function Highlight(
  code: string,
  lang: BundledLanguage | (string & {}),
  theme: string,
) {
  const parsed: BundledLanguage = (
    bundledLanguages[lang as keyof typeof bundledLanguages] ? lang : "md"
  ) as BundledLanguage;

  const out = await codeToHast(code, {
    lang: parsed,
    theme,
  });

  return toJsxRuntime(out, {
    Fragment,
    jsx,
    jsxs,
    components: {
      pre: (props: any) => <PurePre {...props} code={code} lang={lang} />,
    },
  }) as JSX.Element;
}

export function CodeBlock({ children }: { children: any }) {
  const code = children?.props?.children ?? "";
  const { theme } = useTheme();
  const language = children?.props?.className?.split("-")?.[1] || "bash";
  const themeName = theme === "dark" ? "dark-plus" : "github-light";
  // Highlighted result keyed by the input it was produced for, so stale
  // results are ignored at render time without calling setState in an effect.
  const [highlighted, setHighlighted] = useState<{
    code: string;
    language: string;
    theme: string;
    el: JSX.Element;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Highlight(code, language, themeName)
      .then((result) => {
        if (!cancelled) {
          setHighlighted({ code, language, theme: themeName, el: result });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [themeName, language, code]);

  const isCurrent =
    highlighted !== null &&
    highlighted.code === code &&
    highlighted.language === language &&
    highlighted.theme === themeName;
  const loading = !isCurrent;

  return (
    <div
      className={cn(
        loading && "animate-pulse",
        "text-xs flex shadow-sm flex-col relative my-2 overflow-hidden",
      )}
    >
      {isCurrent ? (
        highlighted.el
      ) : (
        <PurePre code={code} lang={language}>
          {children}
        </PurePre>
      )}
    </div>
  );
}

export default CodeBlock;
