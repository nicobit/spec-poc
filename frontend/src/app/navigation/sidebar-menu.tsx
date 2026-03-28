import { Bot, CalendarClock, Heart, HelpCircle, LayoutDashboard, MessageSquare, Server, Settings, SlidersHorizontal, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MenuItem = {
  name: string;
  path?: string;
  icon?: LucideIcon;
  children?: MenuItem[];
  badge?: string;
};

const includeIf = <T,>(condition: boolean, items: T[]): T[] => (condition ? items : []);

export const getMenuItems = (isAdmin: boolean): MenuItem[] => [
  { name: "Dashboard", icon: LayoutDashboard, path: "/" },
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
    { name: "Manage", path: "/environment/manage", icon: SlidersHorizontal },
      { name: "Resources", path: "/environment/resources", icon: SlidersHorizontal },
      { name: "Schedules", path: "/environment/schedules", icon: CalendarClock },
    ],
  },
  { name: "Account", icon: User, path: "/user" },
  ...includeIf(isAdmin, [{ name: "Settings", icon: Settings, path: "/settings" }]),
  { name: "Costs", icon: Server, path: "/costs" },
  { name: "Status", icon: Heart, path: "/status" },
];
