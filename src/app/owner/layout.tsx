import { CalendarDays, FolderKanban, Image, Inbox, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";

import { WorkspaceShell, type WorkspaceLink } from "@/components/workspace-shell";
import { requireOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

const links: WorkspaceLink[] = [
  { href: "/owner", label: "Overview", icon: LayoutDashboard },
  { href: "/owner/requests", label: "Requests", icon: Inbox },
  { href: "/owner/projects", label: "Projects", icon: FolderKanban },
  { href: "/owner/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/owner/appointments", label: "Appointment types", icon: Sparkles },
  { href: "/owner/media", label: "Media", icon: Image },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireOwner();
  return <WorkspaceShell profile={auth.profile} links={links} label="Owner workspace">{children}</WorkspaceShell>;
}
