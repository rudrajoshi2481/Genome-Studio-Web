import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AIChatProps {
  className?: string;
}

export function AIChat({ className }: AIChatProps) {
  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="h-12 border-b bg-muted/20 px-4 flex items-center justify-between backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <span className="font-medium">AI Assistant</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Start a conversation with the AI assistant...
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t bg-muted/20 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 space-y-4">
          <div className="relative">
            <Textarea
              placeholder="Type your prompt here..."
              className="w-full min-h-[80px] resize-none px-4 py-3 rounded-md bg-background border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end">
            <Button className="gap-2">
              Generate Flow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
