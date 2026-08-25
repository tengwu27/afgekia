import { Clock3, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import {
  addMilestoneAction,
  addProjectUpdateAction,
  removeProjectMemberAction,
  setMilestoneStatusAction,
  setProjectMemberApproverAction,
  submitAssessmentPlanAction,
  updateProjectProgressAction,
  updateProjectStageAction,
} from "@/app/owner/actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ProjectMemberAssignmentForm } from "@/components/project-member-assignment-form";
import { StatusBadge } from "@/components/status-badge";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { requireOwner } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listingStageLabels, listingStageStatuses } from "@/lib/projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const projectStatuses = ["planning", "active", "on_hold", "completed", "archived"] as const;
const milestoneStatuses = ["not_started", "active", "blocked", "done"] as const;

export default async function OwnerProjectDetailPage({
  params,
}: PageProps<"/owner/projects/[id]">) {
  await requireOwner();
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    { data: project },
    { data: stages },
    { data: milestones },
    { data: updates },
    { data: memberships },
    { data: revisions },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("project_stages").select("*").eq("project_id", id).order("position"),
    supabase.from("milestones").select("*").eq("project_id", id).order("position"),
    supabase.from("project_updates").select("*").eq("project_id", id).order("occurred_at", { ascending: false }),
    supabase.from("project_members").select("user_id, is_assessment_approver").eq("project_id", id),
    supabase.from("assessment_plan_revisions").select("*").eq("project_id", id).order("revision_number", { ascending: false }),
  ]);

  if (!project) notFound();

  const assignedIds = new Set(memberships?.map((member) => member.user_id));
  const { data: clients } = assignedIds.size
    ? await supabase.from("profiles").select("id, full_name, email").in("id", [...assignedIds]).order("full_name")
    : { data: [] };
  const membershipByUser = new Map(
    memberships?.map((membership) => [membership.user_id, membership]),
  );
  const clientById = new Map(clients?.map((client) => [client.id, client]));
  const latestRevision = revisions?.[0] ?? null;
  const { data: latestApprovals } = latestRevision
    ? await supabase
        .from("assessment_plan_approvals")
        .select("*")
        .eq("revision_id", latestRevision.id)
    : { data: [] };
  const projectIsOfficial = Boolean(project.official_assessment_revision_id);

  return (
    <>
      <WorkspaceHeading
        eyebrow={project.reference_code + " · " + project.property_address_short}
        title={project.title}
        description={project.summary}
        actions={<StatusBadge value={project.status} />}
      />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-7">
          <Card className="py-6">
            <CardHeader><CardTitle className="text-3xl">Status and progress</CardTitle></CardHeader>
            <CardContent>
              <form action={updateProjectProgressAction} className="space-y-5">
                <input type="hidden" name="projectId" value={project.id} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Status" htmlFor="status">
                    <select id="status" name="status" defaultValue={project.status} className="h-9 w-full rounded-lg border bg-background px-2 text-sm">
                      {projectStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                    </select>
                  </Field>
                  <Field label="Progress %" htmlFor="progress">
                    <Input id="progress" name="progress" type="number" min="0" max="100" defaultValue={project.progress} />
                  </Field>
                  <Field label="Target close" htmlFor="targetDate">
                    <Input id="targetDate" name="targetDate" type="date" defaultValue={project.target_date ?? ""} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Target-date impact" htmlFor="targetChangeType">
                    <select id="targetChangeType" name="targetChangeType" defaultValue="minor" className="h-9 w-full rounded-lg border bg-background px-2 text-sm">
                      <option value="minor">Minor adjustment</option>
                      <option value="material">Material — request new approval</option>
                    </select>
                  </Field>
                  <Field label="Target-date change reason" htmlFor="targetChangeReason">
                    <Input id="targetChangeReason" name="targetChangeReason" maxLength={500} placeholder="Required only when an approved target changes" />
                  </Field>
                </div>
                <Progress value={project.progress} />
                <Button type="submit">Save progress</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="py-6">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-3xl">Assessment plan</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Plan every applicable listing stage, then collect approval from all selected sellers.
                  </p>
                </div>
                {projectIsOfficial ? (
                  <Badge variant="outline" className="border-primary/40 text-primary"><ShieldCheck /> Official</Badge>
                ) : (
                  <Badge variant="secondary"><Clock3 /> Not official</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {latestRevision ? (
                <div className="rounded-xl border bg-muted/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Revision {latestRevision.revision_number}</p>
                      <p className="text-xs text-muted-foreground">Submitted {formatDate(latestRevision.submitted_at)}</p>
                    </div>
                    <StatusBadge value={latestRevision.status} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {latestRevision.approvals_received} of {latestRevision.approvals_required} approvals received.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(latestApprovals ?? []).map((approval) => {
                      const client = clientById.get(approval.user_id);
                      return (
                        <div key={approval.user_id} className="rounded-lg bg-background p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{client?.full_name ?? "Assigned seller"}</span>
                            <StatusBadge value={approval.status} />
                          </div>
                          {approval.note ? <p className="mt-2 text-muted-foreground">{approval.note}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <form action={submitAssessmentPlanAction} className="rounded-xl border p-4">
                <input type="hidden" name="projectId" value={project.id} />
                <Label htmlFor="assessmentReason">
                  {projectIsOfficial ? "Reason for revised approval" : "Submission note"}
                </Label>
                <Textarea id="assessmentReason" name="reason" className="mt-2" maxLength={500} rows={2} placeholder={projectIsOfficial ? "Summarize the material change." : "Optional approval context"} />
                <Button type="submit" className="mt-3">
                  {projectIsOfficial ? "Submit revised plan for approval" : "Request seller approval"}
                </Button>
              </form>

              <div className="space-y-4">
                {stages?.map((stage) => (
                  <form key={stage.id} action={updateProjectStageAction} className="rounded-xl border p-4">
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="stageId" value={stage.id} />
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-2xl">{listingStageLabels[stage.code]}</p>
                        <p className="text-xs text-muted-foreground">
                          Stage {Math.round(stage.position / 10)}
                          {stage.actual_completed_at ? " · Completed " + formatDate(stage.actual_completed_at) : ""}
                        </p>
                      </div>
                      <StatusBadge value={stage.status} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Field label="Stage status" htmlFor={"stage-status-" + stage.id}>
                        <select id={"stage-status-" + stage.id} name="status" defaultValue={stage.status} className="h-9 w-full rounded-lg border bg-background px-2 text-sm">
                          {listingStageStatuses
                            .filter((status) => stage.code !== "assessment" || status !== "skipped")
                            .map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                        </select>
                      </Field>
                      <Field label="Planned start" htmlFor={"stage-start-" + stage.id}>
                        <Input id={"stage-start-" + stage.id} name="plannedStartDate" type="date" defaultValue={stage.planned_start_date ?? ""} />
                      </Field>
                      <Field label="Planned end" htmlFor={"stage-end-" + stage.id}>
                        <Input id={"stage-end-" + stage.id} name="plannedEndDate" type="date" defaultValue={stage.planned_end_date ?? ""} />
                      </Field>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="Skip reason" htmlFor={"stage-skip-" + stage.id}>
                        <Input id={"stage-skip-" + stage.id} name="skipReason" defaultValue={stage.skip_reason ?? ""} maxLength={500} placeholder="Required when skipped" />
                      </Field>
                      <Field label="Plan impact" htmlFor={"change-type-" + stage.id}>
                        <select id={"change-type-" + stage.id} name="changeType" defaultValue="minor" className="h-9 w-full rounded-lg border bg-background px-2 text-sm">
                          <option value="minor">Minor adjustment</option>
                          <option value="material">Material — request new approval</option>
                        </select>
                      </Field>
                    </div>
                    <div className="mt-3">
                      <Field label="Adjustment reason" htmlFor={"change-reason-" + stage.id}>
                        <Input id={"change-reason-" + stage.id} name="changeReason" maxLength={500} placeholder={projectIsOfficial ? "Required after approval" : "Optional before approval"} />
                      </Field>
                    </div>
                    <Button type="submit" size="sm" variant="outline" className="mt-3">Save stage</Button>
                  </form>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="py-6">
            <CardHeader><CardTitle className="text-3xl">Add project update</CardTitle></CardHeader>
            <CardContent>
              <form action={addProjectUpdateAction} className="space-y-5">
                <input type="hidden" name="projectId" value={project.id} />
                <Field label="Title" htmlFor="updateTitle"><Input id="updateTitle" name="title" required /></Field>
                <Field label="Audience" htmlFor="audience">
                  <select id="audience" name="audience" className="h-9 w-full rounded-lg border bg-background px-2 text-sm">
                    <option value="client">Seller-visible</option>
                    <option value="owner">Owner only</option>
                  </select>
                </Field>
                <RichTextEditor label="Update copy" />
                <Button type="submit">Add dated update</Button>
              </form>
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-4 text-3xl">Update feed</h2>
            <div className="space-y-3">
              {updates?.map((update) => (
                <article key={update.id} className="rounded-xl border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{formatDate(update.occurred_at)} · {update.audience === "client" ? "Seller-visible" : "Owner only"}</p>
                      <h3 className="mt-1 text-2xl">{update.title}</h3>
                    </div>
                    <span className="text-sm font-medium">{update.progress_snapshot}%</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{update.body_text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-7">
          <Card className="py-5">
            <CardHeader><CardTitle className="text-2xl">Seller access</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {clients?.filter((client) => assignedIds.has(client.id)).map((client) => {
                  const membership = membershipByUser.get(client.id);
                  return (
                    <div key={client.id} className="rounded-lg bg-muted p-3">
                      <p className="font-medium">{client.full_name}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                      <form action={setProjectMemberApproverAction} className="mt-3">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="userId" value={client.id} />
                        <div className="flex items-center gap-2">
                          <Checkbox id={"approver-" + client.id} name="isApprover" defaultChecked={membership?.is_assessment_approver} />
                          <Label htmlFor={"approver-" + client.id} className="font-normal">Required seller approval</Label>
                        </div>
                        <Button type="submit" size="xs" variant="ghost" className="mt-2">Save approval role</Button>
                      </form>
                      <form action={removeProjectMemberAction.bind(null, project.id, client.id)}>
                        <Button type="submit" size="xs" variant="ghost" className="mt-1 text-destructive">Remove access</Button>
                      </form>
                    </div>
                  );
                })}
              </div>
              <ProjectMemberAssignmentForm projectId={project.id} />
            </CardContent>
          </Card>

          <Card className="py-5">
            <CardHeader><CardTitle className="text-2xl">Milestones</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {milestones?.map((milestone) => (
                  <div key={milestone.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{milestone.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(milestone.due_date)} · {milestone.client_visible ? "Seller-visible" : "Private"}</p>
                      </div>
                      <StatusBadge value={milestone.status} />
                    </div>
                    <form action={setMilestoneStatusAction.bind(null, milestone.id, project.id)} className="mt-3 flex gap-2">
                      <select aria-label="Milestone status" name="status" defaultValue={milestone.status} className="h-8 min-w-0 flex-1 rounded-md border bg-background px-1 text-xs">
                        {milestoneStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                      </select>
                      <Button type="submit" size="xs" variant="outline">Save</Button>
                    </form>
                  </div>
                ))}
              </div>
              <form action={addMilestoneAction} className="mt-6 space-y-3 border-t pt-5">
                <input type="hidden" name="projectId" value={project.id} />
                <Label htmlFor="milestoneTitle">New milestone</Label>
                <Input id="milestoneTitle" name="title" required placeholder="Milestone title" />
                <Textarea aria-label="Milestone description" name="description" placeholder="Short description" rows={2} />
                <select aria-label="Listing stage" name="projectStageId" className="h-9 w-full rounded-lg border bg-background px-2 text-xs">
                  <option value="">No stage</option>
                  {stages?.map((stage) => <option key={stage.id} value={stage.id}>{listingStageLabels[stage.code]}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <select aria-label="Initial milestone status" name="status" className="h-9 rounded-lg border bg-background px-2 text-xs">
                    {milestoneStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                  </select>
                  <Input aria-label="Milestone due date" name="dueDate" type="date" />
                </div>
                <Input aria-label="Milestone position" name="position" type="number" min="0" defaultValue={(milestones?.length ?? 0) * 10 + 10} />
                <div className="flex items-center gap-2">
                  <Checkbox id="clientVisible" name="clientVisible" defaultChecked />
                  <Label htmlFor="clientVisible" className="font-normal">Seller-visible</Label>
                </div>
                <select aria-label="Milestone plan impact" name="changeType" defaultValue="minor" className="h-9 w-full rounded-lg border bg-background px-2 text-xs">
                  <option value="minor">Minor addition</option>
                  <option value="material">Material — request new approval</option>
                </select>
                <Input aria-label="Milestone change reason" name="changeReason" maxLength={500} placeholder="Reason after plan approval" />
                <Button type="submit" size="sm">Add milestone</Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
