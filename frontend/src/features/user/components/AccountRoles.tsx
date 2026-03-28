import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

export default function AccountRoles() {
  const { instance, accounts } = useMsal();
  const account = accounts && accounts.length > 0 ? accounts[0] : null;
  const [roles, setRoles] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!account || !instance) return;

    (async () => {
      setLoading(true);
      try {
        // Try to get an id token via acquireTokenSilent to read claims reliably
        const silentReq = { scopes: ["User.Read"], account } as any;
        const resp = await instance.acquireTokenSilent(silentReq);
        const claims = (resp.idTokenClaims || {}) as any;
        if (mounted) {
          setRoles((claims.roles as string[]) || []);
          if (claims.groups) {
            // groups claim may be an array of ids
            setGroups(Array.isArray(claims.groups) ? (claims.groups as string[]) : [String(claims.groups)]);
          } else {
            setGroups(null);
          }
        }
      } catch (e) {
        // Fallback: try to inspect account object for idTokenClaims
        // (some MSAL runtime setups keep claims on the account)
        try {
          // @ts-ignore
          const acctClaims = (account.idTokenClaims || account.idToken || null) as any;
          if (mounted && acctClaims) {
            setRoles((acctClaims.roles as string[]) || []);
            if (acctClaims.groups) setGroups(Array.isArray(acctClaims.groups) ? (acctClaims.groups as string[]) : [String(acctClaims.groups)]);
            else setGroups(null);
          }
        } catch {
          if (mounted) {
            setRoles([]);
            setGroups(null);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [instance, account]);

  return (
    <div className="rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
      <h3 className="mb-2 text-lg font-medium">Account roles & groups</h3>
      {loading && <div className="text-sm text-gray-500">Checking token claims…</div>}

      <div className="mt-2">
        <strong>Roles</strong>
        {roles.length === 0 ? (
          <div className="ui-text-muted mt-1">No app roles present in token.</div>
        ) : (
          <ul className="list-disc list-inside mt-1">
            {roles.map((r) => (
              <li key={r} className="break-all">
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <strong>Groups</strong>
        {groups === null ? (
          <div className="ui-text-muted mt-1">Groups not present in token (requires Graph or token configuration).</div>
        ) : groups.length === 0 ? (
          <div className="ui-text-muted mt-1">No groups in token.</div>
        ) : (
          <ul className="list-disc list-inside mt-1">
            {groups.map((g) => (
              <li key={g} className="break-all">
                {g}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
