import { CalendarDays, FolderKanban, Inbox, LayoutDashboard, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { WorkspaceShell, type WorkspaceLink } from "@/components/workspace-shell";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const links: WorkspaceLink[] = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/requests", label: "Requests", icon: Inbox },
  { href: "/portal/projects", label: "Projects", icon: FolderKanban },
  { href: "/portal/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth("/portal");
  if (auth.profile.must_change_password) redirect("/account/security");
  if (auth.profile.role !== "client") redirect(auth.profile.role === "owner" ? "/owner" : "/admin");
  return <WorkspaceShell profile={auth.profile} links={links} label="Client workspace">{children}</WorkspaceShell>;
}
