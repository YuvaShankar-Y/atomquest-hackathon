import { Bot, LayoutDashboard, User } from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const commonLinks: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
];

const managerLinks: NavItem[] = [{ to: "/ai", label: "AI Demo", icon: Bot }];
const adminLinks: NavItem[] = [{ to: "/ai", label: "AI Demo", icon: Bot }];

export function getNavLinks(role: UserRole | undefined): NavItem[] {
  if (role === "manager") {
    return [...commonLinks, ...managerLinks];
  }
  if (role === "admin") {
    return [...commonLinks, ...adminLinks];
  }
  return commonLinks;
}
