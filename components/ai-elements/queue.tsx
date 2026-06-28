"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronDownIcon,
  DotIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { memo } from "react";

export type QueueMessagePart =
  | {
      text: string;
      type: "text";
    }
  | {
      filename?: string;
      mediaType?: string;
      type: "file";
      url?: string;
    };

export interface QueueMessage {
  id: string;
  parts: QueueMessagePart[];
}

export interface QueueTodo {
  description?: string;
  id: string;
  status: "completed" | "pending";
  title: string;
}

export type QueueProps = ComponentProps<"div">;

export const Queue = memo(({ className, ...props }: QueueProps) => (
  <div
    className={cn(
      "not-prose w-full space-y-2 rounded-lg border bg-muted/30 p-2",
      className
    )}
    {...props}
  />
));

Queue.displayName = "Queue";

export type QueueSectionProps = ComponentProps<typeof Collapsible>;

export const QueueSection = memo(
  ({ className, ...props }: QueueSectionProps) => (
    <Collapsible
      className={cn("w-full", className)}
      defaultOpen
      {...props}
    />
  )
);

QueueSection.displayName = "QueueSection";

export type QueueSectionTriggerProps = ComponentProps<
  typeof CollapsibleTrigger
>;

export const QueueSectionTrigger = memo(
  ({ className, ...props }: QueueSectionTriggerProps) => (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      {...props}
    />
  )
);

QueueSectionTrigger.displayName = "QueueSectionTrigger";

export type QueueSectionLabelProps = ComponentProps<"div"> & {
  count?: number;
  label?: string;
};

export const QueueSectionLabel = memo(
  ({
    count,
    label = "Queued",
    className,
    ...props
  }: QueueSectionLabelProps) => (
    <div
      className={cn("flex flex-1 items-center gap-1.5", className)}
      {...props}
    >
      <span className="font-medium">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
          {count}
        </Badge>
      )}
    </div>
  )
);

QueueSectionLabel.displayName = "QueueSectionLabel";

export type QueueSectionContentProps = ComponentProps<
  typeof CollapsibleContent
>;

export const QueueSectionContent = memo(
  ({ className, ...props }: QueueSectionContentProps) => (
    <CollapsibleContent
      className={cn(
        "mt-1 space-y-1",
        "data-[state=closed]:fade-out-0 data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      {...props}
    />
  )
);

QueueSectionContent.displayName = "QueueSectionContent";

export type QueueListProps = ComponentProps<"div">;

export const QueueList = memo(({ className, ...props }: QueueListProps) => (
  <div className={cn("space-y-1", className)} {...props} />
));

QueueList.displayName = "QueueList";

export type QueueItemProps = ComponentProps<"div">;

export const QueueItem = memo(({ className, ...props }: QueueItemProps) => (
  <div
    className={cn(
      "group/queue-item rounded-md bg-background p-2 text-xs shadow-xs transition-colors hover:bg-accent/50",
      className
    )}
    {...props}
  />
));

QueueItem.displayName = "QueueItem";

export type QueueItemIndicatorProps = ComponentProps<"div"> & {
  completed?: boolean;
};

export const QueueItemIndicator = memo(
  ({ completed, className, ...props }: QueueItemIndicatorProps) => (
    <div
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border",
        completed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/30",
        className
      )}
      {...props}
    >
      {completed ? (
        <CheckIcon className="size-3" />
      ) : (
        <DotIcon className="size-4 text-muted-foreground/50" />
      )}
    </div>
  )
);

QueueItemIndicator.displayName = "QueueItemIndicator";

export type QueueItemContentProps = ComponentProps<"span"> & {
  completed?: boolean;
};

export const QueueItemContent = memo(
  ({
    completed,
    className,
    children,
    ...props
  }: QueueItemContentProps) => (
    <span
      className={cn(
        "flex-1 truncate text-xs",
        completed && "text-muted-foreground line-through",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
);

QueueItemContent.displayName = "QueueItemContent";

export type QueueItemDescriptionProps = ComponentProps<"p"> & {
  completed?: boolean;
};

export const QueueItemDescription = memo(
  ({
    completed,
    className,
    ...props
  }: QueueItemDescriptionProps) => (
    <p
      className={cn(
        "mt-1 text-xs text-muted-foreground",
        completed && "line-through",
        className
      )}
      {...props}
    />
  )
);

QueueItemDescription.displayName = "QueueItemDescription";

export type QueueItemActionsProps = ComponentProps<"div">;

export const QueueItemActions = memo(
  ({ className, ...props }: QueueItemActionsProps) => (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity group-hover/queue-item:opacity-100",
        className
      )}
      {...props}
    />
  )
);

QueueItemActions.displayName = "QueueItemActions";

export type QueueItemActionProps = ComponentProps<typeof Button>;

export const QueueItemAction = memo(
  ({ className, size = "sm", variant = "ghost", ...props }: QueueItemActionProps) => (
    <Button
      className={cn("size-6 p-0 text-muted-foreground hover:text-foreground", className)}
      size={size}
      variant={variant}
      {...props}
    />
  )
);

QueueItemAction.displayName = "QueueItemAction";

export type QueueItemAttachmentProps = ComponentProps<"div">;

export const QueueItemAttachment = memo(
  ({ className, ...props }: QueueItemAttachmentProps) => (
    <div
      className={cn("mt-1.5 flex flex-wrap items-center gap-1.5", className)}
      {...props}
    />
  )
);

QueueItemAttachment.displayName = "QueueItemAttachment";

export type QueueItemImageProps = ComponentProps<"img">;

export const QueueItemImage = memo(
  ({ className, ...props }: QueueItemImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn(
        "size-8 rounded border object-cover",
        className
      )}
      {...props}
    />
  )
);

QueueItemImage.displayName = "QueueItemImage";

export type QueueItemFileProps = ComponentProps<"div">;

export const QueueItemFile = memo(
  ({ className, children, ...props }: QueueItemFileProps) => (
    <div
      className={cn(
        "flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

QueueItemFile.displayName = "QueueItemFile";
