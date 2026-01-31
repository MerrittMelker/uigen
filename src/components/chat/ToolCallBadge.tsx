"use client";

import { Loader2, FileEdit, FilePlus, Eye, Trash2, FolderInput } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCallBadgeProps {
  toolName: string;
  state: "partial-call" | "call" | "result";
  args?: Record<string, any>;
  className?: string;
}

export function ToolCallBadge({ toolName, state, args, className }: ToolCallBadgeProps) {
  const isComplete = state === "result";
  const { message, icon: Icon } = getToolMessage(toolName, args);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200",
        className
      )}
    >
      {isComplete ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
          {Icon && <Icon className="w-3 h-3 text-neutral-600 flex-shrink-0" />}
          <span className="text-neutral-700 font-medium">{message}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
          {Icon && <Icon className="w-3 h-3 text-neutral-600 flex-shrink-0" />}
          <span className="text-neutral-700 font-medium">{message}</span>
        </>
      )}
    </div>
  );
}

function getToolMessage(
  toolName: string,
  args?: Record<string, any>
): { message: string; icon?: any } {
  if (!args) {
    return { message: toolName, icon: undefined };
  }

  // Handle str_replace_editor tool
  if (toolName === "str_replace_editor") {
    const command = args.command;
    const path = args.path || "file";
    const filename = path.split("/").pop() || path;

    switch (command) {
      case "create":
        return { message: `Creating ${filename}`, icon: FilePlus };
      case "str_replace":
        return { message: `Editing ${filename}`, icon: FileEdit };
      case "insert":
        return { message: `Editing ${filename}`, icon: FileEdit };
      case "view":
        return { message: `Viewing ${filename}`, icon: Eye };
      case "undo_edit":
        return { message: `Undoing changes to ${filename}`, icon: FileEdit };
      default:
        return { message: `Modifying ${filename}`, icon: FileEdit };
    }
  }

  // Handle file_manager tool
  if (toolName === "file_manager") {
    const command = args.command;
    const path = args.path || "file";
    const filename = path.split("/").pop() || path;

    switch (command) {
      case "delete":
        return { message: `Deleting ${filename}`, icon: Trash2 };
      case "rename":
        const newPath = args.new_path || "";
        const newFilename = newPath.split("/").pop() || newPath;
        return { message: `Renaming ${filename} to ${newFilename}`, icon: FolderInput };
      default:
        return { message: `Managing ${filename}`, icon: FolderInput };
    }
  }

  // Fallback for unknown tools
  return { message: toolName, icon: undefined };
}
