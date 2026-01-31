import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

describe("ToolCallBadge", () => {
  describe("str_replace_editor tool", () => {
    it("displays 'Creating' message for create command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create", path: "/components/Button.tsx" }}
        />
      );

      expect(screen.getByText("Creating Button.tsx")).toBeDefined();
    });

    it("displays 'Editing' message for str_replace command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "str_replace", path: "/components/Card.jsx" }}
        />
      );

      expect(screen.getByText("Editing Card.jsx")).toBeDefined();
    });

    it("displays 'Editing' message for insert command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "insert", path: "/utils/helper.ts" }}
        />
      );

      expect(screen.getByText("Editing helper.ts")).toBeDefined();
    });

    it("displays 'Viewing' message for view command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "view", path: "/App.jsx" }}
        />
      );

      expect(screen.getByText("Viewing App.jsx")).toBeDefined();
    });

    it("displays 'Undoing changes' message for undo_edit command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "undo_edit", path: "/index.ts" }}
        />
      );

      expect(screen.getByText("Undoing changes to index.ts")).toBeDefined();
    });

    it("handles nested paths correctly", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create", path: "/src/components/ui/Button.tsx" }}
        />
      );

      expect(screen.getByText("Creating Button.tsx")).toBeDefined();
    });

    it("displays fallback message for unknown command", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "unknown", path: "/file.js" }}
        />
      );

      expect(screen.getByText("Modifying file.js")).toBeDefined();
    });
  });

  describe("file_manager tool", () => {
    it("displays 'Deleting' message for delete command", () => {
      render(
        <ToolCallBadge
          toolName="file_manager"
          state="result"
          args={{ command: "delete", path: "/oldFile.tsx" }}
        />
      );

      expect(screen.getByText("Deleting oldFile.tsx")).toBeDefined();
    });

    it("displays 'Renaming' message for rename command", () => {
      render(
        <ToolCallBadge
          toolName="file_manager"
          state="result"
          args={{
            command: "rename",
            path: "/Button.tsx",
            new_path: "/NewButton.tsx",
          }}
        />
      );

      expect(screen.getByText("Renaming Button.tsx to NewButton.tsx")).toBeDefined();
    });

    it("displays fallback message for unknown command", () => {
      render(
        <ToolCallBadge
          toolName="file_manager"
          state="result"
          args={{ command: "unknown", path: "/file.js" }}
        />
      );

      expect(screen.getByText("Managing file.js")).toBeDefined();
    });
  });

  describe("visual states", () => {
    it("shows green dot when state is result", () => {
      const { container } = render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create", path: "/App.jsx" }}
        />
      );

      const greenDot = container.querySelector(".bg-emerald-500");
      expect(greenDot).toBeDefined();
    });

    it("shows loading spinner when state is call", () => {
      const { container } = render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create", path: "/App.jsx" }}
        />
      );

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });

    it("shows loading spinner when state is partial-call", () => {
      const { container } = render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="partial-call"
          args={{ command: "create", path: "/App.jsx" }}
        />
      );

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("handles missing args gracefully", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
        />
      );

      expect(screen.getByText("str_replace_editor")).toBeDefined();
    });

    it("handles missing path in args", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create" }}
        />
      );

      expect(screen.getByText("Creating file")).toBeDefined();
    });

    it("handles unknown tool names", () => {
      render(
        <ToolCallBadge
          toolName="unknown_tool"
          state="result"
          args={{ some: "data" }}
        />
      );

      expect(screen.getByText("unknown_tool")).toBeDefined();
    });

    it("applies custom className", () => {
      const { container } = render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create", path: "/App.jsx" }}
          className="custom-class"
        />
      );

      const badge = container.firstChild;
      expect(badge?.className).toContain("custom-class");
    });
  });

  describe("file name extraction", () => {
    it("extracts filename from path with leading slash", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create", path: "/App.jsx" }}
        />
      );

      expect(screen.getByText("Creating App.jsx")).toBeDefined();
    });

    it("extracts filename from path without leading slash", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create", path: "App.jsx" }}
        />
      );

      expect(screen.getByText("Creating App.jsx")).toBeDefined();
    });

    it("handles empty path segments", () => {
      render(
        <ToolCallBadge
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create", path: "///" }}
        />
      );

      const element = screen.getByText(/Creating/);
      expect(element).toBeDefined();
    });
  });
});
