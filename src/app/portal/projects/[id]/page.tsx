import { CheckCircle2, Circle, CircleDot, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { RichText } from "@/components/rich-text";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireClientWorkspace } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const icons = { not_started: Circle, active: CircleDot, blocked: ShieldAlert, done: CheckCircle2 } as const;

export default async function ClientProjectDetailPage({ params }: PageProps<"/portal/projects/[id]">) {
  await requireClientWorkspace();
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: project }, { data: milestones }, { data: updates }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("milestones").select("*").eq("project_id", id).order("position"),
    supabase.from("project_updates").select("*").eq("project_id", id).order("occurred_at", { ascending: false }),
  ]);
  if (!project) notFound();
  return <><WorkspaceHeading eyebrow={project.reference_code} title={project.title} description={project.summary} actions={<StatusBadge value={project.status} />} /><div className="grid gap-7 xl:grid-cols-[1fr_22rem]"><div><section className="rounded-2xl border bg-card p-6 sm:p-8"><div className="flex items-end justify-between"><div><p className="eyebrow">Project progress</p><p className="mt-2 font-heading text-5xl">{project.progress}%</p></div><p className="text-sm text-muted-foreground">Target {formatDate(project.target_date)}</p></div><Progress value={project.progress} className="mt-5 h-2" /><p className="mt-6 whitespace-pre-line leading-7 text-muted-foreground">{project.description}</p></section><section className="mt-7"><h2 className="mb-4 text-3xl">Updates</h2>{updates?.length ? <div className="space-y-4">{updates.map((update) => <article key={update.id} className="rounded-2xl border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><time className="text-xs text-muted-foreground" dateTime={update.occurred_at}>{formatDate(update.occurred_at)}</time><h3 className="mt-2 text-2xl">{update.title}</h3></div>{update.progress_snapshot !== null ? <span className="text-sm font-semibold text-primary">{update.progress_snapshot}%</span> : null}</div><RichText value={update.body_json} className="mt-3 text-sm leading-7" /></article>)}</div> : <EmptyState icon={CircleDot} title="No client updates yet" description="Dated project updates will appear here when they are shared with you." />}</section></div><aside><h2 className="mb-4 text-3xl">Milestones</h2>{milestones?.length ? <div className="space-y-3">{milestones.map((milestone) => { const Icon = icons[milestone.status]; return <div key={milestone.id} className="rounded-xl border bg-card p-5"><div className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-sans font-medium">{milestone.title}</h3><p className="mt-1 text-xs text-muted-foreground">Due {formatDate(milestone.due_date)}</p>{milestone.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{milestone.description}</p> : null}</div></div></div>; })}</div> : <EmptyState icon={Circle} title="No visible milestones" description="Client-visible milestones will appear here." />}</aside></div></>;
}
