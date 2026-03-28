import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useAuthZ } from "@/auth/useAuthZ";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";
import AdminPortalLogo from "@/shared/ui/AdminPortalLogo";
import { themeClasses } from "@/theme/themeClasses";

import { getMenuItems, matchesMenuItemPath, type MenuItem } from "../navigation/sidebar-menu";

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { pathname } = useLocation();
  const { instance } = useMsal();
  const { isAdmin } = useAuthZ(instance);
  const { themeId } = useTheme();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const items = getMenuItems(isAdmin);
  const isCyber = themeId === "cyber";
  const isCommerce = themeId === "commerce";

  const isActivePath = (item?: MenuItem) => !!item && matchesMenuItemPath(item, pathname);
  const hasActiveDescendant = (item: MenuItem): boolean =>
    (item.children ?? []).some(
      (child) => isActivePath(child) || (child.children ? hasActiveDescendant(child) : false),
    );

  useEffect(() => {
    const next: Record<string, boolean> = {};
    const markActives = (items: MenuItem[]) => {
      for (const item of items) {
        if (item.children?.length) {
          next[item.name] = hasActiveDescendant(item);
          markActives(item.children);
        }
      }
    };

    markActives(items);
    setOpenGroups((previous) => ({ ...previous, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (name: string) =>
    setOpenGroups((state) => ({ ...state, [name]: !state[name] }));

  const activeCyberGroup =
    items.find((item) => item.children?.length && openGroups[item.name]) ??
    items.find((item) => item.children?.length && hasActiveDescendant(item));
  const activeCyberItem =
    items.find((item) => isActivePath(item) || hasActiveDescendant(item)) ??
    activeCyberGroup ??
    items[0];
  const cyberSubItems = activeCyberGroup?.children ?? [];
  const ActiveCyberIcon = activeCyberItem?.icon;

  if (isCyber) {
    return (
      <aside className="cyber-sidebar relative flex h-[calc(100vh-8.5rem)] w-[4.75rem] shrink-0 items-stretch gap-0">
        <div className={`${themeClasses.sidebar} cyber-sidebar-rail flex w-[4.75rem] flex-col items-center rounded-[2rem] border px-3 py-4`}>
          <div className={`${themeClasses.sidebarHeader} mb-4 flex w-full items-center justify-center border-b pb-4`}>
            <div className="cyber-sidebar-logo flex h-12 w-12 items-center justify-center rounded-full">
              {ActiveCyberIcon ? <ActiveCyberIcon className="h-6 w-6" aria-hidden="true" /> : <span className="text-lg font-semibold text-[var(--text-primary)]">A</span>}
            </div>
          </div>

          <nav className="flex flex-1 flex-col items-center gap-3">
            {cyberSubItems.map((child) => {
              const childActive = isActivePath(child) || (child.children ? hasActiveDescendant(child) : false);
              const ChildIcon = child.icon;
              return (
                <Link
                  key={child.name}
                  to={child.path || "#"}
                  className={[
                    "cyber-rail-item flex h-12 w-12 items-center justify-center rounded-full border border-transparent text-sm font-semibold transition-all duration-200",
                    childActive ? "cyber-rail-item-active" : "",
                  ].join(" ")}
                  aria-label={child.name}
                  title={child.name}
                >
                  {ChildIcon ? <ChildIcon className="h-5 w-5" aria-hidden="true" /> : <span aria-hidden="true">{getRailGlyph(child.name)}</span>}
                  <Tooltip label={child.name} />
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 flex flex-col items-center gap-3">
            <button className="cyber-sidebar-utility is-active" aria-label="Active workspace theme" />
            <button className="cyber-sidebar-utility" aria-label="Utility shortcut" />
            <button className="cyber-sidebar-utility" aria-label="System preferences" />
          </div>
        </div>

        {sidebarOpen ? (
          <div className={`${themeClasses.sidebar} cyber-sidebar-drawer absolute left-[calc(100%+0.9rem)] top-4 z-30 flex w-[18.5rem] flex-col rounded-[1.75rem] border px-4 py-4 lg:hidden`}>
            <div className={`${themeClasses.sidebarHeader} border-b pb-3`}>
              <p className="text-[0.65rem] uppercase tracking-[0.32em] text-[var(--text-muted)]">Navigation</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-[var(--text-primary)]">Admin Portal</h1>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Cyber operations shell</p>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="cyber-topbar-icon h-10 w-10"
                  aria-label="Collapse cyber navigation"
                >
                  <span className="text-sm">×</span>
                </button>
              </div>
            </div>

            <nav className="mt-4 flex-1 space-y-2">
              {items.map((item) => (
                <SidebarItem
                  key={`${item.name}-drawer`}
                  item={item}
                  sidebarOpen={sidebarOpen}
                  isActivePath={isActivePath}
                  hasActiveDescendant={hasActiveDescendant}
                  openGroups={openGroups}
                  onToggleGroup={toggleGroup}
                  forceOpenSidebar={() => {
                    if (!sidebarOpen) {
                      toggleSidebar();
                    }
                  }}
                />
              ))}
            </nav>
          </div>
        ) : null}
      </aside>
    );
  }

  if (isCommerce) {
    return (
      <aside
        className={[
          "commerce-sidebar flex h-screen shrink-0 flex-col border-r py-6 transition-all duration-300",
          sidebarOpen ? "w-[18rem] px-5" : "w-[5.5rem] px-3",
        ].join(" ")}
      >
        <div className="commerce-sidebar-brand flex items-center justify-between pb-6">
          <div className="flex items-center gap-3">
            {sidebarOpen ? (
              <div className="commerce-brand-mark flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold">
                <AdminPortalLogo className="h-6 w-6" />
              </div>
            ) : (
              <button
                onClick={toggleSidebar}
                className="commerce-brand-mark flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold"
                aria-label="Expand sidebar"
              >
                <AdminPortalLogo className="h-6 w-6" />
              </button>
            )}
            {sidebarOpen ? (
              <div className="text-[1.05rem] font-semibold text-[var(--text-primary)]">Admin Portal</div>
            ) : null}
          </div>
          <button
            onClick={toggleSidebar}
            className={[
              "commerce-sidebar-toggle flex h-8 w-8 items-center justify-center rounded-md",
              sidebarOpen ? "" : "hidden",
            ].join(" ")}
            aria-label="Collapse sidebar"
          >
            <span className="text-lg leading-none">‹</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 pt-2">
          {items.map((item) => (
            <SidebarItem
              key={item.name}
              item={item}
              sidebarOpen={sidebarOpen}
              isActivePath={isActivePath}
              hasActiveDescendant={hasActiveDescendant}
              openGroups={openGroups}
              onToggleGroup={toggleGroup}
              forceOpenSidebar={() => {
                if (!sidebarOpen) {
                  toggleSidebar();
                }
              }}
            />
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside
      className={[
        `${themeClasses.sidebar} flex h-[calc(100vh-2rem)] flex-col rounded-[2rem] border transition-all duration-300`,
        sidebarOpen ? "w-64" : "w-20",
      ].join(" ")}
    >
      <div className={`${themeClasses.sidebarHeader} flex items-center justify-between border-b p-4`}>
        <div className="flex items-center gap-3">
          {!sidebarOpen ? (
            <button onClick={toggleSidebar} aria-label="Expand sidebar">
              <AdminPortalLogo className="h-7 w-7" />
            </button>
          ) : null}
          {sidebarOpen ? <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Portal</h1> : null}
        </div>
        {sidebarOpen ? (
          <button
            onClick={toggleSidebar}
            className="rounded-full p-2 text-[var(--text-muted)] transition-transform hover:bg-[var(--surface-hover)]"
            aria-label="Collapse sidebar"
          >
            {"|||"}
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <SidebarItem
            key={item.name}
            item={item}
            sidebarOpen={sidebarOpen}
            isActivePath={isActivePath}
            hasActiveDescendant={hasActiveDescendant}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
            forceOpenSidebar={() => {
              if (!sidebarOpen) {
                toggleSidebar();
              }
            }}
          />
        ))}
      </nav>
    </aside>
  );
}

function getRailGlyph(name: string) {
  const normalized = name.trim().split(/\s+/);
  if (normalized.length === 1) {
    return normalized[0].slice(0, 1).toUpperCase();
  }

  return normalized
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
}

type ItemProps = {
  item: MenuItem;
  sidebarOpen: boolean;
  isActivePath: (item?: MenuItem) => boolean;
  hasActiveDescendant: (item: MenuItem) => boolean;
  openGroups: Record<string, boolean>;
  onToggleGroup: (name: string) => void;
  forceOpenSidebar: () => void;
};

function SidebarItem({
  item,
  sidebarOpen,
  isActivePath,
  hasActiveDescendant,
  openGroups,
  onToggleGroup,
  forceOpenSidebar,
}: ItemProps) {
  const { themeId } = useTheme();
  const Icon = item.icon;
  const isLeaf = !item.children || item.children.length === 0;
  const activeLeaf = isLeaf && isActivePath(item);
  const activeGroup = !isLeaf && hasActiveDescendant(item);
  const isCyber = themeId === "cyber";
  const isCommerce = themeId === "commerce";

  const baseClass =
    `group relative flex items-center rounded-2xl border border-transparent p-2 transition-colors duration-200 ${themeClasses.navItem}`;
  const activeLeafClass = themeClasses.navItemActive;
  const hoverClass = "";
  const groupActiveClass = themeClasses.navItemActive;

  if (isLeaf) {
    if (isCyber && !sidebarOpen) {
      return (
        <div className="relative group">
          <Link
            to={item.path || "#"}
            className={[
              "cyber-rail-item flex h-12 w-12 items-center justify-center rounded-full border border-transparent transition-all duration-200",
              activeLeaf ? "cyber-rail-item-active" : "",
            ].join(" ")}
            aria-label={item.name}
          >
            {Icon && <Icon className="h-5 w-5" />}
            <Tooltip label={item.name} />
          </Link>
        </div>
      );
    }

    return (
      <div className="relative">
        <Link
          to={item.path || "#"}
          className={`${baseClass} ${isCyber && sidebarOpen ? "cyber-drawer-item px-4 py-3" : ""} ${isCommerce ? "commerce-nav-item rounded-xl px-4 py-3" : ""} ${activeLeaf ? activeLeafClass : hoverClass}`}
        >
          {Icon && <Icon className="h-5 w-5" />}
          {sidebarOpen && <span className="ml-4 truncate text-sm font-medium">{item.name}</span>}
          {!sidebarOpen && <Tooltip label={item.name} />}
        </Link>
      </div>
    );
  }

  const isOpen = !!openGroups[item.name];

  if (isCyber && !sidebarOpen) {
    const railHref = item.children?.[0]?.path || item.path || "#";
    if (item.children?.length) {
      return (
        <div className="relative group">
          <button
            type="button"
            onClick={() => onToggleGroup(item.name)}
            className={[
              "cyber-rail-item flex h-12 w-12 items-center justify-center rounded-full border border-transparent transition-all duration-200",
              activeGroup ? "cyber-rail-item-active" : "",
            ].join(" ")}
            aria-label={item.name}
            aria-pressed={!!openGroups[item.name]}
          >
            {Icon && <Icon className="h-5 w-5" />}
            <Tooltip label={item.name} />
          </button>
        </div>
      );
    }

    return (
      <div className="relative group">
        <Link
          to={railHref}
          className={[
            "cyber-rail-item flex h-12 w-12 items-center justify-center rounded-full border border-transparent transition-all duration-200",
            activeGroup ? "cyber-rail-item-active" : "",
          ].join(" ")}
          aria-label={item.name}
        >
          {Icon && <Icon className="h-5 w-5" />}
          <Tooltip label={item.name} />
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!sidebarOpen) {
            forceOpenSidebar();
          } else {
            onToggleGroup(item.name);
          }
        }}
        className={`${baseClass} ${isCyber && sidebarOpen ? "cyber-drawer-item px-4 py-3" : ""} ${isCommerce ? "commerce-nav-item rounded-xl px-4 py-3" : ""} ${activeGroup ? groupActiveClass : hoverClass} w-full text-left`}
        aria-expanded={isOpen}
        aria-controls={`submenu-${item.name}`}
      >
        {Icon && <Icon className="h-5 w-5" />}
        {sidebarOpen ? (
          <>
            <span className="ml-4 flex-1 truncate text-sm font-medium">{item.name}</span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 opacity-70" />
            ) : (
              <ChevronRight className="h-4 w-4 opacity-70" />
            )}
          </>
        ) : (
          <Tooltip label={item.name} />
        )}
      </button>

      {sidebarOpen && (
        <ul
          id={`submenu-${item.name}`}
          className={[
            "mt-1 ml-2 space-y-1 border-l border-gray-200 pl-2 dark:border-gray-700",
            isCommerce ? "commerce-submenu ml-4 border-l-0 pl-0" : "",
            themeClasses.navSubmenu,
            isOpen ? "block" : "hidden",
          ].join(" ")}
        >
          {(item.children ?? []).map((child) => {
            const childActive = isActivePath(child) || hasActiveDescendant(child);
            return (
              <li key={child.name}>
                <Link
                  to={child.path || "#"}
                  className={[
                    "flex items-center rounded-lg p-2 text-sm transition-colors",
                    isCyber && sidebarOpen ? "cyber-drawer-subitem px-4 py-2.5" : "",
                    isCommerce ? "commerce-submenu-item rounded-lg px-4 py-2.5" : "",
                    childActive
                      ? themeClasses.navItemActive
                      : themeClasses.navItem,
                  ].join(" ")}
                >
                  <span className="ml-6 truncate">{child.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!sidebarOpen && item.children && item.children.length > 0 && (
        <div className="pointer-events-none absolute left-full top-0 z-20 ml-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
          <div className="ui-panel min-w-[12rem] rounded-2xl py-2">
            {(item.children ?? []).map((child) => {
              const childActive = isActivePath(child) || hasActiveDescendant(child);
              return (
                <Link
                  key={child.name}
                  to={child.path || "#"}
                  className={[
                    "block rounded px-3 py-2 text-sm",
                    childActive
                      ? themeClasses.navItemActive
                      : themeClasses.navItem,
                  ].join(" ")}
                >
                  {child.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Tooltip({ label }: { label: string }) {
  return (
    <span
      className="
        absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded
        ui-panel px-2 py-1 text-xs font-medium opacity-0 transition-opacity
        group-hover:opacity-100
      "
      role="tooltip"
    >
      {label}
    </span>
  );
}
