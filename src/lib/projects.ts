import type { Json } from "@/types/database.generated";
import type {
  ListingStageCode,
  ListingStageStatus,
  Milestone,
  Project,
  ProjectStage,
} from "@/types/domain";

export const listingStageCodes = [
  "assessment",
  "cleaning",
  "remodel",
  "staging",
  "photography_marketing",
  "open_house",
  "under_contract",
  "closed",
] as const satisfies readonly ListingStageCode[];

export const listingStageLabels: Record<ListingStageCode, string> = {
  assessment: "Initial assessment",
  cleaning: "Cleaning",
  remodel: "Remodel",
  staging: "Staging",
  photography_marketing: "Photography & marketing",
  open_house: "Open house",
  under_contract: "Under contract",
  closed: "Closed",
};

export const listingStageStatuses = [
  "not_started",
  "active",
  "blocked",
  "done",
  "skipped",
] as const satisfies readonly ListingStageStatus[];

const stageTransitions: Record<ListingStageStatus, readonly ListingStageStatus[]> = {
  not_started: ["not_started", "active", "blocked", "skipped"],
  active: ["active", "blocked", "done", "skipped"],
  blocked: ["blocked", "active", "skipped"],
  done: ["done", "active"],
  skipped: ["skipped", "not_started"],
};

export function buildProjectTitle(propertyAddressShort: string, sellerNickname: string) {
  return `${propertyAddressShort.trim()} · ${sellerNickname.trim()}`;
}

export function isStageTransitionAllowed(from: ListingStageStatus, to: ListingStageStatus) {
  return stageTransitions[from].includes(to);
}

export interface AssessmentSnapshot {
  version: 1;
  project: {
    propertyAddressShort: string;
    sellerNickname: string;
    startDate: string | null;
    targetDate: string | null;
  };
  stages: Array<{
    id: string;
    code: ListingStageCode;
    status: ListingStageStatus;
    position: number;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    skipReason: string | null;
  }>;
  milestones: Array<{
    id: string;
    projectStageId: string | null;
    title: string;
    description: string;
    dueDate: string | null;
    position: number;
  }>;
}

export function buildAssessmentSnapshot(
  project: Project,
  stages: ProjectStage[],
  milestones: Milestone[],
): AssessmentSnapshot {
  return {
    version: 1,
    project: {
      propertyAddressShort: project.property_address_short,
      sellerNickname: project.seller_nickname,
      startDate: project.start_date,
      targetDate: project.target_date,
    },
    stages: stages.map((stage) => ({
      id: stage.id,
      code: stage.code,
      status: stage.status,
      position: stage.position,
      plannedStartDate: stage.planned_start_date,
      plannedEndDate: stage.planned_end_date,
      skipReason: stage.skip_reason,
    })),
    milestones: milestones
      .filter((milestone) => milestone.client_visible)
      .map((milestone) => ({
        id: milestone.id,
        projectStageId: milestone.project_stage_id,
        title: milestone.title,
        description: milestone.description,
        dueDate: milestone.due_date,
        position: milestone.position,
      })),
  };
}

export function assessmentSnapshotToJson(snapshot: AssessmentSnapshot): Json {
  return snapshot as unknown as Json;
}

export function validateAssessmentPlan(
  stages: ProjectStage[],
  milestones: Milestone[],
  approverCount: number,
) {
  const errors: string[] = [];
  const assessment = stages.find((stage) => stage.code === "assessment");

  if (!assessment || assessment.status === "skipped") {
    errors.push("The initial assessment stage is required.");
  }

  const missingDates = stages.filter(
    (stage) =>
      stage.code !== "assessment" &&
      stage.status !== "skipped" &&
      (!stage.planned_start_date || !stage.planned_end_date),
  );

  if (missingDates.length > 0) {
    errors.push("Every applicable post-assessment stage needs planned start and end dates.");
  }

  if (!milestones.some((milestone) => milestone.client_visible)) {
    errors.push("Add at least one client-visible milestone before requesting approval.");
  }

  if (approverCount < 1) {
    errors.push("Select at least one assigned seller as an assessment approver.");
  }

  return errors;
}

export function parseAssessmentSnapshot(value: Json): AssessmentSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as unknown as Partial<AssessmentSnapshot>;
  if (snapshot.version !== 1 || !snapshot.project || !Array.isArray(snapshot.stages)) return null;
  return snapshot as AssessmentSnapshot;
}
