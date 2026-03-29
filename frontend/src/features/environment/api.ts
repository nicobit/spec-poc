import { IPublicClientApplication } from "@azure/msal-browser";
import { authFetch, getJson, apiUrl, ensureOk, withQuery } from "@/shared/api/client";

export type ResourceAction =
  | {
      id?: string;
      type: 'sql-vm';
      subscriptionId?: string;
      resourceGroup?: string;
      region?: string;
      serverName?: string;
      properties?: {
        vmName?: string;
      };
    }
  | {
      id?: string;
      type: 'sql-managed-instance';
      subscriptionId?: string;
      resourceGroup?: string;
      region?: string;
      instanceName?: string;
      properties?: {
        managedInstanceName?: string;
      };
    }
  | {
      id?: string;
      type: 'synapse-sql-pool';
      subscriptionId?: string;
      resourceGroup?: string;
      region?: string;
      workspaceName?: string;
      sqlPoolName?: string;
      properties?: {
        workspaceName?: string;
        sqlPoolName?: string;
      };
    }
  | {
      id?: string;
      type: 'service-bus-message';
      subscriptionId?: string;
      resourceGroup?: string;
      region?: string;
      namespace?: string;
      queueOrTopic?: string;
      messageType?: string;
      properties?: {
        namespace?: string;
        entityType?: 'queue' | 'topic';
        entityName?: string;
        messageTemplate?: string;
      };
    };

export type NotificationGroup = {
  id?: string;
  name: string;
  recipients: string[];
};

export type PostponementPolicy = {
  enabled: boolean;
  maxPostponeMinutes?: number;
  maxPostponements?: number;
};

export type EnvironmentStage = {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  resourceActions: ResourceAction[];
  notificationGroups: NotificationGroup[];
  postponementPolicy?: PostponementPolicy;
  azureConfig?: Record<string, any>;
  latestExecution?: StageExecution | null;
  executions?: StageExecution[];
  executionCount?: number;
};

export type EnvInstance = {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  region?: string;
  client?: string;
  clientId?: string;
  lifecycle?: string;
  stages: EnvironmentStage[];
  schedules?: Schedule[];
  executions?: StageExecution[];
  activity?: {
    entries?: ActivityEntry[];
    total?: number;
  };
};

