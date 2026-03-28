// src/auth/useAuthZ.ts
import { useEffect, useState } from "react";
import { IPublicClientApplication } from "@azure/msal-browser";
import { loginRequest } from "@/authConfig";
import { decodeJwt, JwtClaims } from "./jwt";
import { useMsal } from "@azure/msal-react";
import Unauthorized from "@/pages/Unauthorized";

export function useAuthZ(instance: IPublicClientApplication) {
  const [ready, setReady] = useState(false);
  const [claims, setClaims] = useState<JwtClaims | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Prefer id token claims from the signed-in account (MSAL stores them on the account object)
        const accounts = instance.getAllAccounts();
        const acct = accounts && accounts.length > 0 ? accounts[0] : null;
        if (acct && (acct.idTokenClaims || acct.idToken)) {
          // @ts-ignore - msal types may not expose idTokenClaims on the account
          const acctClaims = acct.idTokenClaims || acct.idToken;
          if (alive) {
            setClaims(acctClaims as JwtClaims);
            setToken(null);
          }
        } else {
          const res = await instance.acquireTokenSilent(loginRequest);
          if (!alive) return;
          setToken(res.accessToken);
          setClaims(decodeJwt(res.accessToken));
        }
      } catch {
        // not signed-in or consent missing
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [instance]);

  const roles = claims?.roles ?? [];
  const isAdmin = roles.includes("Admin");

  return { ready, token, claims, roles, isAdmin };
}

// Use this hook inside a React component instead of a standalone function
// Example usage: const { isAdmin } = useAuthZ(instance);
// Removed isAdmin() function to avoid useMsal() outside React context


export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { instance } = useMsal();
  const { ready, isAdmin } = useAuthZ(instance); // use instance from MSAL context
  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-600 dark:text-gray-300">
        Checking permissions...
      </div>
    );
  }
  return isAdmin ? <>{children}</> : <Unauthorized />;
}
