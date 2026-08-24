import { ArrowRight, CalendarClock, FolderKanban } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireClientWorkspace } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PortalOverviewPage() {
  const auth = await requireClientWorkspace();
  const supabase = await createSupabaseServerClient();
  const [{ data: projects }, { data: bookings }] = await Promise.all([
    supabase.from("projects").select("*").neq("status", "archived").order("updated_at", { ascending: false }),
    supabase.from("booking_requests").select("*").order("created_at", { ascending: false }).limit(3),
  ]);
  return <><WorkspaceHeading eyebrow="Client workspace" title={`Good to see you, ${auth.profile.full_name.split(" ")[0]}.`} description="A clear view of the work Afgekia is moving with you." />{projects?.length ? <div className="grid gap-5 lg:grid-cols-2">{projects.map((project) => <Card key={project.id} className="py-6"><CardHeader><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-mono text-muted-foreground">{project.reference_code}</p><CardTitle className="mt-2 text-2xl">{project.title}</CardTitle></div><StatusBadge value={project.status} /></div></CardHeader><CardContent><p className="min-h-12 leading-6 text-muted-foreground">{project.summary}</p><div className="mt-6"><div className="mb-2 flex justify-between text-xs"><span>Overall progress</span><span>{project.progress}%</span></div><Progress value={project.progress} /></div><div className="mt-6 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground"><span>Target {formatDate(project.target_date)}</span><Button asChild variant="ghost" size="sm"><Link href={`/portal/projects/${project.id}`}>Open project <ArrowRight /></Link></Button></div></CardContent></Card>)}</div> : <EmptyState icon={FolderKanban} title="No projects assigned yet" description="When an administrator assigns your first project, its progress and updates will appear here." />}{bookings?.length ? <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-3xl">Recent booking requests</h2><Button asChild variant="ghost"><Link href="/portal/bookings">View history <ArrowRight /></Link></Button></div><div className="rounded-xl border bg-card">{bookings.map((booking) => <div key={booking.id} className="flex flex-col gap-2 border-b p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-xs text-muted-foreground">{booking.reference_code}</p><p className="mt-1 text-sm">Preferred {formatDate(booking.preferred_at, { dateStyle: "medium", timeStyle: "short" })}</p></div><StatusBadge value={booking.status} /></div>)}</div></section> : <section className="mt-10"><EmptyState icon={CalendarClock} title="No linked bookings" description="Booking requests linked to your account will appear here." /></section>}</>;
}
