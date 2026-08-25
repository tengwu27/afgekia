import { LayoutDashboard, ShieldCheck, UserRoundCheck, Users } from "lucide-react";

import { WorkspaceShell, type WorkspaceLink } from "@/components/workspace-shell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const links: WorkspaceLink[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/registrations", label: "Registrations", icon: UserRoundCheck },
  { href: "/admin/owners", label: "Owners", icon: Users },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin();
  return <WorkspaceShell profile={auth.profile} links={links} label="Account administration">{children}</WorkspaceShell>;
}
