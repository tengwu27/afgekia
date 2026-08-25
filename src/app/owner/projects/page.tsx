import { Suspense } from "react";

import { ProjectBoard } from "@/components/project-board";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireOwner } from "@/lib/auth";
import type { BoardMilestone, BoardProject, BoardStage } from "@/lib/project-board";
import { listingStageLabels } from "@/lib/projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OwnerProjectsPage() {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const [projectsResult, stagesResult, milestonesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, reference_code, title, property_address_short, seller_nickname, summary, status, progress, start_date, target_date, official_assessment_revision_id")
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_stages")
      .select("id, project_id, code, status, position, planned_start_date, planned_end_date, actual_started_at, actual_completed_at, skip_reason")
      .order("position"),
    supabase
      .from("milestones")
      .select("id, project_id, project_stage_id, title, description, status, due_date, completed_at, position, client_visible")
      .order("position"),
  ]);

  if (projectsResult.error || stagesResult.error || milestonesResult.error) {
    throw new Error("The project board could not be loaded.");
  }

  const projects: BoardProject[] = (projectsResult.data ?? []).map((project) => ({
    id: project.id,
    referenceCode: project.reference_code,
    title: project.title,
    propertyAddressShort: project.property_address_short,
    sellerNickname: project.seller_nickname,
    summary: project.summary,
    status: project.status,
    progress: project.progress,
    startDate: project.start_date,
    targetDate: project.target_date,
    officialAssessmentRevisionId: project.official_assessment_revision_id,
  }));
  const stages: BoardStage[] = (stagesResult.data ?? []).map((stage) => ({
    kind: "stage",
    id: stage.id,
    projectId: stage.project_id,
    title: listingStageLabels[stage.code],
    code: stage.code,
    status: stage.status,
    position: stage.position,
    plannedStartDate: stage.planned_start_date,
    plannedEndDate: stage.planned_end_date,
    actualStartedAt: stage.actual_started_at,
    actualCompletedAt: stage.actual_completed_at,
    skipReason: stage.skip_reason,
  }));
  const milestones: BoardMilestone[] = (milestonesResult.data ?? []).map((milestone) => ({
    kind: "milestone",
    id: milestone.id,
    projectId: milestone.project_id,
    title: milestone.title,
    description: milestone.description,
    status: milestone.status,
    position: milestone.position,
    dueDate: milestone.due_date,
    completedAt: milestone.completed_at,
    projectStageId: milestone.project_stage_id,
    clientVisible: milestone.client_visible,
  }));

  return (
    <>
      <WorkspaceHeading
        eyebrow="Delivery control"
        title="Project board"
        description="See every listing phase against time, switch to status-based work queues, and update the plan without losing seller approval safeguards."
      />
      <Suspense fallback={<ProjectBoardSkeleton />}>
        <ProjectBoard
          projects={projects}
          stages={stages}
          milestones={milestones}
          today={new Date().toISOString().slice(0, 10)}
        />
      </Suspense>
    </>
  );
}

function ProjectBoardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading project board">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-[32rem] w-full rounded-xl" />
    </div>
  );
}
