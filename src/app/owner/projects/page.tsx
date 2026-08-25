import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireOwner } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OwnerProjectsPage() {
  await requireOwner(); const supabase = await createSupabaseServerClient(); const { data: projects } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
  return <><WorkspaceHeading eyebrow="Delivery" title="Projects" description="Projects are created when you approve a listing request and remain private to you and their assigned clients." /><div className="space-y-3">{projects?.map((project) => <Link key={project.id} href={`/owner/projects/${project.id}`} className="block rounded-xl border bg-card p-5 hover:bg-muted/30"><div className="grid gap-5 sm:grid-cols-[1fr_15rem] sm:items-center"><div><div className="flex flex-wrap gap-3"><span className="font-mono text-xs text-muted-foreground">{project.reference_code}</span><StatusBadge value={project.status} /></div><h2 className="mt-2 text-2xl">{project.title}</h2><p className="mt-2 text-sm text-muted-foreground">{project.summary}</p></div><div><div className="mb-2 flex justify-between text-xs"><span>{project.progress}%</span><span>Target {formatDate(project.target_date)}</span></div><Progress value={project.progress} /></div></div></Link>)}{!projects?.length ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No projects yet. Approve a listing request to create one.</p> : null}</div></>;
}
