import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Chat from "./Chat";
import { QueryContext, type Query } from "../contexts/QueryContext";

vi.mock("./ResultsTable", () => ({ default: () => <div>Results table</div> }));
vi.mock("./BarChart", () => ({ default: () => <div>Bar chart</div> }));
vi.mock("./Reasoning", () => ({ default: () => <div>Reasoning panel</div> }));
vi.mock("./MermaidDiagram", () => ({ default: ({ chart }: { chart: string }) => <div>{chart}</div> }));
vi.mock("./Mermaid", () => ({ default: () => <div>Mermaid editor</div> }));

describe("Chat", () => {
  it("submits user input through the query context and clears the textarea", async () => {
    const user = userEvent.setup();
    const runQuery = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        }),
    );
    const setQueries = vi.fn();
    const selectQuery = vi.fn();

    const contextValue = {
      queries: [] as Query[],
      runQuery,
      selectedIndex: null,
      selectQuery,
      setQueries,
    };

    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    render(
      <QueryContext.Provider value={contextValue}>
        <Chat />
      </QueryContext.Provider>,
    );

    const textarea = screen.getByPlaceholderText("Ask anything") as HTMLTextAreaElement;
    await user.type(textarea, "show active users");
    await user.keyboard("{Enter}");

    expect(runQuery).toHaveBeenCalledWith("show active users");
    expect(textarea.value).toBe("");

    await waitFor(() => expect(screen.queryByText("Reasoning. Working on your question.")).toBeFalsy());
  });
});
