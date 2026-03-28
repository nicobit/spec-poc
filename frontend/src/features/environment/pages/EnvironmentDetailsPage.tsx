import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { EnvInstance, getActivity, listEnvironments, getEnvironment, startEnvironment, stopEnvironment, startStage, stopStage } from '../api';
import { useAuthZ } from '@/auth/useAuthZ';
import ConfirmDialog from '@/components/ConfirmDialog';
import { enqueueSnackbar } from 'notistack';
import { themeClasses } from '@/theme/themeClasses';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';

export default function EnvironmentDetailsPage() {
  const { id } = useParams();
  const { instance } = useMsal();
  const navigate = useNavigate();
  const location = useLocation();
  const [env, setEnv] = useState<EnvInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const { ready: authReady, isAdmin, roles } = useAuthZ(instance);

  const canEdit = authReady && (isAdmin || roles.some((r: string) => ['environmentadmin', 'environmenteditor', 'environment-manager', 'environment-manager'].includes((r || '').toLowerCase())));
  const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message?: string; onConfirm?: () => Promise<void> }>(() => ({ open: false }));

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    void (async () => {
      try {
        const details = await getEnvironment(instance, id);
        if (!mounted) return;
        // backend returns canonical environment fields at top-level and may include schedules and activity
        setEnv(details);
      } finally {
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [id, instance]);

  if (!id) return <div className="p-4">Missing environment id</div>;

  return (
    <EnvironmentPageLayout title="Environment Details" description="Inspect stages and per-stage Azure configuration." actions={
      <>
        {canEdit ? (
          <>
            <button className={`${themeClasses.buttonPrimary} rounded px-3 py-1.5 text-sm`} onClick={() => {
              if (!id) return;
              setConfirmState({ open: true, title: 'Start environment', message: 'Start this environment?', onConfirm: async () => {
                try {
                  await startEnvironment(instance, id);
                  setEnv((e) => {
                    if (!e) return e;
                    const copy: any = { ...e };
                    if (copy.stages && copy.stages.length > 0) {
                      copy.stages[0] = { ...copy.stages[0], status: 'starting' };
                      copy.status = 'starting';
                    }
                    return copy;
                  });
                } catch (err) {
                  enqueueSnackbar('Failed to start environment.', { variant: 'error' });
                  // eslint-disable-next-line no-console
                  console.error('startEnvironment failed', err);
                }
              } });
            }}>Start</button>
            <button className={`${themeClasses.buttonSecondary} rounded px-3 py-1.5 text-sm`} onClick={() => {
              if (!id) return;
              setConfirmState({ open: true, title: 'Stop environment', message: 'Stop this environment?', onConfirm: async () => {
                try {
                  await stopEnvironment(instance, id);
                  setEnv((e) => {
                    if (!e) return e;
                    const copy: any = { ...e };
                    if (copy.stages && copy.stages.length > 0) {
                      copy.stages[0] = { ...copy.stages[0], status: 'stopping' };
                      copy.status = 'stopping';
                    }
                    return copy;
                  });
                } catch (err) {
                  enqueueSnackbar('Failed to stop environment.', { variant: 'error' });
                  // eslint-disable-next-line no-console
                  console.error('stopEnvironment failed', err);
                }
              } });
            }}>Stop</button>
          </>
        ) : null}
        <button className={`${themeClasses.buttonSecondary} rounded px-3 py-1.5 text-sm`} onClick={() => {
          try { navigate(-1); } catch { navigate('/environment/manage'); }
        }}>Back</button>
      </>
    }>

      {loading ? (
        <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading...</div>
      ) : !env ? (
        <div className="rounded-2xl border border-red-200 p-4">Environment not found.</div>
      ) : (
        <div className="space-y-4">
          <div className="ui-panel rounded-2xl p-4">
            <h2 className="text-lg font-medium">{env.name}</h2>
            <div className="text-sm ui-text-muted">{[env.region, env.client, env.lifecycle].filter(Boolean).join(' | ')}</div>
          </div>

          <div className="space-y-3">
            {env.stages.map((s) => (
              <div key={s.id} className="ui-panel rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm ui-text-muted">Status: {s.status}</div>
                  </div>
                  <div className="text-sm ui-text-muted">{s.resourceActions.length} actions</div>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-medium">Azure config</div>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">{JSON.stringify(s.azureConfig || {}, null, 2)}</pre>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {/* Stage actions */}
                  <button className={`${themeClasses.buttonPrimary} rounded px-2 py-1 text-sm`} onClick={() => {
                    setConfirmState({ open: true, title: `Start stage ${s.name}`, message: `Start stage ${s.name}?`, onConfirm: async () => {
                      try {
                        await startStage(instance, (env as any).id, s.id);
                        setEnv((e) => {
                          if (!e) return e;
                          const copy: any = { ...e };
                          copy.stages = copy.stages.map((st: any) => (st.id === s.id ? { ...st, status: 'starting' } : st));
                          return copy;
                        });
                      } catch (err) {
                        enqueueSnackbar(`Failed to start stage ${s.name}.`, { variant: 'error' });
                        // eslint-disable-next-line no-console
                        console.error('startStage failed', err);
                      }
                    } });
                  }}>Start stage</button>
                  <button className={`${themeClasses.buttonSecondary} rounded px-2 py-1 text-sm`} onClick={() => {
                    setConfirmState({ open: true, title: `Stop stage ${s.name}`, message: `Stop stage ${s.name}?`, onConfirm: async () => {
                      try {
                        await stopStage(instance, (env as any).id, s.id);
                        setEnv((e) => {
                          if (!e) return e;
                          const copy: any = { ...e };
                          copy.stages = copy.stages.map((st: any) => (st.id === s.id ? { ...st, status: 'stopping' } : st));
                          return copy;
                        });
                      } catch (err) {
                        enqueueSnackbar(`Failed to stop stage ${s.name}.`, { variant: 'error' });
                        // eslint-disable-next-line no-console
                        console.error('stopStage failed', err);
                      }
                    } });
                  }}>Stop stage</button>
                </div>
              </div>
            ))}
          </div>
          {/* Schedules summary */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Schedules</h3>
            {Array.isArray((env as any).schedules) && (env as any).schedules.length > 0 ? (
              <div className="space-y-2">
                {(env as any).schedules.map((sch: any) => (
                  <div key={sch.id || sch.name || Math.random()} className="ui-panel rounded p-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{sch.action} — {sch.stage || ''}</div>
                      <div className="text-sm ui-text-muted">Next run: {sch.next_run || 'n/a'}</div>
                    </div>
                    <div className="text-sm ui-text-muted">{sch.id}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ui-panel-muted rounded p-3 text-sm">No schedules configured.</div>
            )}
          </div>

          {/* Activity timeline (recent) */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Recent activity</h3>
            {((env as any).activity && (env as any).activity.entries && (env as any).activity.entries.length > 0) ? (
              <div className="space-y-2">
                {((env as any).activity.entries || []).map((a: any) => (
                  <div key={(a.RowKey || a.RowKey || Math.random()) as string} className="ui-panel rounded p-2">
                    <div className="text-sm font-medium">{a.action} — {a.status || ''}</div>
                    <div className="text-xs ui-text-muted">{a.timestamp}</div>
                    <div className="mt-2 text-sm">{a.message || JSON.stringify(a, null, 2)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ui-panel-muted rounded p-3 text-sm">No recent activity.</div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} onConfirm={async () => {
        const handler = confirmState.onConfirm;
        setConfirmState({ open: false });
        if (handler) await handler();
      }} onCancel={() => setConfirmState({ open: false })} />
    </EnvironmentPageLayout>
  );
}
