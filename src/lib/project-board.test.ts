import { describe, expect, it } from "vitest";

import {
  buildTimelineTicks,
  defaultProjectStatuses,
  filterBoardItems,
  getTimelineRange,
  isItemOverdue,
  parseBoardQuery,
  serializeBoardQuery,
  timelinePosition,
  timelineWidth,
  type BoardFilters,
  type BoardMilestone,
  type BoardProject,
  type BoardStage,
} from "@/lib/project-board";

const project: BoardProject = {
  id: "10000000-0000-4000-8000-000000000001",
  referenceCode: "PRJ-1001",
  title: "1248 Cedar Ave · The Parkers",
  propertyAddressShort: "1248 Cedar Ave",
  sellerNickname: "The Parkers",
  summary: "A coordinated listing project.",
  status: "active",
  progress: 35,
  startDate: "2026-09-01",
  targetDate: "2026-10-31",
  officialAssessmentRevisionId: null,
};

const stage: BoardStage = {
  kind: "stage",
  id: "20000000-0000-4000-8000-000000000001",
  projectId: project.id,
  title: "Cleaning",
  code: "cleaning",
  status: "active",
  position: 20,
  plannedStartDate: "2026-09-05",
  plannedEndDate: "2026-09-10",
  actualStartedAt: null,
  actualCompletedAt: null,
  skipReason: null,
};

const milestone: BoardMilestone = {
  kind: "milestone",
  id: "30000000-0000-4000-8000-000000000001",
  projectId: project.id,
  projectStageId: stage.id,
  title: "Deep clean complete",
  description: "Seller-visible delivery marker.",
  status: "not_started",
  position: 10,
  dueDate: "2026-09-08",
  completedAt: null,
  clientVisible: true,
};

const filters: BoardFilters = {
  projectIds: [],
  projectStatuses: ["planning", "active", "on_hold"],
  itemStatuses: [],
  due: "any",
  from: "",
  to: "",
};

describe("project board query state", () => {
  it("uses the timeline, week zoom, and open project defaults", () => {
    const parsed = parseBoardQuery(new URLSearchParams(), [project.id]);
    expect(parsed.view).toBe("timeline");
    expect(parsed.zoom).toBe("week");
    expect(parsed.projectStatuses).toEqual(defaultProjectStatuses);
  });

  it("validates repeatable filters and serializes only non-default state", () => {
    const params = new URLSearchParams();
    params.set("view", "kanban");
    params.set("zoom", "quarter");
    params.append("project", project.id);
    params.append("project", "not-accessible");
    params.append("projectStatus", "completed");
    params.append("itemStatus", "blocked");
    params.set("due", "custom");
    params.set("from", "2026-09-01");
    params.set("to", "invalid");
    const parsed = parseBoardQuery(params, [project.id]);

    expect(parsed.projectIds).toEqual([project.id]);
    expect(parsed.projectStatuses).toEqual(["completed"]);
    expect(parsed.itemStatuses).toEqual(["blocked"]);
    expect(parsed.from).toBe("2026-09-01");
    expect(parsed.to).toBe("");
    expect(serializeBoardQuery(parsed)).toContain("view=kanban");
    expect(serializeBoardQuery(parsed)).not.toContain("not-accessible");
  });
});

describe("project board filtering", () => {
  it("defaults to open projects and sorts dated work before undated work", () => {
    const undated = { ...milestone, id: "40000000-0000-4000-8000-000000000001", dueDate: null };
    const completedProject = { ...project, id: "50000000-0000-4000-8000-000000000001", status: "completed" as const };
    const completedItem = { ...milestone, id: "60000000-0000-4000-8000-000000000001", projectId: completedProject.id };
    const result = filterBoardItems(
      [project, completedProject],
      [undated, milestone, stage, completedItem],
      filters,
      "2026-09-06",
    );

    expect(result.projects.map((candidate) => candidate.id)).toEqual([project.id]);
    expect(result.items.at(-1)?.id).toBe(undated.id);
  });

  it("treats only unfinished past-due items as overdue", () => {
    const overdue = { ...milestone, dueDate: "2026-09-01" };
    const finished = { ...overdue, id: "70000000-0000-4000-8000-000000000001", status: "done" as const };
    expect(isItemOverdue(overdue, "2026-09-06")).toBe(true);
    expect(isItemOverdue(finished, "2026-09-06")).toBe(false);

    const result = filterBoardItems(
      [project],
      [overdue, finished],
      { ...filters, due: "overdue" },
      "2026-09-06",
    );
    expect(result.items).toEqual([overdue]);
  });

  it("uses stage end dates and milestone due dates for custom ranges", () => {
    const result = filterBoardItems(
      [project],
      [stage, milestone],
      { ...filters, due: "custom", from: "2026-09-09", to: "2026-09-12" },
      "2026-09-01",
    );
    expect(result.items).toEqual([stage]);
  });
});

describe("project board timeline geometry", () => {
  it("includes project dates, work dates, today, and zoom padding", () => {
    const range = getTimelineRange([project], [stage, milestone], "week", "2026-09-06");
    expect(range.start).toBe("2026-08-25");
    expect(range.end).toBe("2026-11-07");
    expect(range.days).toBe(75);
  });

  it("builds deterministic ticks and stage geometry", () => {
    const range = { start: "2026-09-01", end: "2026-09-30", days: 30 };
    const ticks = buildTimelineTicks(range, "week");
    expect(ticks.map((tick) => tick.date)).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
      "2026-09-22",
      "2026-09-29",
    ]);
    expect(timelinePosition("2026-09-06", range, "week")).toBe(90);
    expect(timelineWidth("2026-09-05", "2026-09-10", range, "week")).toEqual({
      left: 72,
      width: 108,
    });
  });
});
