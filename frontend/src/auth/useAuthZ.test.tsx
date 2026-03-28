import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useMsalMock = vi.fn();

vi.mock("@azure/msal-react", () => ({
  useMsal: () => useMsalMock(),
}));

import { AdminOnly } from "./useAuthZ";

function makeJwt(payload: object) {
  const base64Url = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `header.${base64Url}.signature`;
}

describe("AdminOnly", () => {
  it("renders children for admin users", async () => {
    const instance = {
      // Simulate an already-signed-in account with id token claims so
      // useAuthZ resolves synchronously and sets isAdmin=true
      getAllAccounts: () => [{ idTokenClaims: { roles: ["Admin"] } }],
      acquireTokenSilent: vi.fn().mockResolvedValue({
        accessToken: makeJwt({ roles: ["Admin"] }),
      }),
    };
    useMsalMock.mockReturnValue({ instance });

    render(
      <AdminOnly>
        <div>Secret settings</div>
      </AdminOnly>
    );

    // Component should render the children for admin users
    await waitFor(() => expect(screen.getByText("Secret settings")).toBeTruthy());
  });

  it("renders access denied for non-admin users", async () => {
    const instance2 = {
      getAllAccounts: () => [{ idTokenClaims: { roles: ["Reader"] } }],
      acquireTokenSilent: vi.fn().mockResolvedValue({
        accessToken: makeJwt({ roles: ["Reader"] }),
      }),
    };
    useMsalMock.mockReturnValue({ instance: instance2 });

    render(
      <AdminOnly>
        <div>Secret settings</div>
      </AdminOnly>
    );

    await waitFor(() => expect(screen.getByText("Access denied")).toBeTruthy());
  });
});
