"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import {
  assessmentSnapshotToJson,
  buildAssessmentSnapshot,
  isStageTransitionAllowed,
  listingStageLabels,
  validateAssessmentPlan,
} from "@/lib/projects";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assessmentSubmissionSchema, bookingStatusSchema,
  isBookingTransitionAllowed, isProjectTransitionAllowed, milestoneSchema,
  projectMemberEmailSchema, projectRequestDecisionSchema,
  projectApproverSchema, projectProgressSchema, projectStageSchema,
  projectUpdateSchema, serviceSchema, validateProgressForStatus,
} from "@/lib/validation";
import type { Json } from "@/types/database.generated";
import type { ActionState, Milestone, Project, ProjectStage } from "@/types/domain";

function value(formData: FormData, key: string) { return formData.get(key); }
function checked(formData: FormData, key: string) { return formData.get(key) === "on"; }
function failure(message: string): never { throw new Error(message); }

export async function createServiceAction(formData: FormData) {
  const auth = await requireOwner();
  const parsed = serviceSchema.safeParse({ name: value(formData, "name"), slug: value(formData, "slug"), description: value(formData, "description"), durationMinutes: value(formData, "durationMinutes"), displayOrder: value(formData, "displayOrder") });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid service.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("booking_services").insert({ owner_id: auth.userId, name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description, duration_minutes: parsed.data.durationMinutes, display_order: parsed.data.displayOrder, active: true }).select("id").single();
  if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "service.created", entityType: "booking_service", entityId: data.id });
  revalidatePath("/owner/appointments"); revalidatePath("/book");
}

