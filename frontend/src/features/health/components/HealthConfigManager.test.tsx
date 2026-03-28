import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const apiMethods = {
  getConfig: vi.fn(),
  listServices: vi.fn(),
  addService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
  putConfig: vi.fn(),
};

vi.mock("notistack", () => ({
  enqueueSnackbar: vi.fn(),
}));

vi.mock("@/hooks/useTailwindDarkMode", () => ({
  useTailwindDarkMode: () => false,
}));

vi.mock("@/hooks/useServicesConfigSchema", () => ({
  useServicesConfigSchema: vi.fn(),
}));

vi.mock("@/shared/ui/LazyMonacoEditor", () => ({
  default: ({ value, onChange }: { value: string; onChange?: (next: string) => void }) => (
    <textarea value={value} onChange={(event) => onChange?.(event.target.value)} />
  ),
}));

vi.mock("@/features/health/api/health_config", () => ({
  HealthConfigApi: vi.fn().mockImplementation(() => apiMethods),
  validateConfig: vi.fn().mockResolvedValue({ ok: true, errors: [] }),
}));

import HealthConfigManager from "./HealthConfigManager";

describe("HealthConfigManager", () => {
  it("loads config and opens the help modal", async () => {
    const user = userEvent.setup();
    apiMethods.getConfig.mockResolvedValue({
      etag: "etag-1",
      config: { default_timeout_seconds: 5, services: [] },
    });
    apiMethods.listServices.mockResolvedValue([]);

    render(<HealthConfigManager instance={{} as never} />);

    await waitFor(() => expect(screen.getByText("ETag:")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Show configuration instructions" }));

    expect(screen.getByText("How to configure service checks")).toBeTruthy();
  });
});
