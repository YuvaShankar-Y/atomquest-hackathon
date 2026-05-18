import { CheckSquare, ClipboardList, LayoutDashboard, Target, Users, User, FileSpreadsheet } from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const commonLinks: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const employeeLinks: NavItem[] = [
  { to: "/employee/goals", label: "Goals", icon: Target },
  { to: "/employee/checkins", label: "Check-ins", icon: CheckSquare },
];

const managerLinks: NavItem[] = [
  { to: "/manager/approvals", label: "Team Approvals", icon: Users },
  { to: "/manager/checkins", label: "Team Check-ins", icon: ClipboardList },
];

const adminLinks: NavItem[] = [
  { to: "/admin", label: "Goal Sheets", icon: Users },
  { to: "/admin/completion", label: "Completion Status", icon: ClipboardList },
  { to: "/admin/reports", label: "Reports", icon: FileSpreadsheet },
];

export function getNavLinks(role: UserRole | undefined): NavItem[] {
  let links = [...commonLinks];
  
  if (role === "employee") {
    links = [...links, ...employeeLinks];
  } else if (role === "manager") {
    links = [...links, ...managerLinks];
  } else if (role === "admin") {
    links = [...links, ...adminLinks];
  }
  
  links.push({ to: "/profile", label: "Profile", icon: User });
  return links;
}