export async function toggleServiceAction(id: string, active: boolean, _formData: FormData) {
  void _formData;
  const auth = await requireOwner(); const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("booking_services").update({ active: !active }).eq("id", id); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: active ? "service.deactivated" : "service.activated", entityType: "booking_service", entityId: id });
  revalidatePath("/owner/appointments"); revalidatePath("/book");
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function clientUpdateDocument(text: string): Json {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

async function submitAssessmentPlan(
  supabase: ServerSupabaseClient,
  actorId: string,
  projectId: string,
  reason?: string,
) {
  const [projectResult, stagesResult, milestonesResult, membersResult, latestResult] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("project_stages").select("*").eq("project_id", projectId).order("position"),
      supabase.from("milestones").select("*").eq("project_id", projectId).order("position"),
      supabase
        .from("project_members")
        .select("user_id, is_assessment_approver")
        .eq("project_id", projectId)
        .eq("is_assessment_approver", true),
      supabase
        .from("assessment_plan_revisions")
        .select("id, revision_number, status")
        .eq("project_id", projectId)
        .order("revision_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (projectResult.error || !projectResult.data) failure("Project not found.");
  if (stagesResult.error) failure(stagesResult.error.message);
  if (milestonesResult.error) failure(milestonesResult.error.message);
  if (membersResult.error) failure(membersResult.error.message);
  if (latestResult.error) failure(latestResult.error.message);

  const project = projectResult.data as Project;
  const stages = (stagesResult.data ?? []) as ProjectStage[];
  const milestones = (milestonesResult.data ?? []) as Milestone[];
  const approverIds = (membersResult.data ?? []).map((member) => member.user_id);
  const planErrors = validateAssessmentPlan(stages, milestones, approverIds.length);

  if (planErrors.length > 0) failure(planErrors[0]);

  const snapshot = assessmentSnapshotToJson(buildAssessmentSnapshot(project, stages, milestones));
  const revisionNumber = (latestResult.data?.revision_number ?? 0) + 1;
  const { data: revision, error: revisionError } = await supabase
    .from("assessment_plan_revisions")
    .insert({
      project_id: projectId,
      revision_number: revisionNumber,
      status: "pending_approval",
      snapshot,
      approvals_required: approverIds.length,
      approvals_received: 0,
      submitted_by: actorId,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (revisionError || !revision) failure(revisionError?.message ?? "Could not submit the plan.");

  const { error: approvalsError } = await supabase.from("assessment_plan_approvals").insert(
    approverIds.map((userId) => ({
      revision_id: revision.id,
      user_id: userId,
      status: "pending" as const,
    })),
  );

  if (approvalsError) {
    await supabase.from("assessment_plan_revisions").delete().eq("id", revision.id);
    failure(approvalsError.message);
  }

  if (
    latestResult.data &&
    ["pending_approval", "changes_requested", "draft"].includes(latestResult.data.status)
  ) {
    const { data: supersededRevision, error: supersedeError } = await supabase
      .from("assessment_plan_revisions")
      .update({ status: "superseded", superseded_at: new Date().toISOString() })
      .eq("id", latestResult.data.id)
      .in("status", ["pending_approval", "changes_requested", "draft"])
      .select("id")
      .maybeSingle();
    if (supersedeError || !supersededRevision) {
      await supabase.from("assessment_plan_revisions").delete().eq("id", revision.id);
      failure(supersedeError?.message ?? "The assessment changed while it was being submitted. Try again.");
    }
  }

  await writeAuditEvent(supabase, {
    actorId,
    action: revisionNumber === 1 ? "assessment.submitted" : "assessment.revision_submitted",
    entityType: "assessment_plan_revision",
    entityId: revision.id,
    details: {
      project_id: projectId,
      revision_number: revisionNumber,
      approver_count: approverIds.length,
      reason: reason || null,
    },
  });

  return revision.id;
}

export async function submitAssessmentPlanAction(formData: FormData) {
  const auth = await requireOwner();
  const parsed = assessmentSubmissionSchema.safeParse({
    projectId: value(formData, "projectId"),
    reason: value(formData, "reason"),
  });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid assessment plan.");

  const supabase = await createSupabaseServerClient();
  await submitAssessmentPlan(supabase, auth.userId, parsed.data.projectId, parsed.data.reason);
  revalidatePath(`/owner/projects/${parsed.data.projectId}`);
  revalidatePath(`/portal/projects/${parsed.data.projectId}`);
}

export async function updateProjectStageAction(formData: FormData) {
  const auth = await requireOwner();
  const parsed = projectStageSchema.safeParse({
    projectId: value(formData, "projectId"),
    stageId: value(formData, "stageId"),
    status: value(formData, "status"),
    plannedStartDate: value(formData, "plannedStartDate"),
    plannedEndDate: value(formData, "plannedEndDate"),
    skipReason: value(formData, "skipReason"),
    changeType: value(formData, "changeType"),
    changeReason: value(formData, "changeReason"),
  });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid stage update.");

  const supabase = await createSupabaseServerClient();
  const [{ data: stage }, { data: project }] = await Promise.all([
    supabase
      .from("project_stages")
      .select("*")
      .eq("id", parsed.data.stageId)
      .eq("project_id", parsed.data.projectId)
      .single(),
    supabase
      .from("projects")
      .select("id, status, progress, official_assessment_revision_id")
      .eq("id", parsed.data.projectId)
      .single(),
  ]);

  if (!stage || !project) failure("Project stage not found.");
  if (stage.code === "assessment" && parsed.data.status === "skipped") {
    failure("The initial assessment cannot be skipped.");
  }
  if (!isStageTransitionAllowed(stage.status, parsed.data.status)) {
    failure(`Cannot move this stage from ${stage.status} to ${parsed.data.status}.`);
  }
  if (
    project.official_assessment_revision_id &&
    parsed.data.changeType === "minor" &&
    (parsed.data.changeReason?.length ?? 0) < 5
  ) {
    failure("Explain the minor adjustment for the audit trail.");
  }

  if (project.official_assessment_revision_id && parsed.data.changeType === "material") {
    const [{ data: stages }, { data: milestones }, { count: approverCount }] = await Promise.all([
      supabase.from("project_stages").select("*").eq("project_id", parsed.data.projectId),
      supabase.from("milestones").select("*").eq("project_id", parsed.data.projectId),
      supabase
        .from("project_members")
        .select("user_id", { count: "exact", head: true })
        .eq("project_id", parsed.data.projectId)
        .eq("is_assessment_approver", true),
    ]);
    const prospectiveStages = ((stages ?? []) as ProjectStage[]).map((candidate) =>
      candidate.id === stage.id
        ? {
            ...candidate,
            status: parsed.data.status,
            planned_start_date: parsed.data.plannedStartDate || null,
            planned_end_date: parsed.data.plannedEndDate || null,
            skip_reason: parsed.data.status === "skipped" ? parsed.data.skipReason || null : null,
          }
        : candidate,
    );
    const planErrors = validateAssessmentPlan(
      prospectiveStages,
      (milestones ?? []) as Milestone[],
      approverCount ?? 0,
    );
    if (planErrors.length > 0) failure(planErrors[0]);
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("project_stages")
    .update({
      status: parsed.data.status,
      planned_start_date: parsed.data.plannedStartDate || null,
      planned_end_date: parsed.data.plannedEndDate || null,
      skip_reason: parsed.data.status === "skipped" ? parsed.data.skipReason || null : null,
      actual_started_at:
        parsed.data.status === "not_started"
          ? null
          : parsed.data.status === "active" || parsed.data.status === "done"
            ? stage.actual_started_at ?? now
            : stage.actual_started_at,
      actual_completed_at:
        parsed.data.status === "done" || parsed.data.status === "skipped"
          ? stage.actual_completed_at ?? now
          : null,
    })
    .eq("id", parsed.data.stageId)
    .eq("project_id", parsed.data.projectId);
  if (error) failure(error.message);

  await writeAuditEvent(supabase, {
    actorId: auth.userId,
    action: "project_stage.updated",
    entityType: "project_stage",
    entityId: parsed.data.stageId,
    details: {
      project_id: parsed.data.projectId,
      status: parsed.data.status,
      change_type: parsed.data.changeType,
      reason: parsed.data.changeReason || parsed.data.skipReason || null,
    },
  });

  if (project.official_assessment_revision_id && parsed.data.changeType === "material") {
    await submitAssessmentPlan(
      supabase,
      auth.userId,
      parsed.data.projectId,
      parsed.data.changeReason,
    );
  } else if (project.official_assessment_revision_id) {
    const stageLabel = listingStageLabels[stage.code];
    const updateText = `${stageLabel} was adjusted without changing the approved plan's overall scope. ${parsed.data.changeReason}`;
    const { error: updateError } = await supabase.from("project_updates").insert({
      project_id: parsed.data.projectId,
      title: `${stageLabel} timeline adjusted`,
      body_json: clientUpdateDocument(updateText),
      body_text: updateText,
      audience: "client",
      status_snapshot: project.status,
      progress_snapshot: project.progress,
      occurred_at: now,
      created_by: auth.userId,
    });
    if (updateError) failure(updateError.message);
  }

  revalidatePath(`/owner/projects/${parsed.data.projectId}`);
  revalidatePath(`/portal/projects/${parsed.data.projectId}`);
}

export async function setProjectMemberApproverAction(formData: FormData) {
  const auth = await requireOwner();
  const parsed = projectApproverSchema.safeParse({
    projectId: value(formData, "projectId"),
    userId: value(formData, "userId"),
    isApprover: checked(formData, "isApprover"),
  });
  if (!parsed.success) failure("Invalid seller approval setting.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_members")
    .update({ is_assessment_approver: parsed.data.isApprover })
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", parsed.data.userId);
  if (error) failure(error.message);

  await writeAuditEvent(supabase, {
    actorId: auth.userId,
    action: "project.assessment_approver_updated",
    entityType: "project",
    entityId: parsed.data.projectId,
    details: { user_id: parsed.data.userId, is_approver: parsed.data.isApprover },
  });
  revalidatePath(`/owner/projects/${parsed.data.projectId}`);
}

export async function updateProjectProgressAction(formData: FormData) {
  const auth = await requireOwner();
  const parsed = projectProgressSchema.safeParse({
    projectId: value(formData, "projectId"),
    status: value(formData, "status"),
    progress: value(formData, "progress"),
    targetDate: value(formData, "targetDate"),
    targetChangeType: value(formData, "targetChangeType") ?? "minor",
    targetChangeReason: value(formData, "targetChangeReason") ?? "",
  });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid project update.");

  const progressError = validateProgressForStatus(parsed.data.status, parsed.data.progress);
  if (progressError) failure(progressError);

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from("projects")
    .select("status, progress, target_date, official_assessment_revision_id")
    .eq("id", parsed.data.projectId)
    .single();
  if (!current || !isProjectTransitionAllowed(current.status, parsed.data.status)) {
    failure(
      `Cannot move a project from ${current?.status ?? "unknown"} to ${parsed.data.status}.`,
    );
  }
  if (parsed.data.status === "completed") {
    const { data: closedStage } = await supabase
      .from("project_stages")
      .select("status")
      .eq("project_id", parsed.data.projectId)
      .eq("code", "closed")
      .maybeSingle();
    if (closedStage?.status !== "done") {
      failure("Mark the Closed listing stage done before completing the project.");
    }
  }

  const nextTargetDate = parsed.data.targetDate || null;
  const targetChanged = current.target_date !== nextTargetDate;
  if (
    current.official_assessment_revision_id &&
    targetChanged &&
    parsed.data.targetChangeType === "minor" &&
    (parsed.data.targetChangeReason?.length ?? 0) < 5
  ) {
    failure("Explain the target-date adjustment for the audit trail.");
  }

  const { error } = await supabase
    .from("projects")
    .update({
      status: parsed.data.status,
      progress: parsed.data.progress,
      target_date: nextTargetDate,
    })
    .eq("id", parsed.data.projectId);
  if (error) failure(error.message);

  await writeAuditEvent(supabase, {
    actorId: auth.userId,
    action: "project.progress_updated",
    entityType: "project",
    entityId: parsed.data.projectId,
    details: {
      status: parsed.data.status,
      progress: parsed.data.progress,
      target_date: nextTargetDate,
      target_change_type: targetChanged ? parsed.data.targetChangeType : null,
      target_change_reason: targetChanged ? parsed.data.targetChangeReason || null : null,
    },
  });

  if (
    current.official_assessment_revision_id &&
    targetChanged &&
    parsed.data.targetChangeType === "material"
  ) {
    await submitAssessmentPlan(
      supabase,
      auth.userId,
      parsed.data.projectId,
      parsed.data.targetChangeReason,
    );
  } else if (current.official_assessment_revision_id && targetChanged) {
    const updateText = `The target close date was adjusted to ${nextTargetDate ?? "not yet scheduled"}. ${parsed.data.targetChangeReason}`;
    const { error: updateError } = await supabase.from("project_updates").insert({
      project_id: parsed.data.projectId,
      title: "Target close adjusted",
      body_json: clientUpdateDocument(updateText),
      body_text: updateText,
      audience: "client",
      status_snapshot: parsed.data.status,
      progress_snapshot: parsed.data.progress,
      occurred_at: new Date().toISOString(),
      created_by: auth.userId,
    });
    if (updateError) failure(updateError.message);
  }

  revalidatePath(`/owner/projects/${parsed.data.projectId}`);
  revalidatePath(`/portal/projects/${parsed.data.projectId}`);
  revalidatePath("/portal");
}

export async function addMilestoneAction(formData: FormData) {
  const auth = await requireOwner();
  const parsed = milestoneSchema.safeParse({
    projectId: value(formData, "projectId"),
    projectStageId: value(formData, "projectStageId"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    status: value(formData, "status"),
    dueDate: value(formData, "dueDate"),
    position: value(formData, "position"),
    clientVisible: checked(formData, "clientVisible"),
    changeType: value(formData, "changeType") ?? "minor",
    changeReason: value(formData, "changeReason") ?? "",
  });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid milestone.");

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("status, progress, official_assessment_revision_id")
    .eq("id", parsed.data.projectId)
    .single();
  if (!project) failure("Project not found.");
  if (
    project.official_assessment_revision_id &&
    parsed.data.changeType === "minor" &&
    (parsed.data.changeReason?.length ?? 0) < 5
  ) {
    failure("Explain the minor milestone adjustment for the audit trail.");
  }

  const { data, error } = await supabase
    .from("milestones")
    .insert({
      project_id: parsed.data.projectId,
      project_stage_id: parsed.data.projectStageId || null,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      due_date: parsed.data.dueDate || null,
      completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
      client_visible: parsed.data.clientVisible,
      position: parsed.data.position,
    })
    .select("id")
    .single();
  if (error) failure(error.message);

  await writeAuditEvent(supabase, {
    actorId: auth.userId,
    action: "milestone.created",
    entityType: "milestone",
    entityId: data.id,
    details: {
      project_id: parsed.data.projectId,
      change_type: parsed.data.changeType,
      reason: parsed.data.changeReason || null,
    },
  });

  if (project.official_assessment_revision_id && parsed.data.changeType === "material") {
    await submitAssessmentPlan(supabase, auth.userId, parsed.data.projectId, parsed.data.changeReason);
  } else if (
    project.official_assessment_revision_id &&
    parsed.data.clientVisible &&
    parsed.data.changeReason
  ) {
    const updateText = `A milestone was added to the approved plan: ${parsed.data.title}. ${parsed.data.changeReason}`;
    const { error: updateError } = await supabase.from("project_updates").insert({
      project_id: parsed.data.projectId,
      title: "Milestone added",
      body_json: clientUpdateDocument(updateText),
      body_text: updateText,
      audience: "client",
      status_snapshot: project.status,
      progress_snapshot: project.progress,
      occurred_at: new Date().toISOString(),
      created_by: auth.userId,
    });
    if (updateError) failure(updateError.message);
  }

  revalidatePath(`/owner/projects/${parsed.data.projectId}`);
  revalidatePath(`/portal/projects/${parsed.data.projectId}`);
}

export async function setMilestoneStatusAction(milestoneId: string, projectId: string, formData: FormData) {
  const auth = await requireOwner(); const status = String(value(formData, "status") ?? ""); if (!["not_started", "active", "blocked", "done"].includes(status)) failure("Invalid milestone status.");
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("milestones").update({ status: status as "not_started" | "active" | "blocked" | "done", completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", milestoneId).eq("project_id", projectId); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "milestone.status_updated", entityType: "milestone", entityId: milestoneId, details: { status } }); revalidatePath(`/owner/projects/${projectId}`); revalidatePath(`/portal/projects/${projectId}`);
}

export async function assignProjectMemberAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireOwner();
  const parsed = projectMemberEmailSchema.safeParse({
    projectId: value(formData, "projectId"),
    email: value(formData, "email"),
  });
  if (!parsed.success) return { status: "error", message: "Enter a registered client email." };

  const supabase = await createSupabaseServerClient();
  const { data: ownedProject } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).maybeSingle();
  if (!ownedProject) return { status: "error", message: "Project not found." };

  const admin = createSupabaseAdminClient();
  const { data: targetClient } = await admin.from("profiles").select("id").eq("email", parsed.data.email).eq("role", "client").eq("state", "active").maybeSingle();
  if (!targetClient) return { status: "error", message: "No active registered client matches that email." };

  const { error } = await supabase.from("project_members").upsert({
    project_id: parsed.data.projectId,
    user_id: targetClient.id,
    is_assessment_approver: true,
  });
  if (error) return { status: "error", message: "The client could not be assigned." };

  await writeAuditEvent(supabase, { actorId: auth.userId, action: "project.client_assigned", entityType: "project", entityId: parsed.data.projectId, details: { user_id: targetClient.id } });
  revalidatePath(`/owner/projects/${parsed.data.projectId}`);
  revalidatePath("/portal");
  return { status: "success", message: "Client assigned." };
}

export async function removeProjectMemberAction(projectId: string, userId: string, _formData: FormData) {
  void _formData;
  const auth = await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "project.client_removed", entityType: "project", entityId: projectId, details: { user_id: userId } });
  revalidatePath(`/owner/projects/${projectId}`);
  revalidatePath("/portal");
}

export async function decideProjectRequestAction(formData: FormData) {
  const auth = await requireOwner();
  const parsed = projectRequestDecisionSchema.safeParse({
    requestId: value(formData, "requestId"),
    decision: value(formData, "decision"),
    ownerResponse: value(formData, "ownerResponse") ?? "",
  });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid request decision.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("project_requests").update({
    status: parsed.data.decision,
    owner_response: parsed.data.ownerResponse || null,
  }).eq("id", parsed.data.requestId).eq("status", "submitted").select("id, resulting_project_id").maybeSingle();
  if (error || !data) failure(error?.message ?? "This request is no longer awaiting a decision.");
  await writeAuditEvent(supabase, { actorId: auth.userId, action: `project_request.${parsed.data.decision}`, entityType: "project_request", entityId: data.id, details: { resulting_project_id: data.resulting_project_id } });
  revalidatePath("/owner/requests");
  revalidatePath("/owner/projects");
  revalidatePath("/portal/requests");
}
export async function addProjectUpdateAction(formData: FormData) {
  const auth = await requireOwner(); const parsed = projectUpdateSchema.safeParse({ projectId: value(formData, "projectId"), title: value(formData, "title"), bodyJson: value(formData, "bodyJson"), bodyText: value(formData, "bodyText"), audience: value(formData, "audience") });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid update."); const supabase = await createSupabaseServerClient(); const { data: project } = await supabase.from("projects").select("status, progress").eq("id", parsed.data.projectId).single(); if (!project) failure("Project not found.");
  const { data, error } = await supabase.from("project_updates").insert({ project_id: parsed.data.projectId, title: parsed.data.title, body_json: parsed.data.bodyJson as Json, body_text: parsed.data.bodyText, audience: parsed.data.audience, status_snapshot: project.status, progress_snapshot: project.progress, occurred_at: new Date().toISOString(), created_by: auth.userId }).select("id").single(); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "project_update.created", entityType: "project_update", entityId: data.id }); revalidatePath(`/owner/projects/${parsed.data.projectId}`); revalidatePath(`/portal/projects/${parsed.data.projectId}`);
}


export async function updateBookingAction(formData: FormData) {
  const auth = await requireOwner(); const parsed = bookingStatusSchema.safeParse({ bookingId: value(formData, "bookingId"), status: value(formData, "status"), adminNotes: value(formData, "adminNotes") }); if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid booking update.");
  const clientEmail = String(value(formData, "clientEmail") ?? "").trim().toLowerCase(); const supabase = await createSupabaseServerClient(); const { data: current } = await supabase.from("booking_requests").select("status, client_user_id").eq("id", parsed.data.bookingId).single(); if (!current || !isBookingTransitionAllowed(current.status, parsed.data.status)) failure(`Cannot move this booking from ${current?.status ?? "unknown"} to ${parsed.data.status}.`); let clientUserId = current.client_user_id; if (clientEmail) { const admin = createSupabaseAdminClient(); const { data: targetClient } = await admin.from("profiles").select("id").eq("email", clientEmail).eq("role", "client").eq("state", "active").maybeSingle(); if (!targetClient) failure("No active client matches that email."); clientUserId = targetClient.id; }
  const { error } = await supabase.from("booking_requests").update({ status: parsed.data.status, client_user_id: clientUserId, confirmed_at: parsed.data.status === "confirmed" ? new Date().toISOString() : null }).eq("id", parsed.data.bookingId); if (error) failure(error.message);
  const { data: existingNotes } = await supabase.from("booking_request_admin").select("booking_id").eq("booking_id", parsed.data.bookingId).maybeSingle();
  const notesResult = existingNotes
    ? await supabase.from("booking_request_admin").update({ notes: parsed.data.adminNotes || "", updated_by: auth.userId }).eq("booking_id", parsed.data.bookingId)
    : await supabase.from("booking_request_admin").insert({ booking_id: parsed.data.bookingId, notes: parsed.data.adminNotes || "", created_by: auth.userId, updated_by: auth.userId });
  if (notesResult.error) failure(notesResult.error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "booking.updated", entityType: "booking_request", entityId: parsed.data.bookingId, details: { status: parsed.data.status, linked_client: clientUserId } }); revalidatePath("/owner/bookings"); revalidatePath("/portal/bookings");
}


const allowedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function uploadMediaAction(formData: FormData) {
  const auth = await requireOwner(); const file = value(formData, "file"); const altText = String(value(formData, "altText") ?? "").trim(); if (!(file instanceof File) || file.size === 0) failure("Choose an image."); if (!allowedMediaTypes.has(file.type)) failure("Use a JPEG, PNG, WebP, or AVIF image."); if (file.size > 5_242_880) failure("Images must be 5 MB or smaller."); if (altText.length < 2 || altText.length > 240) failure("Add useful alternative text.");
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as Record<string, string>)[file.type]; const path = `${auth.userId}/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`; const supabase = await createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage.from("public-media").upload(path, file, { contentType: file.type, upsert: false }); if (uploadError) failure(uploadError.message);
  const { data, error } = await supabase.from("media_assets").insert({ bucket: "public-media", path, alt_text: altText, mime_type: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/avif", bytes: file.size, created_by: auth.userId }).select("id").single(); if (error) { await supabase.storage.from("public-media").remove([path]); failure(error.message); }
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "media.uploaded", entityType: "media_asset", entityId: data.id }); revalidatePath("/owner/media");
}
