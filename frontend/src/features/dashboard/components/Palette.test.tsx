import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/widgets/registry", () => ({
  getWidgetOptions: () => [
    { type: "clock", title: "Clock widget", icon: null },
    { type: "counter", title: "Counter widget", icon: null },
  ],
}));

import Palette from "./Palette";

describe("Palette", () => {
  it("adds the selected widget and closes the palette", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onClose = vi.fn();

    render(<Palette open onClose={onClose} onAdd={onAdd} />);

    await user.click(screen.getByText("Clock widget"));

    expect(onAdd).toHaveBeenCalledWith("clock");
    expect(onClose).toHaveBeenCalled();
  });
});
