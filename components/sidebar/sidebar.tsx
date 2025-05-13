import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="h-12 border-b px-4 flex items-center">
        <span className="font-semibold">Genome Studio</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* File list will go here */}
          <div className="text-sm text-muted-foreground">No files yet</div>
        </div>
      </ScrollArea>
    </div>
  );
}
