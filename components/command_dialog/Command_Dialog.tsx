"use client";

import React, { useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { RefreshCwIcon } from "lucide-react";

/**
 * Refreshes the current window
 */
const refreshWindow = () => {
  window.location.reload();
};

export const CommandDialogComponent = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Add event listener for Ctrl+P
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+P (or Cmd+P on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault(); // Prevent default browser behavior
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRefresh = () => {
    setOpen(false); // Close the dialog first
    setTimeout(refreshWindow, 100); // Small delay to allow dialog to close
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} >
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Developer Tools">
            <CommandItem onSelect={handleRefresh}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Reload Developer Window
              <CommandShortcut>F5</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Tools">
            <CommandItem>Open Terminal</CommandItem>
            <CommandItem>Open File Explorer</CommandItem>
            <CommandItem>Open AI Chat</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>Profile</CommandItem>
            <CommandItem>Billing</CommandItem>
            <CommandItem>Settings</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export default CommandDialogComponent;
