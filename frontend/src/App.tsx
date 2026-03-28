import { Suspense } from 'react';
import { BrowserRouter as Router, Routes } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import AppShell from '@/app/AppShell';
import { renderPublicRoutes } from '@/app/routes';

function RouteLoading() {
  return (
    <div className="flex min-h-[12rem] items-center justify-center text-gray-600 dark:text-gray-300">
      Loading page...
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isReady } = useAuth();
  const routerFuture = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  } as const;

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200">
        Loading authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router future={routerFuture}>
        <Suspense fallback={<RouteLoading />}>
          <Routes>{renderPublicRoutes()}</Routes>
        </Suspense>
      </Router>
    );
  }

  return (
    <Router future={routerFuture}>
      <AppShell />
    </Router>
  );
}