export type StageExecutionActionResult = {
  resourceActionId: string;
  type: string;
  status: 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'skipped';
  subscriptionId?: string | null;
  region?: string | null;
  resourceIdentifier?: string | null;
  message?: string | null;
  errorCode?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type StageExecution = {
  id: string;
  executionId: string;
  clientId: string;
  environmentId: string;
  stageId: string;
  scheduleId?: string | null;
  action: 'start' | 'stop';
  source: 'portal' | 'schedule';
  requestedAt: string;
  requestedBy?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  status: 'pending' | 'in_progress' | 'succeeded' | 'partially_failed' | 'failed';
  resourceActionResults: StageExecutionActionResult[];
  message?: string | null;
  correlationId?: string | null;
  environmentName?: string | null;
  stageName?: string | null;
};

export type Schedule = {
  id: string;
  environment_id?: string;
  environment: string;
  client_id?: string;
  stage_id?: string;
  client: string;
  stage: string;
  action: string;
  cron?: string;
  timezone?: string;
  enabled: boolean;
  notify_before_minutes?: number;
  notification_groups?: NotificationGroup[];
  postponement_policy?: PostponementPolicy;
  postponement_count?: number;
  postponed_until?: string | null;
  postponed_by?: string | null;
  postpone_reason?: string | null;
  next_run?: string | null;
  latestExecution?: StageExecution | null;
  executionCount?: number;
};

export async function listEnvironments(
  msalInstance: IPublicClientApplication,
  options?: { client?: string; stage?: string; page?: number; perPage?: number; sortBy?: string; sortDir?: 'asc' | 'desc' },
): Promise<{ environments: EnvInstance[]; total: number; page: number; per_page: number }> {
  const params: Record<string, string | number | undefined> = {
    client: options?.client,
    stage: options?.stage,
    page: options?.page ?? 0,
    per_page: Math.min(options?.perPage ?? 10, 10),
    sort_by: options?.sortBy,
    sort_dir: options?.sortDir,
  };
  const url = withQuery(apiUrl('/environments'), params as any);
  const res = await authFetch(msalInstance, url, { method: 'GET' });
  const body = await getJson<{ environments?: EnvInstance[]; total?: number; page?: number; per_page?: number }>(res);
  return { environments: body.environments || [], total: body.total || 0, page: body.page ?? 0, per_page: body.per_page ?? 0 };
}

export async function getEnvironment(
  msalInstance: IPublicClientApplication,
  id: string,
): Promise<EnvInstance> {
  const res = await authFetch(msalInstance, apiUrl(`/environments/${encodeURIComponent(id)}`), { method: 'GET' });
  const body = await getJson<EnvInstance>(res);
  return body;
}

export async function createEnvironment(msalInstance: IPublicClientApplication, payload: Partial<EnvInstance>): Promise<EnvInstance> {
  const res = await authFetch(msalInstance, apiUrl('/environments'), { method: 'POST', body: JSON.stringify(payload) });
  const body = await getJson<{ created: EnvInstance }>(res);
  return body.created;
}

export async function updateEnvironment(msalInstance: IPublicClientApplication, id: string, payload: Partial<EnvInstance>): Promise<EnvInstance> {
  const res = await authFetch(msalInstance, apiUrl(`/environments/${encodeURIComponent(id)}`), { method: 'PUT', body: JSON.stringify(payload) });
  const body = await getJson<{ updated: EnvInstance }>(res);
  return body.updated;
}

export async function deleteEnvironment(msalInstance: IPublicClientApplication, id: string): Promise<void> {
  const res = await authFetch(msalInstance, apiUrl(`/environments/${encodeURIComponent(id)}`), { method: 'DELETE' });
  await ensureOk(res);
}

export async function startEnvironment(msalInstance: IPublicClientApplication, id: string): Promise<void> {
  const res = await authFetch(msalInstance, apiUrl(`/environments/${encodeURIComponent(id)}/start`), { method: 'POST' });
  await ensureOk(res);
}

export async function stopEnvironment(msalInstance: IPublicClientApplication, id: string): Promise<void> {
  const res = await authFetch(msalInstance, apiUrl(`/environments/${encodeURIComponent(id)}/stop`), { method: 'POST' });
  await ensureOk(res);
}

export async function startStage(
  msalInstance: IPublicClientApplication,
  envId: string,
  stageId: string,
): Promise<void> {
  const res = await authFetch(
    msalInstance,
    apiUrl(`/environments/${encodeURIComponent(envId)}/stages/${encodeURIComponent(stageId)}/start`),
    { method: 'POST' },
  );
  await ensureOk(res);
}

export async function stopStage(
  msalInstance: IPublicClientApplication,
  envId: string,
  stageId: string,
): Promise<void> {
  const res = await authFetch(
    msalInstance,
    apiUrl(`/environments/${encodeURIComponent(envId)}/stages/${encodeURIComponent(stageId)}/stop`),
    { method: 'POST' },
  );
  await ensureOk(res);
}

export async function updateStageConfiguration(
  msalInstance: IPublicClientApplication,
  envId: string,
  stageId: string,
  payload: {
    resourceActions: ResourceAction[];
    notificationGroups: NotificationGroup[];
    postponementPolicy?: PostponementPolicy;
  },
): Promise<EnvironmentStage> {
  const res = await authFetch(
    msalInstance,
    apiUrl(`/environments/${encodeURIComponent(envId)}/stages/${encodeURIComponent(stageId)}/configuration`),
    { method: 'PUT', body: JSON.stringify(payload) },
  );
  const body = await getJson<{ updated: EnvironmentStage }>(res);
  return body.updated;
}

export async function listSchedules(msalInstance: IPublicClientApplication): Promise<Schedule[]> {
  const res = await authFetch(msalInstance, apiUrl('/environments/schedules'), { method: 'GET' });
  const body = await getJson<{ schedules?: Schedule[] }>(res);
  return body.schedules || [];
}

export type ActivityEntry = {
  PartitionKey?: string;
  RowKey?: string;
  timestamp?: string;
  environment?: string;
  client?: string;
  stage?: string;
  action?: string;
  status?: string;
  [key: string]: any;
};

export type ActivityPage = {
  activity: ActivityEntry[];
  total: number;
  page: number;
  per_page: number;
};

export type StageExecutionPage = {
  executions: StageExecution[];
  total: number;
  environmentId: string;
  stageId?: string | null;
  scheduleId?: string | null;
};

export async function getActivity(
  msalInstance: IPublicClientApplication,
  envId: string,
  options?: {
    page?: number;
    perPage?: number;
    client?: string;
    stage?: string;
    action?: string;
    startTs?: string;
    endTs?: string;
  }
): Promise<ActivityPage> {
  const params: Record<string, string | number | undefined> = {
    page: options?.page ?? 0,
    per_page: options?.perPage ?? 10,
    client: options?.client,
    stage: options?.stage,
    action: options?.action,
    start_ts: options?.startTs,
    end_ts: options?.endTs,
  };
  const url = withQuery(apiUrl(`/environments/${encodeURIComponent(envId)}/activity`), params as any);
  const res = await authFetch(msalInstance, url, { method: 'GET' });
  const body = await getJson<ActivityPage>(res);
  return body;
}

export async function listEnvironmentExecutions(
  msalInstance: IPublicClientApplication,
  envId: string,
  options?: {
    stageId?: string;
    scheduleId?: string;
    limit?: number;
  },
): Promise<StageExecutionPage> {
  const params: Record<string, string | number | undefined> = {
    stage_id: options?.stageId,
    schedule_id: options?.scheduleId,
    limit: options?.limit ?? 100,
  };
  const url = withQuery(apiUrl(`/environments/${encodeURIComponent(envId)}/executions`), params as any);
  const res = await authFetch(msalInstance, url, { method: 'GET' });
  const body = await getJson<StageExecutionPage>(res);
  return {
    executions: body.executions || [],
    total: body.total || 0,
    environmentId: body.environmentId || envId,
    stageId: body.stageId,
    scheduleId: body.scheduleId,
  };
}

export async function createSchedule(
  msalInstance: IPublicClientApplication,
  payload: Partial<Schedule>,
): Promise<Schedule> {
  const res = await authFetch(msalInstance, apiUrl('/environments/schedules'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const body = await getJson<{ created: Schedule }>(res);
  return body.created;
}

export async function postponeSchedule(
  msalInstance: IPublicClientApplication,
  id: string,
  payload: { postponeByMinutes?: number; postponeUntil?: string; reason?: string },
): Promise<Schedule> {
  const res = await authFetch(
    msalInstance,
    apiUrl(`/environments/schedules/${encodeURIComponent(id)}/postpone`),
    { method: 'POST', body: JSON.stringify(payload) },
  );
  const body = await getJson<{ updated: Schedule }>(res);
  return body.updated;
}

export async function deleteSchedule(msalInstance: IPublicClientApplication, id: string): Promise<void> {
  const res = await authFetch(msalInstance, apiUrl(`/environments/schedules/${encodeURIComponent(id)}`), { method: 'DELETE' });
  await ensureOk(res);
}
