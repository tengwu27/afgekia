import { ArrowRight, FolderKanban } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireClientWorkspace } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientProjectsPage() {
  await requireClientWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
  return <><WorkspaceHeading eyebrow="Your work" title="Projects" description="Only projects explicitly assigned to your account are visible here." />{projects?.length ? <div className="space-y-4">{projects.map((project) => <article key={project.id} className="rounded-2xl border bg-card p-5 sm:p-7"><div className="grid gap-6 sm:grid-cols-[1fr_16rem] sm:items-center"><div><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{project.reference_code}</span><StatusBadge value={project.status} /></div><h2 className="mt-3 text-3xl">{project.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{project.summary}</p></div><div><div className="mb-2 flex justify-between text-xs"><span>Progress</span><span>{project.progress}%</span></div><Progress value={project.progress} /><div className="mt-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">Target {formatDate(project.target_date)}</span><Button asChild size="sm"><Link href={`/portal/projects/${project.id}`}>Open <ArrowRight /></Link></Button></div></div></div></article>)}</div> : <EmptyState icon={FolderKanban} title="No assigned projects" description="There is nothing to show yet. Project access is granted explicitly by an administrator." />}</>;
}
