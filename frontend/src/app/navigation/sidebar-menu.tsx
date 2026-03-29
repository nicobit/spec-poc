import { Bot, Building2, CalendarClock, Heart, HelpCircle, LayoutDashboard, MessageSquare, Server, Settings, SlidersHorizontal, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MenuItem = {
  name: string;
  path?: string;
  icon?: LucideIcon;
  children?: MenuItem[];
  badge?: string;
  activePatterns?: string[];
  inactivePatterns?: string[];
};

const includeIf = <T,>(condition: boolean, items: T[]): T[] => (condition ? items : []);

const normalizePath = (value: string) => value.replace(/\/+$/, '') || '/';

const matchesRoutePattern = (pattern: string, pathname: string) => {
  const normalizedPattern = normalizePath(pattern);
  const normalizedPathname = normalizePath(pathname);
  const patternParts = normalizedPattern.split('/');
  const pathParts = normalizedPathname.split('/');

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  return patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
};

export const matchesMenuItemPath = (item: MenuItem, pathname: string) => {
  const inactivePatterns = (item.inactivePatterns ?? []).filter(Boolean) as string[];
  if (inactivePatterns.some((pattern) => matchesRoutePattern(pattern, pathname))) {
    return false;
  }

  const patterns = [item.path, ...(item.activePatterns ?? [])].filter(Boolean) as string[];
  return patterns.some((pattern) => matchesRoutePattern(pattern, pathname));
};

export const getMenuItems = (isAdmin: boolean): MenuItem[] => [
  { name: "Dashboard", icon: LayoutDashboard, path: "/" },
  { name: "Clients", icon: Building2, path: "/clients", activePatterns: ["/clients/create", "/clients/:id/edit"] },
  {
    name: "NL to SQL",
    icon: Bot,
    children: [
      { name: "Chat", path: "/chat", icon: MessageSquare },
      { name: "Questions", path: "/question", icon: HelpCircle },
    ],
  },
  {
    name: "Environments",
    icon: Server,
    children: [
    { name: "Dashboard", path: "/environment", icon: LayoutDashboard },
    {
      name: "Manage",
      path: "/environment/manage",
      icon: SlidersHorizontal,
      activePatterns: ["/environment/create", "/environment/edit/:id", "/environment/:id"],
      inactivePatterns: ["/environment/schedules"],
    },
      { name: "Schedules", path: "/environment/schedules", icon: CalendarClock, activePatterns: ["/environment/schedules/create"] },
    ],
  },
  { name: "Account", icon: User, path: "/user" },
  ...includeIf(isAdmin, [{ name: "Settings", icon: Settings, path: "/settings" }]),
  { name: "Costs", icon: Server, path: "/costs" },
  { name: "Status", icon: Heart, path: "/status" },
];
