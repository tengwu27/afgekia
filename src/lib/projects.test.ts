import { describe, expect, it } from "vitest";

import {
  buildAssessmentSnapshot,
  buildProjectTitle,
  isStageTransitionAllowed,
  validateAssessmentPlan,
} from "@/lib/projects";
import type { Milestone, Project, ProjectStage } from "@/types/domain";

function stage(
  code: ProjectStage["code"],
  overrides: Partial<ProjectStage> = {},
): ProjectStage {
  return {
    id: code,
    project_id: "10000000-0000-4000-8000-000000000001",
    code,
    status: code === "assessment" ? "active" : "not_started",
    position: 10,
    planned_start_date: code === "assessment" ? null : "2026-09-01",
    planned_end_date: code === "assessment" ? null : "2026-09-05",
    actual_started_at: null,
    actual_completed_at: null,
    skip_reason: null,
    created_at: "2026-08-24T00:00:00Z",
    updated_at: "2026-08-24T00:00:00Z",
    ...overrides,
  };
}

const milestone = {
  id: "20000000-0000-4000-8000-000000000001",
  project_id: "10000000-0000-4000-8000-000000000001",
  project_stage_id: "cleaning",
  title: "Cleaning complete",
  description: "Seller-visible milestone",
  status: "not_started",
  due_date: "2026-09-05",
  completed_at: null,
  client_visible: true,
  position: 10,
  created_at: "2026-08-24T00:00:00Z",
  updated_at: "2026-08-24T00:00:00Z",
} satisfies Milestone;

describe("real-estate project rules", () => {
  it("builds the required address and seller identity", () => {
    expect(buildProjectTitle(" 1248 Cedar Ave ", " The Parkers ")).toBe(
      "1248 Cedar Ave · The Parkers",
    );
  });

  it("allows the normal stage path and controlled reopening", () => {
    expect(isStageTransitionAllowed("not_started", "active")).toBe(true);
    expect(isStageTransitionAllowed("active", "done")).toBe(true);
    expect(isStageTransitionAllowed("done", "active")).toBe(true);
    expect(isStageTransitionAllowed("done", "skipped")).toBe(false);
  });

  it("requires dates, a visible milestone, and at least one seller approver", () => {
    const stages = [
      stage("assessment"),
      stage("cleaning", { planned_end_date: null }),
    ];
    expect(validateAssessmentPlan(stages, [], 0)).toEqual([
      "Every applicable post-assessment stage needs planned start and end dates.",
      "Add at least one client-visible milestone before requesting approval.",
      "Select at least one assigned seller as an assessment approver.",
    ]);
    expect(validateAssessmentPlan([stage("assessment"), stage("cleaning")], [milestone], 2)).toEqual([]);
  });

  it("creates an independent client-safe approval snapshot", () => {
    const project = {
      property_address_short: "1248 Cedar Ave",
      seller_nickname: "The Parkers",
      start_date: "2026-08-24",
      target_date: "2026-10-15",
    } as Project;
    const stages = [stage("assessment"), stage("cleaning")];
    const snapshot = buildAssessmentSnapshot(project, stages, [milestone]);
    stages[1].planned_start_date = "2027-01-01";
    expect(snapshot.stages[1].plannedStartDate).toBe("2026-09-01");
    expect(snapshot.milestones).toHaveLength(1);
  });
});
