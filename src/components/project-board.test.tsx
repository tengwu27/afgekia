import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectBoard } from "@/components/project-board";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BoardMilestone, BoardProject, BoardStage } from "@/lib/project-board";

const navigation = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/owner/projects",
  useRouter: () => ({ replace: navigation.replace, refresh: navigation.refresh }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

vi.mock("@/app/owner/actions", () => ({
  updateMilestoneFromBoardAction: vi.fn(),
  updateProjectStageFromBoardAction: vi.fn(),
}));

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

afterEach(() => {
  cleanup();
  navigation.search = "";
  navigation.replace.mockReset();
  navigation.refresh.mockReset();
});

function renderBoard() {
  return render(
    <TooltipProvider>
      <ProjectBoard projects={[project]} stages={[stage]} milestones={[milestone]} today="2026-09-06" />
    </TooltipProvider>,
  );
}

describe("ProjectBoard", () => {
  it("opens in Timeline view and writes view changes to the URL", async () => {
    const user = userEvent.setup();
    renderBoard();

    expect(screen.getByRole("heading", { name: "Portfolio timeline" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /kanban/i }));
    expect(navigation.replace).toHaveBeenCalledWith("/owner/projects?view=kanban", { scroll: false });
  });

  it("places stages and milestones in their Kanban columns", () => {
    navigation.search = "view=kanban";
    renderBoard();

    expect(screen.getByRole("heading", { name: "Not started" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Completed" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cleaning" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deep clean complete" })).toBeInTheDocument();
  });

  it("opens the full stage editor from a Kanban card", () => {
    navigation.search = "view=kanban";
    renderBoard();

    fireEvent.click(screen.getByRole("heading", { name: "Cleaning" }).closest("button")!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Stage status")).toBeInTheDocument();
    expect(screen.getByLabelText("Planned start")).toHaveValue("2026-09-05");
    expect(screen.getByRole("button", { name: "Save stage" })).toBeInTheDocument();
  });
});
