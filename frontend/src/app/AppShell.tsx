import { Suspense } from 'react';
import { Routes } from 'react-router-dom';

import Sidebar from '@/app/components/Sidebar';
import Topbar from '@/app/components/Topbar';
import { useTheme } from '@/contexts/ThemeContext';

import { renderAuthenticatedRoutes } from './routes';

function RouteLoading() {
  return (
    <div className="flex min-h-[12rem] items-center justify-center ui-text-muted">
      Loading page...
    </div>
  );
}

export default function AppShell() {
  const { themeId } = useTheme();
  const isCyber = themeId === 'cyber';
  const isCommerce = themeId === 'commerce';

  if (isCyber) {
    return (
      <div className="ui-shell flex min-h-screen flex-col">
        <Topbar />
        <div className="flex flex-1 gap-4 px-4 pb-4 pt-4 lg:px-5">
          <Sidebar />
          <main className="flex-1 px-1 pb-4">
            <Suspense fallback={<RouteLoading />}>
              <Routes>{renderAuthenticatedRoutes()}</Routes>
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  if (isCommerce) {
    return (
      <div className="commerce-shell ui-shell flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-8 py-6">
            <Suspense fallback={<RouteLoading />}>
              <Routes>{renderAuthenticatedRoutes()}</Routes>
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-shell flex min-h-screen gap-4 px-4 py-4 lg:px-5">
      <Sidebar />
      <div className="flex flex-1 flex-col gap-4">
        <Topbar />
        <main className="flex-1 px-2 pb-4">
          <Suspense fallback={<RouteLoading />}>
            <Routes>{renderAuthenticatedRoutes()}</Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
