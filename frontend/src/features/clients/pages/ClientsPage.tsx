import { useMsal } from '@azure/msal-react';
import { Building2, MoreHorizontal, PencilLine, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuthZ } from '@/auth/useAuthZ';
import { themeClasses } from '@/theme/themeClasses';

import { listClients, retireClient, type ClientRecord } from '../api';
import ClientsPageLayout from '../components/ClientsPageLayout';

function ClientInventoryActionButton({
  label,
  icon,
  onClick,
  destructive = false,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition',
        destructive
          ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      <span className="h-4 w-4">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function ClientsPage() {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const { ready, isAdmin, roles } = useAuthZ(instance);
  const normalizedRoles = roles.map((role) => (role || '').toLowerCase());
  const isEnvironmentManager =
    normalizedRoles.includes('environmentmanager') || normalizedRoles.includes('environment-manager');
  const canManage = ready && (isAdmin || isEnvironmentManager);
  const canView = canManage;
  const canEdit = canManage;
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeRetired, setIncludeRetired] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [confirm, setConfirm] = useState<ClientRecord | null>(null);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listClients(instance, { retired: includeRetired, search: search || undefined })
      .then((response) => {
        if (cancelled) return;
        setClients(response.clients);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load clients.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canView, includeRetired, instance, refreshNonce, search]);

  const summary = useMemo(
    () => ({
      total: clients.length,
      retired: clients.filter((client) => client.retired).length,
      active: clients.filter((client) => !client.retired).length,
    }),
    [clients],
  );

  async function handleRetire() {
    if (!confirm) return;
    try {
      await retireClient(instance, confirm.id);
      enqueueSnackbar('Client retired', { variant: 'success' });
      setConfirm(null);
      setRefreshNonce((value) => value + 1);
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to retire client', { variant: 'error' });
    }
  }

  return (
    <ClientsPageLayout
      title="Clients"
      description="Manage canonical client records used by environments, schedules, and future cross-domain features."
      loading={loading}
      actions={
        <>
          <button
            type="button"
            className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
            onClick={() => setRefreshNonce((value) => value + 1)}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
          {canEdit ? (
            <button
              type="button"
              className={`${themeClasses.buttonPrimary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
              onClick={() => navigate('/clients/create')}
            >
              <Plus className="h-4 w-4" />
              New client
            </button>
          ) : null}
        </>
      }
    >
      <section className={`${themeClasses.formSection} rounded-3xl p-4`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <input
              className={`${themeClasses.field} w-full max-w-md rounded-lg px-3 py-2 text-sm`}
              placeholder="Search clients..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <label className={`${themeClasses.helperText} inline-flex items-center gap-2`}>
              <input checked={includeRetired} onChange={(event) => setIncludeRetired(event.target.checked)} type="checkbox" />
              Include retired
            </label>
          </div>
          <div className={`${themeClasses.helperText} flex items-center gap-4 text-sm`}>
            <span>{summary.active} active</span>
            <span>{summary.retired} retired</span>
            <span>{summary.total} total</span>
          </div>
        </div>
      </section>

      {error ? (
        <div className={`${themeClasses.emptyState} rounded-3xl px-5 py-8 text-sm`}>{error}</div>
      ) : !canView ? (
        <div className={`${themeClasses.emptyState} rounded-3xl px-5 py-8 text-sm`}>You do not have access to client management.</div>
      ) : !loading && clients.length === 0 ? (
        <div className={`${themeClasses.emptyState} rounded-3xl px-5 py-8 text-sm`}>
          No clients found. Create the first client record to start using a canonical client identity.
        </div>
      ) : clients.length > 0 ? (
        <div className="space-y-4">
          {clients.map((client) => (
            <article key={client.id} className={`${themeClasses.formSection} group rounded-3xl p-5`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-hover)]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <div className={themeClasses.inventoryTitle}>{client.name}</div>
                        <div className={`${themeClasses.inlineMetadata} flex flex-wrap items-center gap-x-3 gap-y-1.5`}>
                          <span className={`${themeClasses.badge} rounded-full px-3 py-1 text-xs`}>{client.shortCode}</span>
                          <span>{client.country}</span>
                          <span>{client.timezone}</span>
                          {client.retired ? (
                            <span className={`${themeClasses.warningChip} px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em]`}>
                              Retired
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`${themeClasses.helperText} flex flex-wrap items-center gap-2`}>
                    <span className={`${themeClasses.sectionEyebrow}`}>Client admins</span>
                    {client.clientAdmins.map((admin) => (
                      <span key={admin.id} className={`${themeClasses.badge} rounded-full px-3 py-1 text-[11px]`}>
                        {admin.displayName || admin.id}
                      </span>
                    ))}
                  </div>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <div
                      className={[
                        'flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-1 py-1 shadow-sm',
                        'md:invisible md:max-w-0 md:translate-x-2 md:overflow-hidden md:border-transparent md:bg-transparent md:px-0 md:py-0 md:opacity-0 md:shadow-none md:pointer-events-none',
                        'md:group-hover:visible md:group-hover:max-w-[18rem] md:group-hover:translate-x-0 md:group-hover:border-[var(--border-subtle)] md:group-hover:bg-[var(--surface-elevated)] md:group-hover:px-1 md:group-hover:py-1 md:group-hover:opacity-100 md:group-hover:shadow-sm md:group-hover:pointer-events-auto',
                        'md:group-focus-within:visible md:group-focus-within:max-w-[18rem] md:group-focus-within:translate-x-0 md:group-focus-within:border-[var(--border-subtle)] md:group-focus-within:bg-[var(--surface-elevated)] md:group-focus-within:px-1 md:group-focus-within:py-1 md:group-focus-within:opacity-100 md:group-focus-within:shadow-sm md:group-focus-within:pointer-events-auto',
                      ].join(' ')}
                    >
                      <ClientInventoryActionButton
                        label="Edit"
                        icon={<PencilLine className="h-4 w-4" />}
                        onClick={() => navigate(`/clients/${client.id}/edit`)}
                      />
                      {!client.retired ? (
                        <ClientInventoryActionButton
                          label="Retire"
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() => setConfirm(client)}
                          destructive
                        />
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className={`${themeClasses.iconButton} inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)]`}
                      aria-label={`Actions for ${client.name}`}
                      title="Show actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Retire client?"
        message={
          confirm
            ? `This will logically retire ${confirm.name} (${confirm.shortCode}).\n\nCountry: ${confirm.country}\nTimezone: ${confirm.timezone}\nClient admins: ${confirm.clientAdmins.map((admin) => admin.id).join(', ')}`
            : ''
        }
        confirmLabel="Retire client"
        cancelLabel="Cancel"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void handleRetire()}
      />
    </ClientsPageLayout>
  );
}
