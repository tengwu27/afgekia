import { BookOpenText, CalendarDays, FolderKanban, Users } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const auth = await requireStaff(); const supabase = await createSupabaseServerClient();
  const [projectsResult, bookingsResult, clientsResult, articlesResult] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact" }).order("updated_at", { ascending: false }).limit(5),
    supabase.from("booking_requests").select("*", { count: "exact" }).eq("status", "submitted").order("created_at").limit(5),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  const stats = [["Projects", projectsResult.count ?? 0, FolderKanban, "/admin/projects"], ["New bookings", bookingsResult.count ?? 0, CalendarDays, "/admin/bookings"], ["Clients", clientsResult.count ?? 0, Users, "/admin/members"], ["Draft articles", articlesResult.count ?? 0, BookOpenText, "/admin/articles"]] as const;
  return <><WorkspaceHeading eyebrow="Administration" title={`Hello, ${auth.profile.full_name.split(" ")[0]}.`} description="The working view across private delivery, booking requests, and public publishing." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, count, Icon, href]) => <Link href={href} key={label}><Card className="transition-transform hover:-translate-y-0.5"><CardHeader><Icon className="size-5 text-primary" /><CardTitle className="mt-3 font-sans text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="font-heading text-5xl">{count}</p></CardContent></Card></Link>)}</div><div className="mt-9 grid gap-7 xl:grid-cols-[1.25fr_.75fr]"><section><h2 className="mb-4 text-3xl">Recently active projects</h2><div className="rounded-xl border bg-card">{projectsResult.data?.map((project) => <Link key={project.id} href={`/admin/projects/${project.id}`} className="flex items-center justify-between gap-4 border-b p-5 last:border-0 hover:bg-muted/40"><div><p className="font-mono text-xs text-muted-foreground">{project.reference_code}</p><p className="mt-1 font-medium">{project.title}</p></div><div className="text-right"><StatusBadge value={project.status} /><p className="mt-2 text-xs text-muted-foreground">{project.progress}% · {formatDate(project.updated_at)}</p></div></Link>)}</div></section><section><h2 className="mb-4 text-3xl">Awaiting response</h2><div className="rounded-xl border bg-card">{bookingsResult.data?.length ? bookingsResult.data.map((booking) => <Link key={booking.id} href="/admin/bookings" className="block border-b p-5 last:border-0 hover:bg-muted/40"><p className="font-mono text-xs text-muted-foreground">{booking.reference_code}</p><p className="mt-1 font-medium">{booking.full_name}</p><p className="mt-1 text-xs text-muted-foreground">Preferred {formatDate(booking.preferred_at)}</p></Link>) : <p className="p-6 text-sm text-muted-foreground">No new requests.</p>}</div></section></div></>;
}
