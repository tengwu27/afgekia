import { CalendarDays, FolderKanban, Inbox } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OwnerDashboardPage() {
  const auth = await requireOwner();
  const supabase = await createSupabaseServerClient();
  const [requests, projects, bookings] = await Promise.all([
    supabase.from("project_requests").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("projects").select("id", { count: "exact", head: true }).in("status", ["planning", "active", "on_hold"]),
    supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("status", "submitted"),
  ]);
  const stats = [
    ["Listing requests", requests.count ?? 0, Inbox, "/owner/requests"],
    ["Active projects", projects.count ?? 0, FolderKanban, "/owner/projects"],
    ["New bookings", bookings.count ?? 0, CalendarDays, "/owner/bookings"],
  ] as const;
  return <><WorkspaceHeading eyebrow="Owner workspace" title={`Hello, ${auth.profile.full_name.split(" ")[0]}.`} description="Your assigned listing requests, active projects, and appointment work—kept separate from account administration." /><div className="grid gap-4 sm:grid-cols-3">{stats.map(([label, count, Icon, href]) => <Link href={href} key={label}><Card className="transition-transform hover:-translate-y-0.5"><CardHeader><Icon className="size-5 text-primary" /><CardTitle className="mt-3 font-sans text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="font-heading text-5xl">{count}</p></CardContent></Card></Link>)}</div></>;
}
