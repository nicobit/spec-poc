import { Suspense, useEffect, useRef, useState } from 'react';
import { Routes } from 'react-router-dom';

import AssistantPanel from '@/app/components/AssistantPanel';
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

const DEFAULT_ASSISTANT_WIDTH = 420;

function readStoredAssistantOpen() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('assistant-panel-open') === 'true';
}

function readStoredAssistantWidth() {
  if (typeof window === 'undefined') return DEFAULT_ASSISTANT_WIDTH;
  const stored = Number(window.localStorage.getItem('assistant-panel-width') || String(DEFAULT_ASSISTANT_WIDTH));
  return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_ASSISTANT_WIDTH;
}

function readStoredAssistantExpanded() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('assistant-panel-expanded') === 'true';
}

export default function AppShell() {
  const { themeId } = useTheme();
  const isCyber = themeId === 'cyber';
  const isCommerce = themeId === 'commerce';
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const [assistantOpen, setAssistantOpen] = useState<boolean>(readStoredAssistantOpen);
  const [assistantWidth, setAssistantWidth] = useState<number>(readStoredAssistantWidth);
  const [assistantExpanded, setAssistantExpanded] = useState<boolean>(readStoredAssistantExpanded);
  const [topbarHeight, setTopbarHeight] = useState<number>(80);

  useEffect(() => {
    window.localStorage.setItem('assistant-panel-open', String(assistantOpen));
  }, [assistantOpen]);

  useEffect(() => {
    window.localStorage.setItem('assistant-panel-width', String(assistantWidth));
  }, [assistantWidth]);

  useEffect(() => {
    window.localStorage.setItem('assistant-panel-expanded', String(assistantExpanded));
  }, [assistantExpanded]);

  useEffect(() => {
    const element = topbarRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const updateHeight = () => {
      const h = element.getBoundingClientRect().height;
      setTopbarHeight(h);
      document.documentElement.style.setProperty('--topbar-height', `${h}px`);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const toggleAssistant = () => {
    setAssistantOpen((value) => !value);
  };
  const assistantConsumesMainArea = assistantOpen && assistantExpanded;
  const mainRoutes = (
    <Suspense fallback={<RouteLoading />}>
      <Routes>{renderAuthenticatedRoutes()}</Routes>
    </Suspense>
  );
  const assistantPanel = assistantOpen ? (
    <AssistantPanel
      width={assistantWidth}
      topOffset={topbarHeight}
      expanded={assistantExpanded}
      onWidthChange={setAssistantWidth}
      onToggleExpand={() => setAssistantExpanded((value) => !value)}
      onClose={() => setAssistantOpen(false)}
    />
  ) : null;

  if (isCyber) {
    return (
      <div className="ui-shell flex min-h-screen flex-col">
        <div ref={topbarRef}>
          <Topbar assistantOpen={assistantOpen} onToggleAssistant={toggleAssistant} />
        </div>
        <div className={`flex min-h-0 flex-1 gap-4 ${assistantOpen ? 'pl-4 pr-0 lg:pl-5 lg:pr-0' : 'px-4 lg:px-5'}`}>
          <Sidebar />
          <div className="flex min-w-0 flex-1 gap-4">
            <main className={`${assistantConsumesMainArea ? 'hidden' : 'min-w-0 flex-1'} px-1 pb-4 pt-4`}>{mainRoutes}</main>
            {assistantPanel}
          </div>
        </div>
      </div>
    );
  }

  if (isCommerce) {
    return (
      <div className="commerce-shell ui-shell flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={topbarRef}>
            <Topbar assistantOpen={assistantOpen} onToggleAssistant={toggleAssistant} />
          </div>
          <div className={`flex min-h-0 flex-1 gap-5 ${assistantOpen ? 'pl-8 pr-0' : 'px-8'}`}>
            <main className={`${assistantConsumesMainArea ? 'hidden' : 'min-w-0 flex-1'} pb-6 pt-6`}>{mainRoutes}</main>
            {assistantPanel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ui-shell flex min-h-screen gap-4 pt-4 ${assistantOpen ? 'pl-4 pr-0 lg:pl-5 lg:pr-0' : 'px-4 lg:px-5'}`}>
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <div ref={topbarRef}>
          <Topbar assistantOpen={assistantOpen} onToggleAssistant={toggleAssistant} />
        </div>
        <div className="flex min-h-0 flex-1 gap-4">
          <main className={`${assistantConsumesMainArea ? 'hidden' : 'min-w-0 flex-1'} px-2 pb-4 pt-4`}>{mainRoutes}</main>
          {assistantPanel}
        </div>
      </div>
    </div>
  );
}
