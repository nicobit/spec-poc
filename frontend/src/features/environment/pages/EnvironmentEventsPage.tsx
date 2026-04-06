import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { themeClasses } from '@/theme/themeClasses';
import { listEnvironments, type EnvInstance } from '../api';

export default function EnvironmentEventsPage() {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const [environments, setEnvironments] = useState<EnvInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const resp = await listEnvironments(instance, { page: 0, perPage: 100 });
        if (!mounted) return;
        setEnvironments(resp.environments || []);
      } catch (err) {
        setEnvironments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [instance]);

  return (
    <div className="space-y-6">
      <div className={`${themeClasses.formSection} rounded-3xl p-6`}>
        <div className={themeClasses.sectionEyebrow}>Events</div>
        <div className="mt-2 text-sm text-[var(--text-secondary)]">Browse environment events and activity. Select an environment to view executions and detailed events.</div>
      </div>

      <div className={`${themeClasses.formSection} rounded-3xl p-6`}>
        {loading ? (
          <div className="py-8 text-center">Loading…</div>
        ) : environments.length === 0 ? (
          <div className="py-8 text-center">No environments found.</div>
        ) : (
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-[var(--text-secondary)]">
                <th className="pb-2">Environment</th>
                <th className="pb-2">Client</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Executions</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="align-top">
              {environments.map((env) => (
                <tr key={env.id} className="border-t">
                  <td className="py-3">{env.name}</td>
                  <td className="py-3">{env.client || '-'}</td>
                  <td className="py-3">{env.status || 'unknown'}</td>
                  <td className="py-3">{env.executionCount ?? (env.executions ? env.executions.length : 0)}</td>
                  <td className="py-3 text-right">
                    <button
                      className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
                      onClick={() => navigate(`/environment/${encodeURIComponent(env.id)}/executions`)}
                    >
                      View events
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
