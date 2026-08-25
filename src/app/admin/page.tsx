import { UserRoundCheck, Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const auth = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [pending, owners] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client").eq("state", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner"),
  ]);
  return <><WorkspaceHeading eyebrow="Account administration" title={`Hello, ${auth.profile.full_name.split(" ")[0]}.`} description="Activate client registrations and manage owner access. Project and booking contents remain outside the administrator workspace." /><div className="grid gap-4 sm:grid-cols-2"><Link href="/admin/registrations"><Card><CardHeader><UserRoundCheck className="size-5 text-primary" /><CardTitle className="mt-3 font-sans text-sm text-muted-foreground">Pending registrations</CardTitle></CardHeader><CardContent><p className="font-heading text-5xl">{pending.count ?? 0}</p></CardContent></Card></Link><Link href="/admin/owners"><Card><CardHeader><Users className="size-5 text-primary" /><CardTitle className="mt-3 font-sans text-sm text-muted-foreground">Owner accounts</CardTitle></CardHeader><CardContent><p className="font-heading text-5xl">{owners.count ?? 0}</p></CardContent></Card></Link></div></>;
}
