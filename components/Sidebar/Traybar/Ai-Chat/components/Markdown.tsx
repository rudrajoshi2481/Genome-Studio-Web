"use client";

import { memo, type JSX } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "./CodeBlock";
import { Mermaid } from "./Mermaid";
import { cn } from "@/lib/utils";
import { LinkIcon } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const components: Partial<Components> = {
  table: ({ children, ...props }) => {
    return (
      <div className="my-2 w-full">
        <Table {...(props as any)}>{children}</Table>
      </div>
    );
  },
  thead: ({ children, ...props }) => {
    return <TableHeader {...(props as any)}>{children}</TableHeader>;
  },
  tbody: ({ children, ...props }) => {
    return <TableBody {...(props as any)}>{children}</TableBody>;
  },
  tr: ({ children, ...props }) => {
    return <TableRow {...(props as any)}>{children}</TableRow>;
  },
  th: ({ children, ...props }) => {
    return (
      <TableHead {...(props as any)}>
        {children}
      </TableHead>
    );
  },
  td: ({ children, ...props }) => {
    return (
      <TableCell {...(props as any)}>
        {children}
      </TableCell>
    );
  },
  code: ({ children, className, ...props }) => {
    return (
      <code className="text-[13px] text-primary px-1.5 py-0.5 mx-0.5 font-mono" {...(props as any)}>
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => {
    return (
      <div className="px-1">
        <blockquote className="relative p-2 my-1 overflow-hidden border-l-2 border-primary/40">
          {children}
        </blockquote>
      </div>
    );
  },
  p: ({ children }) => {
    return (
      <p className="leading-normal my-0 break-words text-sm font-source-sans">
        {children}
      </p>
    );
  },
  pre: ({ children }) => {
    // Check if this is a mermaid code block by inspecting the child <code> element
    const child = Array.isArray(children) ? children[0] : children;
    const childProps = (child as any)?.props;
    const childClassName = childProps?.className || "";
    const langMatch = /language-(\w+)/.exec(childClassName);
    if (langMatch && langMatch[1] === "mermaid") {
      // Extract the raw chart text from the code element's children
      const chart = String(childProps?.children ?? "").replace(/\n$/, "");
      return (
        <div className="my-1">
          <Mermaid chart={chart} />
        </div>
      );
    }
    return (
      <div className="my-1">
        <CodeBlock>{children}</CodeBlock>
      </div>
    );
  },
  ol: ({ children, ...props }) => {
    return (
      <ol className="pl-5 list-decimal list-outside text-sm space-y-0.5" {...(props as any)}>
        {children}
      </ol>
    );
  },
  li: ({ children, ...props }) => {
    return (
      <li className="py-0.5 break-words text-sm leading-normal font-source-sans" {...(props as any)}>
        {children}
      </li>
    );
  },
  ul: ({ children, ...props }) => {
    return (
      <ul className="pl-5 list-outside list-disc text-sm space-y-0.5" {...(props as any)}>
        {children}
      </ul>
    );
  },
  strong: ({ children, ...props }) => {
    return (
      <span className="font-semibold font-source-sans" {...(props as any)}>
        {children}
      </span>
    );
  },
  a: ({ children, ...props }) => {
    return (
      <a
        className="text-blue-600 dark:text-blue-400 hover:underline inline-flex gap-1 items-center text-sm font-medium font-source-sans"
        target="_blank"
        rel="noopener noreferrer"
        {...(props as any)}
      >
        <LinkIcon className="size-3.5 shrink-0" />
        {children}
      </a>
    );
  },
  h1: ({ children, ...props }) => {
    return (
      <h1 className="text-base font-semibold mt-3 mb-1 border-b border-border/50 pb-1 font-serif" {...(props as any)}>
        {children}
      </h1>
    );
  },
  h2: ({ children, ...props }) => {
    return (
      <h2 className="text-base font-semibold mt-2.5 mb-1 font-serif" {...(props as any)}>
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }) => {
    return (
      <h3 className="text-sm font-semibold mt-2 mb-0.5 font-serif" {...(props as any)}>
        {children}
      </h3>
    );
  },
  h4: ({ children, ...props }) => {
    return (
      <h4 className="text-sm font-semibold mt-2 mb-0.5 font-serif" {...(props as any)}>
        {children}
      </h4>
    );
  },
  h5: ({ children, ...props }) => {
    return (
      <h5 className="text-xs font-semibold mt-1.5 mb-0.5 font-serif" {...(props as any)}>
        {children}
      </h5>
    );
  },
  h6: ({ children, ...props }) => {
    return (
      <h6 className="text-xs font-semibold mt-1.5 mb-0.5 font-serif" {...(props as any)}>
        {children}
      </h6>
    );
  },
  img: ({ src, alt, ...rest }) => {
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="mx-auto max-w-full my-1.5" src={src as string} alt={alt} {...(rest as any)} />
    ) : null;
  },
  hr: () => <hr className="my-2 border-border/60" />,
};

function autoLinkify(text: string): string {
  let result = text;
  // Linkify PubMed IDs: "PubMed ID: 42390754" or "(PubMed ID: 42390754)"
  result = result.replace(
    /\(?\s*PubMed ID:?\s*(\d+)\s*\)?/gi,
    (_m, id: string) => `[PubMed ID: ${id}](https://pubmed.ncbi.nlm.nih.gov/${id}/)`,
  );
  // Linkify PMIDs: "PMID: 42390754" or "PMID 42390754"
  result = result.replace(
    /\bPMID:?\s*(\d+)\b/gi,
    (_m, id: string) => `[PMID: ${id}](https://pubmed.ncbi.nlm.nih.gov/${id}/)`,
  );
  // Linkify bare URLs that aren't already inside markdown link syntax
  // Negative lookbehind for ]( to avoid double-linking existing markdown links
  result = result.replace(
    /(?<!\]\()https?:\/\/(?!pubmed\.ncbi\.nlm\.nih\.gov\/\d)[^\s<)\]]+/g,
    (url) => `[${url}](${url})`,
  );
  return result;
}

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const processed = autoLinkify(children);
  return (
    <article className="w-full max-w-full relative">
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
      >
        {processed}
      </ReactMarkdown>
    </article>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

export default Markdown;
