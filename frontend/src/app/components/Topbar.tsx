import { useMsal } from '@azure/msal-react';
import { Bell, LogOut, Menu, Moon, Search, Sun, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { useAuthZ } from '@/auth/useAuthZ';
import AdminPortalLogo from '@/shared/ui/AdminPortalLogo';
import { themeClasses } from '@/theme/themeClasses';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { getMenuItems } from '../navigation/sidebar-menu';

export default function Topbar() {
  const { instance } = useMsal();
  const { user } = useAuth();
  const { isAdmin } = useAuthZ(instance);
  const { darkMode, toggleMode, themeId } = useTheme();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const isCyber = themeId === 'cyber';
  const isCommerce = themeId === 'commerce';
  const navItems = getMenuItems(isAdmin);

  const handleLogout = () => {
    instance.logoutPopup();
  };

  const items = [
    <Link key="home" to="/" className="opacity-60 hover:opacity-100">
      Home
    </Link>,
    ...segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const label = segment
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
      const isLast = index === segments.length - 1;

      return isLast ? (
        <span key={path}>{label}</span>
      ) : (
        <Link key={path} to={path} className="opacity-60 hover:opacity-100">
          {label}
        </Link>
      );
    }),
  ];

  if (isCyber) {
    return (
      <header className="cyber-topbar ui-topbar flex items-center justify-between gap-4 rounded-none px-5 py-4">
        <div className="flex min-w-0 items-center gap-12">
          <div className="cyber-header-logo hidden h-12 w-12 items-center justify-center rounded-full lg:flex">
            <AdminPortalLogo className="h-7 w-7" />
          </div>

          <button
            onClick={toggleSidebar}
            className="cyber-topbar-icon lg:hidden"
            aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
          >
            <Menu size={18} />
          </button>

          <nav className="hidden lg:block" aria-label="Primary">
            <ul className="cyber-primary-nav flex items-center gap-3">
              {navItems.map((item) => {
                const href = item.path || item.children?.[0]?.path || '#';
                const isActive =
                  (item.path && location.pathname === item.path) ||
                  (item.children ?? []).some((child) => child.path === location.pathname);

                return (
                  <li key={item.name}>
                    <Link
                      to={href}
                      className={['cyber-primary-pill', isActive ? 'cyber-primary-pill-active' : ''].join(' ')}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <nav aria-label="Breadcrumb" className="min-w-0 lg:hidden">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
              {items.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden="true" className="opacity-45">/</span> : null}
                  <span className="truncate">{item}</span>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button className="cyber-topbar-search hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-[var(--text-muted)] md:flex" aria-label="Search">
            <Search size={16} />
            <span>Search</span>
          </button>

          <button
            onClick={toggleMode}
            className="cyber-topbar-icon"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button className="cyber-topbar-icon relative" aria-label="Notifications">
            <Bell size={18} />
            <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-primary-strong)]" />
          </button>

          <div className="cyber-user-chip hidden items-center gap-3 rounded-full px-3 py-2 lg:flex">
            <div className="cyber-avatar-ring flex h-9 w-9 items-center justify-center rounded-full">
              <User size={16} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{user?.name || user?.username}</div>
              <div className="text-xs text-[var(--text-muted)]">{themeId} / {darkMode ? 'dark' : 'light'}</div>
            </div>
          </div>

          <button
            className="cyber-topbar-icon"
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
    );
  }

  if (isCommerce) {
    return (
      <header className="commerce-topbar flex items-center justify-between px-8 py-5">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex flex-wrap items-center gap-2 text-sm ui-text-muted">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleMode}
            className={`${themeClasses.iconButton} rounded-full p-2`}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className={`${themeClasses.iconButton} relative rounded-full p-2`} aria-label="Notifications">
            <Bell size={20} />
            <span className="absolute right-0 top-0 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </button>

          <div className="hidden rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs ui-text-muted md:block">
            {themeId} / {darkMode ? 'dark' : 'light'}
          </div>

          <div className="flex items-center space-x-2 text-[var(--text-primary)]">
            <span className="text-sm font-semibold">{user?.name || user?.username}</span>
            <User size={20} />
          </div>

          <button
            className={`${themeClasses.iconButton} rounded-full p-2`}
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className={`${themeClasses.topbar} flex items-center justify-between rounded-2xl px-6 py-4`}>
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex flex-wrap items-center gap-2 text-sm ui-text-muted">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              <span className="truncate">{item}</span>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleMode}
          className={`${themeClasses.iconButton} rounded-full p-2`}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button className={`${themeClasses.iconButton} relative rounded-full p-2`} aria-label="Notifications">
          <Bell size={20} />
          <span className="absolute right-0 top-0 inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />
          <span className="absolute right-0 top-0 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </button>

        <div className="hidden rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs ui-text-muted md:block">
          {themeId} / {darkMode ? 'dark' : 'light'}
        </div>

        <div className="flex items-center space-x-2 text-[var(--text-primary)]">
          <span className="text-sm font-semibold">{user?.name || user?.username}</span>
          <User size={20} />
        </div>

        <button
          className={`${themeClasses.iconButton} rounded-full p-2`}
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
