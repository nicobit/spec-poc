import React, { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';

import { themeClasses } from '@/theme/themeClasses';
import { listAudits, exportAudits, type AuditEntry } from '../api/audit';
import EnvironmentPageLayout from '@/features/environment/components/EnvironmentPageLayout';

export default function AuditHistoryPage() {
  const { instance } = useMsal();
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await listAudits(instance, { limit: 200 });
        if (!mounted) return;
        setAudits(res.audits || []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [instance]);

  const handleExport = async () => {
    try {
      const res = await exportAudits(instance, { limit: 1000 });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-export-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <EnvironmentPageLayout title="Audit & Execution History" description="Search and export audit events for the application.">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--text-secondary)]">Events: {audits.length}</div>
          <div>
            <button className={`${themeClasses.buttonPrimary} rounded-md px-3 py-1`} onClick={handleExport} disabled={loading}>
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center">Loading…</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : audits.length === 0 ? (
          <div className="py-8 text-center">No audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-left text-[var(--text-secondary)]">
                  <th className="w-1/6 px-3 py-2">Time</th>
                  <th className="w-1/6 px-3 py-2">Actor</th>
                  <th className="w-1/6 px-3 py-2">Action</th>
                  <th className="w-1/6 px-3 py-2">Resource</th>
                  <th className="w-1/6 px-3 py-2">Client</th>
                  <th className="w-1/6 px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2">{a.createdAt ? new Date(a.createdAt).toLocaleString() : 'n/a'}</td>
                    <td className="px-3 py-2">{a.actor || 'system'}</td>
                    <td className="px-3 py-2">{a.action || ''}</td>
                    <td className="px-3 py-2">{a.resource || ''}</td>
                    <td className="px-3 py-2">{a.client || ''}</td>
                    <td className="px-3 py-2">{typeof a.details === 'string' ? a.details : JSON.stringify(a.details || {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EnvironmentPageLayout>
  );
}
