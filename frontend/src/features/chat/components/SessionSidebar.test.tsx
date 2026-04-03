import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, vi, expect } from "vitest";

import SessionSidebar from "./SessionSidebar";
import { QueryContext } from "../contexts/QueryContext";

describe("SessionSidebar", () => {
  it("renders empty state when no sessions", () => {
    render(
      <QueryContext.Provider
        value={
          {
            queries: [],
            runQuery: async () => {},
            selectedIndex: null,
            selectQuery: () => {},
            setQueries: () => {},
            resetSession: () => {},
            sessions: [],
            activeSessionId: undefined,
            loadSessions: async () => {},
            loadSession: async () => {},
            renameSession: async () => {},
            deleteSession: async () => {},
          } as any
        }
      >
        <SessionSidebar />
      </QueryContext.Provider>,
    );

    expect(screen.getByText(/No past sessions/i)).toBeTruthy();
  });

  it("shows sessions and calls loadSession on click", async () => {
    const user = userEvent.setup();
    const mockLoad = vi.fn(async (id: string) => {});
    const sessions = [
      { id: "s-1", name: "First session", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), turnCount: 2 },
      { id: "s-2", name: "Second session", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), turnCount: 1 },
    ];

    render(
      <QueryContext.Provider
        value={
          {
            queries: [],
            runQuery: async () => {},
            selectedIndex: null,
            selectQuery: () => {},
            setQueries: () => {},
            resetSession: () => {},
            sessions,
            activeSessionId: undefined,
            loadSessions: async () => {},
            loadSession: mockLoad,
            renameSession: async () => {},
            deleteSession: async () => {},
          } as any
        }
      >
        <SessionSidebar />
      </QueryContext.Provider>,
    );

    expect(screen.getByText(/First session/)).toBeTruthy();
    await user.click(screen.getByText(/First session/));
    expect(mockLoad).toHaveBeenCalledWith("s-1");
  });

  it("allows inline rename via double-click and commits on Enter", async () => {
    const user = userEvent.setup();
    const mockRename = vi.fn(async (id: string, name: string) => {});
    const sessions = [
      { id: "s-3", name: "To rename", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), turnCount: 0 },
    ];

    render(
      <QueryContext.Provider
        value={
          {
            queries: [],
            runQuery: async () => {},
            selectedIndex: null,
            selectQuery: () => {},
            setQueries: () => {},
            resetSession: () => {},
            sessions,
            activeSessionId: undefined,
            loadSessions: async () => {},
            loadSession: async () => {},
            renameSession: mockRename,
            deleteSession: async () => {},
          } as any
        }
      >
        <SessionSidebar />
      </QueryContext.Provider>,
    );

    const label = screen.getByText(/To rename/);
    await user.dblClick(label);
    const input = screen.getByLabelText(/Rename session/i);
    await user.clear(input);
    await user.type(input, "Renamed{enter}");
    expect(mockRename).toHaveBeenCalledWith("s-3", "Renamed");
  });
});
