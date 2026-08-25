"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowUpRight, CalendarClock, Flag, Loader2 } from "lucide-react";
import Link from "next/link";

import {
  updateMilestoneFromBoardAction,
  updateProjectStageFromBoardAction,
} from "@/app/owner/actions";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  isStageTransitionAllowed,
  listingStageStatuses,
} from "@/lib/projects";
import type {
  BoardItem,
  BoardMilestone,
  BoardProject,
  BoardStage,
} from "@/lib/project-board";
import type { ActionState, ListingStageStatus } from "@/types/domain";

const initialState: ActionState = { status: "idle" };
const milestoneStatuses = ["not_started", "active", "blocked", "done"] as const;

interface ProjectBoardEditSheetProps {
  item: BoardItem | null;
  project: BoardProject | null;
  projectStages: BoardStage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ProjectBoardEditSheet({
  item,
  project,
  projectStages,
  open,
  onOpenChange,
  onSaved,
}: ProjectBoardEditSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {item && project ? (
          <div key={`${item.kind}:${item.id}`}>
            <SheetHeader className="border-b px-5 pt-6 pb-5">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                {item.kind === "stage" ? <CalendarClock className="size-4" /> : <Flag className="size-4" />}
                {item.kind === "stage" ? "Project stage" : "Milestone"}
              </div>
              <SheetTitle className="mt-2 pr-10 text-3xl">{item.title}</SheetTitle>
              <SheetDescription className="leading-6">
                {project.title} · Changes stay protected by the approved-plan workflow.
              </SheetDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge value={item.status} />
                <Button asChild variant="ghost" size="xs">
                  <Link href={`/owner/projects/${project.id}`}>
                    Open full project <ArrowUpRight />
                  </Link>
                </Button>
              </div>
            </SheetHeader>
            {item.kind === "stage" ? (
              <StageEditForm
                item={item}
                project={project}
                onSaved={onSaved}
              />
            ) : (
              <MilestoneEditForm
                item={item}
                project={project}
                projectStages={projectStages}
                onSaved={onSaved}
              />
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function StageEditForm({
  item,
  project,
  onSaved,
}: {
  item: BoardStage;
  project: BoardProject;
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateProjectStageFromBoardAction,
    initialState,
  );
  const [status, setStatus] = useState<ListingStageStatus>(item.status);

  useEffect(() => {
    if (state.status === "success") onSaved();
  }, [onSaved, state.status]);

  const allowedStatuses = listingStageStatuses.filter(
    (candidate) =>
      (item.code !== "assessment" || candidate !== "skipped") &&
      isStageTransitionAllowed(item.status, candidate),
  );

  return (
    <form action={action} className="space-y-6 p-5">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="stageId" value={item.id} />
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <BoardField label="Stage status" htmlFor="board-stage-status">
        <Select name="status" value={status} onValueChange={(value) => setStatus(value as ListingStageStatus)}>
          <SelectTrigger id="board-stage-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedStatuses.map((candidate) => (
              <SelectItem key={candidate} value={candidate}>
                {humanize(candidate)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </BoardField>

      <div className="grid gap-4 sm:grid-cols-2">
        <BoardField label="Planned start" htmlFor="board-stage-start">
          <Input
            id="board-stage-start"
            name="plannedStartDate"
            type="date"
            defaultValue={item.plannedStartDate ?? ""}
          />
        </BoardField>
        <BoardField label="Planned end" htmlFor="board-stage-end">
          <Input
            id="board-stage-end"
            name="plannedEndDate"
            type="date"
            defaultValue={item.plannedEndDate ?? ""}
          />
        </BoardField>
      </div>

      {status === "skipped" ? (
        <BoardField label="Skip reason" htmlFor="board-stage-skip-reason">
          <Textarea
            id="board-stage-skip-reason"
            name="skipReason"
            defaultValue={item.skipReason ?? ""}
            required
            minLength={5}
            maxLength={500}
            rows={3}
          />
        </BoardField>
      ) : (
        <input type="hidden" name="skipReason" value="" />
      )}

      <PlanImpactFields official={Boolean(project.officialAssessmentRevisionId)} />

      <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t bg-popover px-5 py-4">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {pending ? "Saving stage…" : "Dates use the project’s local calendar day."}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save stage
        </Button>
      </div>
    </form>
  );
}

function MilestoneEditForm({
  item,
  project,
  projectStages,
  onSaved,
}: {
  item: BoardMilestone;
  project: BoardProject;
  projectStages: BoardStage[];
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(updateMilestoneFromBoardAction, initialState);

  useEffect(() => {
    if (state.status === "success") onSaved();
  }, [onSaved, state.status]);

  return (
    <form action={action} className="space-y-6 p-5">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="milestoneId" value={item.id} />
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <BoardField label="Milestone title" htmlFor="board-milestone-title" error={state.fieldErrors?.title?.[0]}>
        <Input
          id="board-milestone-title"
          name="title"
          defaultValue={item.title}
          required
          minLength={2}
          maxLength={160}
        />
      </BoardField>

      <BoardField label="Description" htmlFor="board-milestone-description" error={state.fieldErrors?.description?.[0]}>
        <Textarea
          id="board-milestone-description"
          name="description"
          defaultValue={item.description}
          maxLength={3000}
          rows={4}
        />
      </BoardField>

      <div className="grid gap-4 sm:grid-cols-2">
        <BoardField label="Status" htmlFor="board-milestone-status">
          <Select name="status" defaultValue={item.status}>
            <SelectTrigger id="board-milestone-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {milestoneStatuses.map((status) => (
                <SelectItem key={status} value={status}>{humanize(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BoardField>
        <BoardField label="Due date" htmlFor="board-milestone-due">
          <Input
            id="board-milestone-due"
            name="dueDate"
            type="date"
            defaultValue={item.dueDate ?? ""}
          />
        </BoardField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <BoardField label="Listing stage" htmlFor="board-milestone-stage">
          <Select name="projectStageId" defaultValue={item.projectStageId ?? "none"}>
            <SelectTrigger id="board-milestone-stage" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No stage</SelectItem>
              {projectStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>{stage.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BoardField>
        <BoardField label="Display order" htmlFor="board-milestone-position">
          <Input
            id="board-milestone-position"
            name="position"
            type="number"
            min={0}
            max={10_000}
            defaultValue={item.position}
          />
        </BoardField>
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
        <Checkbox id="board-milestone-visible" name="clientVisible" defaultChecked={item.clientVisible} />
        <div>
          <Label htmlFor="board-milestone-visible">Seller-visible milestone</Label>
          <p className="mt-1 text-xs text-muted-foreground">Assigned clients can see this milestone in their portal.</p>
        </div>
      </div>

      <PlanImpactFields official={Boolean(project.officialAssessmentRevisionId)} />

      <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t bg-popover px-5 py-4">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {pending ? "Saving milestone…" : "Status-only changes do not revise the approved plan."}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save milestone
        </Button>
      </div>
    </form>
  );
}

function PlanImpactFields({ official }: { official: boolean }) {
  return (
    <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
      <div>
        <p className="font-medium">Approved-plan impact</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {official
            ? "A material planning change starts a new seller approval revision."
            : "This project does not yet have an official seller-approved plan."}
        </p>
      </div>
      <BoardField label="Change type" htmlFor="board-change-type">
        <Select name="changeType" defaultValue="minor">
          <SelectTrigger id="board-change-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minor">Minor adjustment</SelectItem>
            <SelectItem value="material">Material — request new approval</SelectItem>
          </SelectContent>
        </Select>
      </BoardField>
      <BoardField label="Adjustment reason" htmlFor="board-change-reason">
        <Textarea
          id="board-change-reason"
          name="changeReason"
          maxLength={500}
          rows={3}
          placeholder={official ? "Explain the change for the audit trail" : "Optional before approval"}
        />
      </BoardField>
    </div>
  );
}

function BoardField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
