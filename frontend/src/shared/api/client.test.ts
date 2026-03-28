import { describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({
  env: {
    apiBaseUrl: "https://example.test/api",
    tenantId: "tenant-id",
    redirectUri: "https://example.test",
    clientId: "client-id",
    apiClientId: "api-client-id",
  },
}));

import { apiUrl, withQuery } from "./client";

describe("api client helpers", () => {
  it("builds API URLs without duplicate slashes", () => {
    expect(apiUrl("/dashboard/data")).toBe("https://example.test/api/dashboard/data");
    expect(apiUrl("dashboard/data")).toBe("https://example.test/api/dashboard/data");
  });

  it("adds query string parameters", () => {
    expect(withQuery("https://example.test/api/dashboard", { q: "azure portal", limit: "10" })).toBe(
      "https://example.test/api/dashboard?q=azure+portal&limit=10"
    );
  });
});
