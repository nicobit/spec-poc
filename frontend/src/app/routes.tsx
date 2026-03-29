import { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import { Navigate, Route } from 'react-router-dom';

import { AdminOnly } from '@/auth/useAuthZ';

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const LoginPage = lazy(() => import('@/pages/Login'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const EnvironmentPage = lazy(() => import('@/features/environment/pages/EnvironmentPage'));
const ClientsPage = lazy(() => import('@/features/clients/pages/ClientsPage'));
const ClientCreatePage = lazy(() => import('@/features/clients/pages/ClientCreatePage'));
const ClientEditPage = lazy(() => import('@/features/clients/pages/ClientEditPage'));
const EnvironmentCreatePage = lazy(() => import('@/features/environment/pages/EnvironmentCreatePage'));
const EnvironmentManagePage = lazy(() => import('@/features/environment/pages/EnvironmentManagePage'));
const EnvironmentResourcesPage = lazy(() => import('@/features/environment/pages/EnvironmentResourcesPage'));
const EnvironmentSchedulesPage = lazy(() => import('@/features/environment/pages/EnvironmentSchedulesPage'));
const EnvironmentScheduleCreatePage = lazy(() => import('@/features/environment/pages/EnvironmentScheduleCreatePage'));
const EnvironmentDetailsPage = lazy(() => import('@/features/environment/pages/EnvironmentDetailsPage'));
const EnvironmentExecutionHistoryPage = lazy(() => import('@/features/environment/pages/EnvironmentExecutionHistoryPage'));
const EnvironmentEditPage = lazy(() => import('@/features/environment/pages/EnvironmentEditPage'));
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'));
const QuestionQueryExamplePage = lazy(() => import('@/features/examples/pages/QuestionQueryExamplePage'));
const StatusPage = lazy(() => import('@/features/health/pages/StatusPage'));
const CostsDashboardPage = lazy(() => import('@/features/costs/pages/CostsDashboardPage'));
const LogsPage = lazy(() => import('@/features/logs/pages/LogsPage'));
const UserPage = lazy(() => import('@/features/user/pages/UserPage'));

export type AppRouteConfig = {
  path: string;
  component: LazyExoticComponent<ComponentType>;
  adminOnly?: boolean;
};

export const publicRouteConfigs = [
  { path: '/', redirectTo: '/login' },
  { path: '/login', component: LoginPage },
] as const;

export const authenticatedRouteConfigs: AppRouteConfig[] = [
  { path: '/', component: DashboardPage },
  { path: '/chat', component: ChatPage },
  { path: '/question', component: QuestionQueryExamplePage },
  { path: '/settings', component: SettingsPage, adminOnly: true },
  { path: '/environment', component: EnvironmentPage },
  { path: '/clients', component: ClientsPage },
  { path: '/clients/create', component: ClientCreatePage },
  { path: '/clients/:id/edit', component: ClientEditPage },
  { path: '/environment/create', component: EnvironmentCreatePage },
  { path: '/environment/manage', component: EnvironmentManagePage },
  { path: '/environment/edit/:id', component: EnvironmentEditPage },
  { path: '/environment/:id/executions', component: EnvironmentExecutionHistoryPage },
  { path: '/environment/:id', component: EnvironmentDetailsPage },
  { path: '/environment/resources', component: EnvironmentResourcesPage },
  { path: '/environment/schedules', component: EnvironmentSchedulesPage },
  { path: '/environment/schedules/create', component: EnvironmentScheduleCreatePage },
  { path: '/logs', component: LogsPage },
  { path: '/user', component: UserPage },
  { path: '/status', component: StatusPage },
  { path: '/costs', component: CostsDashboardPage },
];

export function renderPublicRoutes() {
  return (
    <>
      {publicRouteConfigs.map((route) =>
        'redirectTo' in route ? (
          <Route key={route.path} path={route.path} element={<Navigate to={route.redirectTo} replace />} />
        ) : (
          <Route key={route.path} path={route.path} element={<route.component />} />
        ),
      )}
    </>
  );
}

export function renderAuthenticatedRoutes() {
  return (
    <>
      <Route path="/login" element={<Navigate to="/" replace />} />
      {authenticatedRouteConfigs.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            route.adminOnly ? (
              <AdminOnly>
                <route.component />
              </AdminOnly>
            ) : (
              <route.component />
            )
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </>
  );
}
