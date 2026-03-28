import { useEffect, useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { listEnvironments } from '@/features/environment/api';
import { themeClasses } from '@/theme/themeClasses';
import { useNavigate } from 'react-router-dom';

export default function EnvironmentSummary() {
  const { instance } = useMsal();
  const [envs, setEnvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resp = await listEnvironments(instance, { page: 0, perPage: 10 });
        if (!alive) return;
        setEnvs(resp.environments || []);
      } catch (_) {
        // ignore errors for dashboard
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [instance]);

  const stageCount = useMemo(() => envs.reduce((acc, e) => acc + (e.stages?.length || 0), 0), [envs]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Environments summary</h3>
        <div className="flex items-center gap-2">
          <button className={`${themeClasses.buttonSecondary} rounded px-2 py-1 text-sm`} onClick={() => navigate('/environment/manage')}>Manage</button>
        </div>
      </div>

      {loading ? (
        <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="ui-panel p-3 rounded">
            <div className="text-sm ui-text-muted">Environments</div>
            <div className="mt-1 text-2xl font-semibold">{envs.length}</div>
          </div>
          <div className="ui-panel p-3 rounded">
            <div className="text-sm ui-text-muted">Stages</div>
            <div className="mt-1 text-2xl font-semibold">{stageCount}</div>
          </div>
          <div className="ui-panel p-3 rounded">
            <div className="text-sm ui-text-muted">Recent</div>
            <div className="mt-1 text-sm">{envs.slice(0,3).map((e) => e.name).join(', ') || 'None'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
