import { BookOpenText, BriefcaseBusiness, CalendarDays, FolderKanban, Image, LayoutDashboard, Settings, Sparkles, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { WorkspaceShell, type WorkspaceLink } from "@/components/workspace-shell";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const links: WorkspaceLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/portfolio", label: "Portfolio", icon: BriefcaseBusiness },
  { href: "/admin/articles", label: "Articles", icon: BookOpenText },
  { href: "/admin/services", label: "Services", icon: Sparkles },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/media", label: "Media", icon: Image },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireStaff("/admin");
  if (auth.profile.must_change_password) redirect("/account/security");
  return <WorkspaceShell profile={auth.profile} links={links} label="Administration">{children}</WorkspaceShell>;
}
