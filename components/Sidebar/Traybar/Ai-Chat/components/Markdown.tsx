"use client";

import { memo, type JSX } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "./CodeBlock";
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
  code: ({ children }) => {
    return (
      <code className="text-[11px] text-primary px-1.5 py-0.5 mx-0.5 font-mono">
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
      <p className="leading-normal my-1 break-words text-xs">
        {children}
      </p>
    );
  },
  pre: ({ children }) => {
    return (
      <div className="my-2">
        <CodeBlock>{children}</CodeBlock>
      </div>
    );
  },
  ol: ({ children, ...props }) => {
    return (
      <ol className="pl-5 list-decimal list-outside text-xs space-y-0.5" {...(props as any)}>
        {children}
      </ol>
    );
  },
  li: ({ children, ...props }) => {
    return (
      <li className="py-0.5 break-words text-xs leading-normal" {...(props as any)}>
        {children}
      </li>
    );
  },
  ul: ({ children, ...props }) => {
    return (
      <ul className="pl-5 list-outside list-disc text-xs space-y-0.5" {...(props as any)}>
        {children}
      </ul>
    );
  },
  strong: ({ children, ...props }) => {
    return (
      <span className="font-semibold" {...(props as any)}>
        {children}
      </span>
    );
  },
  a: ({ children, ...props }) => {
    return (
      <a
        className="text-primary hover:underline inline-flex gap-1 items-center text-xs font-medium"
        target="_blank"
        rel="noreferrer"
        {...(props as any)}
      >
        <LinkIcon className="size-3 shrink-0" />
        {children}
      </a>
    );
  },
  h1: ({ children, ...props }) => {
    return (
      <h1 className="text-sm font-semibold mt-3 mb-1 border-b border-border/50 pb-1" {...(props as any)}>
        {children}
      </h1>
    );
  },
  h2: ({ children, ...props }) => {
    return (
      <h2 className="text-sm font-semibold mt-2.5 mb-1" {...(props as any)}>
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }) => {
    return (
      <h3 className="text-xs font-semibold mt-2 mb-0.5" {...(props as any)}>
        {children}
      </h3>
    );
  },
  h4: ({ children, ...props }) => {
    return (
      <h4 className="text-xs font-semibold mt-2 mb-0.5" {...(props as any)}>
        {children}
      </h4>
    );
  },
  h5: ({ children, ...props }) => {
    return (
      <h5 className="text-xs font-semibold mt-1.5 mb-0.5" {...(props as any)}>
        {children}
      </h5>
    );
  },
  h6: ({ children, ...props }) => {
    return (
      <h6 className="text-xs font-semibold mt-1.5 mb-0.5" {...(props as any)}>
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

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <article className="w-full max-w-full relative">
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </article>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

export default Markdown;
