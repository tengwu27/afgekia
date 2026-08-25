import {
  Ban,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";

import { respondToAssessmentAction } from "@/app/portal/actions";
import { EmptyState } from "@/components/empty-state";
import { RichText } from "@/components/rich-text";
import { StatusBadge } from "@/components/status-badge";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { requireClientWorkspace } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listingStageLabels, parseAssessmentSnapshot } from "@/lib/projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AssessmentSnapshot } from "@/lib/projects";

const stageIcons = {
  not_started: Circle,
  active: CircleDot,
  blocked: ShieldAlert,
  done: CheckCircle2,
  skipped: Ban,
} as const;

const milestoneIcons = {
  not_started: Circle,
  active: CircleDot,
  blocked: ShieldAlert,
  done: CheckCircle2,
} as const;

export default async function ClientProjectDetailPage({
  params,
}: PageProps<"/portal/projects/[id]">) {
  const auth = await requireClientWorkspace();
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [
    { data: project },
    { data: stages },
    { data: milestones },
    { data: updates },
    { data: revisions },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("project_stages").select("*").eq("project_id", id).order("position"),
    supabase.from("milestones").select("*").eq("project_id", id).order("position"),
    supabase.from("project_updates").select("*").eq("project_id", id).order("occurred_at", { ascending: false }),
    supabase.from("assessment_plan_revisions").select("*").eq("project_id", id).order("revision_number", { ascending: false }),
  ]);

  if (!project) notFound();

  const latestRevision = revisions?.[0] ?? null;
  const approvalSnapshot = latestRevision
    ? parseAssessmentSnapshot(latestRevision.snapshot)
    : null;
  const { data: ownApproval } = latestRevision
    ? await supabase
        .from("assessment_plan_approvals")
        .select("*")
        .eq("revision_id", latestRevision.id)
        .eq("user_id", auth.userId)
        .maybeSingle()
    : { data: null };

  return (
    <>
      <WorkspaceHeading
        eyebrow={project.property_address_short}
        title={project.title}
        description={project.summary}
        actions={<StatusBadge value={project.status} />}
      />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-7">
          <section className="rounded-2xl border bg-card p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Listing progress</p>
                <p className="mt-2 font-heading text-5xl">{project.progress}%</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Target close {formatDate(project.target_date)}
              </p>
            </div>
            <Progress value={project.progress} className="mt-5 h-2" />
            <p className="mt-6 whitespace-pre-line leading-7 text-muted-foreground">
              {project.description}
            </p>
          </section>

          <Card className="py-6">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-3xl">Listing timeline</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The plan may receive minor dated adjustments as the listing moves forward.
                  </p>
                </div>
                {project.official_assessment_revision_id ? (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    <ShieldCheck /> Approved plan
                  </Badge>
                ) : (
                  <Badge variant="secondary"><Clock3 /> Assessment</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-3 before:absolute before:top-6 before:bottom-6 before:left-[1.15rem] before:w-px before:bg-border">
                {stages?.map((stage) => {
                  const Icon = stageIcons[stage.status];
                  return (
                    <li key={stage.id} className="relative flex gap-4 rounded-xl border bg-background p-4">
                      <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border bg-card text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-sans font-semibold">{listingStageLabels[stage.code]}</h3>
                          <StatusBadge value={stage.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {stage.status === "skipped"
                            ? stage.skip_reason
                            : formatDate(stage.planned_start_date) + " – " + formatDate(stage.planned_end_date)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          {ownApproval?.status === "pending" && latestRevision?.status === "pending_approval" ? (
            <Card className="border-primary/30 py-6">
              <CardHeader>
                <CardTitle className="text-3xl">Your approval is needed</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  Review revision {latestRevision.revision_number} of the assessment timeline and
                  milestones. The plan becomes official after every required seller approves it.
                </p>
              </CardHeader>
              <CardContent>
                {approvalSnapshot ? (
                  <div className="space-y-6">
                    <SubmittedAssessmentSnapshot snapshot={approvalSnapshot} />
                    <form action={respondToAssessmentAction} className="space-y-4 border-t pt-5">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="revisionId" value={latestRevision.id} />
                      <div className="space-y-2">
                        <Label htmlFor="approvalNote">Note or requested change</Label>
                        <Textarea
                          id="approvalNote"
                          name="note"
                          rows={3}
                          maxLength={2000}
                          placeholder="A note is optional when approving and required when requesting a change."
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button type="submit" name="response" value="approved">
                          <CheckCircle2 /> Approve this exact plan
                        </Button>
                        <Button type="submit" name="response" value="changes_requested" variant="outline">
                          Request changes
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                    This submitted plan cannot be displayed safely. Contact Afgekia before responding.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : latestRevision ? (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Assessment revision {latestRevision.revision_number}</p>
                <StatusBadge value={ownApproval?.status ?? latestRevision.status} />
              </div>
              <p className="mt-2 text-muted-foreground">
                {latestRevision.approvals_received} of {latestRevision.approvals_required} required
                approvals received.
              </p>
              {ownApproval?.note ? <p className="mt-2">{ownApproval.note}</p> : null}
            </div>
          ) : null}

          <section>
            <h2 className="mb-4 text-3xl">Latest updates</h2>
            {updates?.length ? (
              <div className="space-y-4">
                {updates.map((update) => (
                  <article key={update.id} className="rounded-2xl border bg-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <time className="text-xs text-muted-foreground" dateTime={update.occurred_at}>
                          {formatDate(update.occurred_at)}
                        </time>
                        <h3 className="mt-2 text-2xl">{update.title}</h3>
                      </div>
                      {update.progress_snapshot !== null ? (
                        <span className="text-sm font-semibold text-primary">
                          {update.progress_snapshot}%
                        </span>
                      ) : null}
                    </div>
                    <RichText value={update.body_json} className="mt-3 text-sm leading-7" />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CircleDot}
                title="No seller updates yet"
                description="Dated project updates will appear here when they are shared with you."
              />
            )}
          </section>
        </div>

        <aside>
          <h2 className="mb-4 text-3xl">Milestones</h2>
          {milestones?.length ? (
            <div className="space-y-3">
              {milestones.map((milestone) => {
                const Icon = milestoneIcons[milestone.status];
                const stage = stages?.find((item) => item.id === milestone.project_stage_id);
                return (
                  <div key={milestone.id} className="rounded-xl border bg-card p-5">
                    <div className="flex gap-3">
                      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div>
                        <h3 className="font-sans font-medium">{milestone.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due {formatDate(milestone.due_date)}
                          {stage ? " · " + listingStageLabels[stage.code] : ""}
                        </p>
                        {milestone.description ? (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {milestone.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Circle}
              title="No visible milestones"
              description="Seller-visible milestones will appear here."
            />
          )}
        </aside>
      </div>
    </>
  );
}

function SubmittedAssessmentSnapshot({ snapshot }: { snapshot: AssessmentSnapshot }) {
  const stageById = new Map(snapshot.stages.map((stage) => [stage.id, stage]));

  return (
    <section aria-labelledby="submitted-plan-heading" className="rounded-xl border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="submitted-plan-heading" className="font-sans font-semibold">
            Submitted plan being approved
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {snapshot.project.propertyAddressShort} · {snapshot.project.sellerNickname}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Target close {formatDate(snapshot.project.targetDate)}
        </p>
      </div>

      <ol className="mt-4 space-y-2">
        {snapshot.stages.map((stage) => {
          const Icon = stageIcons[stage.status];
          return (
            <li key={stage.id} className="flex gap-3 rounded-lg bg-muted/40 p-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{listingStageLabels[stage.code]}</span>
                  <StatusBadge value={stage.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stage.status === "skipped"
                    ? stage.skipReason
                    : `${formatDate(stage.plannedStartDate)} – ${formatDate(stage.plannedEndDate)}`}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4">
        <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Seller milestones
        </p>
        <ul className="mt-2 space-y-2">
          {snapshot.milestones.map((milestone) => {
            const stage = milestone.projectStageId
              ? stageById.get(milestone.projectStageId)
              : null;
            return (
              <li key={milestone.id} className="rounded-lg border px-3 py-2 text-sm">
                <span className="font-medium">{milestone.title}</span>
                <span className="text-muted-foreground">
                  {` · ${formatDate(milestone.dueDate)}`}
                  {stage ? ` · ${listingStageLabels[stage.code]}` : ""}
                </span>
                {milestone.description ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {milestone.description}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
