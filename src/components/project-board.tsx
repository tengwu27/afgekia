"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarClock,
  CalendarDays,
  CalendarX2,
  Check,
  ChevronDown,
  CircleDot,
  Columns3,
  Flag,
  GanttChartSquare,
  Layers3,
  ListFilter,
  RotateCcw,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ProjectBoardEditSheet } from "@/components/project-board-edit-sheet";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { humanize } from "@/lib/format";
import {
  boardItemStatusOptions,
  buildTimelineTicks,
  defaultBoardQuery,
  dueFilters,
  filterBoardItems,
  getTimelineRange,
  isItemOverdue,
  itemDueDate,
  parseBoardQuery,
  projectStatusOptions,
  serializeBoardQuery,
  timelinePosition,
  timelineWidth,
  timelineZooms,
  zoomPixelsPerDay,
  type BoardItem,
  type BoardItemStatus,
  type BoardProject,
  type BoardQueryState,
  type BoardStage,
  type BoardView,
  type TimelineRange,
  type TimelineZoom,
} from "@/lib/project-board";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/domain";

interface ProjectBoardProps {
  projects: BoardProject[];
  stages: BoardStage[];
  milestones: Extract<BoardItem, { kind: "milestone" }>[];
  today: string;
}

const kanbanColumns = [
  ["not_started", "Not started"],
  ["active", "Active"],
  ["blocked", "Blocked"],
  ["done", "Completed"],
  ["skipped", "Skipped"],
] as const;

const dueLabels = {
  any: "Any due date",
  overdue: "Overdue",
  "7": "Next 7 days",
  "30": "Next 30 days",
  "90": "Next 90 days",
  none: "No due date",
  custom: "Custom range",
} as const;

const zoomLabels: Record<TimelineZoom, string> = {
  day: "Day",
  week: "Week",
  biweek: "Bi-week",
  month: "Month",
  quarter: "Quarter",
};

export function ProjectBoard({ projects, stages, milestones, today }: ProjectBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allItems = useMemo<BoardItem[]>(() => [...stages, ...milestones], [milestones, stages]);
  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);
  const query = useMemo(
    () => parseBoardQuery(new URLSearchParams(searchParams.toString()), projectIds),
    [projectIds, searchParams],
  );
  const [selectedKey, setSelectedKey] = useState<{ kind: BoardItem["kind"]; id: string } | null>(null);

  const replaceQuery = useCallback(
    (next: BoardQueryState) => {
      const serialized = serializeBoardQuery(next);
      const href = serialized ? `${pathname}?${serialized}` : pathname;
      router.replace(href as Route, { scroll: false });
    },
    [pathname, router],
  );

  const updateQuery = useCallback(
    (patch: Partial<BoardQueryState>) => replaceQuery({ ...query, ...patch }),
    [query, replaceQuery],
  );

  const filtered = useMemo(
    () => filterBoardItems(projects, allItems, query, today),
    [allItems, projects, query, today],
  );
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const stageById = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);
  const selectedItem = selectedKey
    ? allItems.find((item) => item.kind === selectedKey.kind && item.id === selectedKey.id) ?? null
    : null;
  const selectedProject = selectedItem ? projectById.get(selectedItem.projectId) ?? null : null;
  const selectedProjectStages = selectedItem
    ? stages.filter((stage) => stage.projectId === selectedItem.projectId)
    : [];

  const scheduledCount = filtered.items.filter(isScheduled).length;
  const unscheduledCount = filtered.items.length - scheduledCount;

  const openItem = useCallback((item: BoardItem) => {
    setSelectedKey({ kind: item.kind, id: item.id });
  }, []);
  const handleSaved = useCallback(() => {
    setSelectedKey(null);
    router.refresh();
  }, [router]);

  if (projects.length === 0) {
    return (
      <Card className="border-dashed py-12">
        <CardContent className="text-center">
          <Layers3 className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-2xl">No projects yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Approve a listing request to create a project and its eight-stage delivery plan.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <BoardToolbar
        projects={projects}
        query={query}
        onChange={updateQuery}
        onReset={() => replaceQuery({ ...defaultBoardQuery, view: query.view, zoom: query.zoom })}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <BoardMetric icon={Layers3} label="Projects in view" value={filtered.projects.length} />
        <BoardMetric icon={CalendarDays} label="Scheduled items" value={scheduledCount} />
        <BoardMetric icon={CalendarX2} label="Unscheduled items" value={unscheduledCount} />
      </div>

      {filtered.items.length === 0 ? (
        <Card className="border-dashed py-12">
          <CardContent className="text-center">
            <ListFilter className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 text-2xl">No work matches these filters</h2>
            <p className="mt-2 text-sm text-muted-foreground">Clear or widen the filters to restore project work.</p>
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => replaceQuery({ ...defaultBoardQuery, view: query.view, zoom: query.zoom })}
            >
              <RotateCcw /> Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : query.view === "timeline" ? (
        <TimelineBoard
          projects={filtered.projects}
          items={filtered.items}
          zoom={query.zoom}
          today={today}
          onOpenItem={openItem}
        />
      ) : (
        <KanbanBoard
          items={filtered.items}
          projectById={projectById}
          stageById={stageById}
          today={today}
          onOpenItem={openItem}
        />
      )}

      <ProjectBoardEditSheet
        item={selectedItem}
        project={selectedProject}
        projectStages={selectedProjectStages}
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedKey(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}

function BoardToolbar({
  projects,
  query,
  onChange,
  onReset,
}: {
  projects: BoardProject[];
  query: BoardQueryState;
  onChange: (patch: Partial<BoardQueryState>) => void;
  onReset: () => void;
}) {
  return (
    <Card className="py-4">
      <CardContent className="space-y-4 px-4 sm:px-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <Tabs
            value={query.view}
            onValueChange={(value) => onChange({ view: value as BoardView })}
          >
            <TabsList aria-label="Project board view" className="h-10">
              <TabsTrigger value="timeline" className="px-3">
                <GanttChartSquare /> Timeline
              </TabsTrigger>
              <TabsTrigger value="kanban" className="px-3">
                <Columns3 /> Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-2">
            <MultiSelectFilter
              label="Projects"
              values={projects.map((project) => ({ value: project.id, label: project.title }))}
              selected={query.projectIds}
              onChange={(projectIds) => onChange({ projectIds })}
              allLabel="All projects"
            />
            <MultiSelectFilter
              label="Project status"
              values={projectStatusOptions.map((status) => ({ value: status, label: humanize(status) }))}
              selected={query.projectStatuses}
              onChange={(projectStatuses) => {
                onChange({
                  projectStatuses: (projectStatuses.length > 0
                    ? projectStatuses
                    : projectStatusOptions) as ProjectStatus[],
                });
              }}
              allLabel="All project statuses"
            />
            <MultiSelectFilter
              label="Item status"
              values={boardItemStatusOptions.map((status) => ({
                value: status,
                label: status === "done" ? "Completed" : humanize(status),
              }))}
              selected={query.itemStatuses}
              onChange={(itemStatuses) => onChange({ itemStatuses: itemStatuses as BoardItemStatus[] })}
              allLabel="All item statuses"
            />
            <Select value={query.due} onValueChange={(due) => onChange({ due: due as BoardQueryState["due"] })}>
              <SelectTrigger aria-label="Due date filter" className="h-9 min-w-40">
                <CalendarClock className="text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dueFilters.map((due) => <SelectItem key={due} value={due}>{dueLabels[due]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onReset} aria-label="Clear project board filters">
              <RotateCcw /> Reset
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
          {query.due === "custom" ? (
            <div className="grid max-w-md grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="board-date-from" className="text-xs">Due from</Label>
                <Input
                  id="board-date-from"
                  type="date"
                  value={query.from}
                  onChange={(event) => onChange({ from: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="board-date-to" className="text-xs">Due through</Label>
                <Input
                  id="board-date-to"
                  type="date"
                  min={query.from || undefined}
                  value={query.to}
                  onChange={(event) => onChange({ to: event.target.value })}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              Filters apply to stage planned-end dates and milestone due dates.
            </p>
          )}

          {query.view === "timeline" ? (
            <div className="flex items-center gap-2">
              <Label htmlFor="timeline-zoom" className="text-xs text-muted-foreground">Zoom</Label>
              <Select value={query.zoom} onValueChange={(zoom) => onChange({ zoom: zoom as TimelineZoom })}>
                <SelectTrigger id="timeline-zoom" className="h-8 min-w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timelineZooms.map((zoom) => <SelectItem key={zoom} value={zoom}>{zoomLabels[zoom]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MultiSelectFilter({
  label,
  values,
  selected,
  onChange,
  allLabel,
}: {
  label: string;
  values: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (values: string[]) => void;
  allLabel: string;
}) {
  const display = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? values.find((value) => value.value === selected[0])?.label ?? label
      : `${label} · ${selected.length}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-56 justify-between font-normal">
          <span className="truncate">{display}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {values.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => {
              onChange(
                checked
                  ? [...selected, option.value]
                  : selected.filter((value) => value !== option.value),
              );
            }}
          >
            <span className="truncate">{option.label}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              <Check className="opacity-0" /> Show all
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BoardMetric({ icon: Icon, label, value }: { icon: typeof Layers3; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-2xl leading-none">{value}</p>
      </div>
    </div>
  );
}

function TimelineBoard({
  projects,
  items,
  zoom,
  today,
  onOpenItem,
}: {
  projects: BoardProject[];
  items: BoardItem[];
  zoom: TimelineZoom;
  today: string;
  onOpenItem: (item: BoardItem) => void;
}) {
  const scheduled = items.filter(isScheduled);
  const unscheduled = items.filter((item) => !isScheduled(item));
  const projectsWithWork = projects.filter((project) => items.some((item) => item.projectId === project.id));
  const range = getTimelineRange(projectsWithWork, scheduled, zoom, today);
  const ticks = buildTimelineTicks(range, zoom);
  const canvasWidth = Math.max(760, range.days * zoomPixelsPerDay[zoom]);
  const scroller = useRef<HTMLDivElement>(null);

  const todayOffset = timelinePosition(today, range, zoom);
  function scrollToToday(behavior: ScrollBehavior = "smooth") {
    if (!scroller.current) return;
    scrollTimeline(scroller.current, todayOffset, behavior);
  }

  useEffect(() => {
    if (!scroller.current) return;
    scrollTimeline(scroller.current, todayOffset, "auto");
  }, [todayOffset]);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden py-0">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-xl">Portfolio timeline</h2>
            <p className="text-xs text-muted-foreground">Planned work · {zoomLabels[zoom].toLowerCase()} scale</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => scrollToToday()}>
            <CircleDot /> Today
          </Button>
        </div>
        <div ref={scroller} className="max-h-[70vh] overflow-auto" aria-label="Project timeline">
          <div style={{ width: canvasWidth + 240 }} className="relative min-w-full">
            <TimelineAxis range={range} ticks={ticks} zoom={zoom} width={canvasWidth} />
            {projectsWithWork.map((project) => (
              <ProjectTimelineGroup
                key={project.id}
                project={project}
                items={items.filter((item) => item.projectId === project.id && isScheduled(item))}
                range={range}
                ticks={ticks}
                zoom={zoom}
                width={canvasWidth}
                today={today}
                onOpenItem={onOpenItem}
              />
            ))}
          </div>
        </div>
      </Card>

      {unscheduled.length > 0 ? (
        <Card className="py-5">
          <CardContent>
            <div className="flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-gold/15 text-foreground"><CalendarX2 className="size-4" /></span>
              <div>
                <h2 className="text-2xl">Unscheduled</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add a complete stage range or milestone due date to place these on the timeline.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {unscheduled.map((item) => (
                <BoardItemButton
                  key={`${item.kind}:${item.id}`}
                  item={item}
                  project={projects.find((project) => project.id === item.projectId)!}
                  today={today}
                  onClick={() => onOpenItem(item)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function TimelineAxis({
  range,
  ticks,
  zoom,
  width,
}: {
  range: TimelineRange;
  ticks: ReturnType<typeof buildTimelineTicks>;
  zoom: TimelineZoom;
  width: number;
}) {
  return (
    <div className="sticky top-0 z-30 grid h-12 border-b bg-card" style={{ gridTemplateColumns: `240px ${width}px` }}>
      <div className="sticky left-0 z-40 flex items-center border-r bg-card px-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Project / work item
      </div>
      <div className="relative overflow-hidden">
        {ticks.map((tick) => (
          <div
            key={tick.date}
            className="absolute inset-y-0 border-l px-2 pt-3 font-mono text-[10px] whitespace-nowrap text-muted-foreground"
            style={{ left: timelinePosition(tick.date, range, zoom) }}
          >
            {tick.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectTimelineGroup({
  project,
  items,
  range,
  ticks,
  zoom,
  width,
  today,
  onOpenItem,
}: {
  project: BoardProject;
  items: BoardItem[];
  range: TimelineRange;
  ticks: ReturnType<typeof buildTimelineTicks>;
  zoom: TimelineZoom;
  width: number;
  today: string;
  onOpenItem: (item: BoardItem) => void;
}) {
  const stages = items.filter((item): item is BoardStage => item.kind === "stage");
  const milestones = items.filter((item) => item.kind === "milestone");

  return (
    <section className="border-b last:border-b-0" aria-labelledby={`timeline-project-${project.id}`}>
      <div className="grid min-h-16 bg-muted/25" style={{ gridTemplateColumns: `240px ${width}px` }}>
        <div className="sticky left-0 z-20 border-r bg-muted px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h3 id={`timeline-project-${project.id}`} className="min-w-0 truncate font-sans text-sm font-semibold">
              <Link href={`/owner/projects/${project.id}`} className="hover:text-primary hover:underline hover:underline-offset-4">
                {project.title}
              </Link>
            </h3>
            <StatusBadge value={project.status} />
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{project.referenceCode} · {project.progress}%</p>
        </div>
        <TimelineTrack range={range} ticks={ticks} zoom={zoom} width={width} today={today}>
          {project.startDate && project.targetDate ? (
            <div
              className="absolute top-6 h-2 rounded-full bg-primary/20"
              style={timelineWidth(project.startDate, project.targetDate, range, zoom)}
              title={`${formatBoardDate(project.startDate)} – ${formatBoardDate(project.targetDate)}`}
            />
          ) : null}
        </TimelineTrack>
      </div>

      {stages.map((stage) => {
        const geometry = timelineWidth(stage.plannedStartDate!, stage.plannedEndDate!, range, zoom);
        return (
          <div key={stage.id} className="grid min-h-14" style={{ gridTemplateColumns: `240px ${width}px` }}>
            <button
              type="button"
              onClick={() => onOpenItem(stage)}
              className="sticky left-0 z-20 flex min-w-0 items-center justify-between gap-2 border-r bg-card px-4 text-left hover:bg-muted"
            >
              <span className="truncate text-xs font-medium">{stage.title}</span>
              <StatusBadge value={stage.status} />
            </button>
            <TimelineTrack range={range} ticks={ticks} zoom={zoom} width={width} today={today}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onOpenItem(stage)}
                    className={cn("absolute top-2.5 flex h-9 items-center gap-2 overflow-hidden rounded-lg border px-2 text-left text-xs font-medium shadow-sm transition hover:-translate-y-0.5", statusBarTone(stage.status))}
                    style={{ left: geometry.left, width: Math.max(geometry.width, 76) }}
                    aria-label={`${stage.title}, ${humanize(stage.status)}, ${formatBoardDate(stage.plannedStartDate)} through ${formatBoardDate(stage.plannedEndDate)}`}
                  >
                    <span className="truncate">{stage.title}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div>
                    <p className="font-medium">{stage.title} · {humanize(stage.status)}</p>
                    <p>{formatBoardDate(stage.plannedStartDate)} – {formatBoardDate(stage.plannedEndDate)}</p>
                    {stage.actualStartedAt ? <p>Started {formatBoardDate(stage.actualStartedAt.slice(0, 10))}</p> : null}
                    {stage.actualCompletedAt ? <p>Completed {formatBoardDate(stage.actualCompletedAt.slice(0, 10))}</p> : null}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TimelineTrack>
          </div>
        );
      })}

      {milestones.length > 0 ? (
        <div className="grid min-h-20" style={{ gridTemplateColumns: `240px ${width}px` }}>
          <div className="sticky left-0 z-20 flex items-center gap-2 border-r bg-card px-4 text-xs font-medium">
            <Flag className="size-4 text-terracotta" /> Milestones
          </div>
          <TimelineTrack range={range} ticks={ticks} zoom={zoom} width={width} today={today}>
            {milestones.map((milestone, index) => {
              const left = timelinePosition(milestone.dueDate!, range, zoom);
              return (
                <Tooltip key={milestone.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onOpenItem(milestone)}
                      className={cn("absolute flex max-w-44 items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-left text-[10px] font-medium shadow-sm hover:bg-muted", index % 2 === 0 ? "top-2" : "top-10")}
                      style={{ left }}
                      aria-label={`${milestone.title}, ${humanize(milestone.status)}, due ${formatBoardDate(milestone.dueDate)}`}
                    >
                      <Flag className="size-3 shrink-0 text-terracotta" />
                      <span className="truncate">{milestone.title}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{milestone.title} · Due {formatBoardDate(milestone.dueDate)}</TooltipContent>
                </Tooltip>
              );
            })}
          </TimelineTrack>
        </div>
      ) : null}
    </section>
  );
}

function TimelineTrack({
  range,
  ticks,
  zoom,
  width,
  today,
  children,
}: {
  range: TimelineRange;
  ticks: ReturnType<typeof buildTimelineTicks>;
  zoom: TimelineZoom;
  width: number;
  today: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden" style={{ width }}>
      {ticks.map((tick) => (
        <span key={tick.date} className="absolute inset-y-0 border-l" style={{ left: timelinePosition(tick.date, range, zoom) }} aria-hidden />
      ))}
      <span className="absolute inset-y-0 z-10 border-l-2 border-terracotta/70" style={{ left: timelinePosition(today, range, zoom) }} aria-hidden />
      {children}
    </div>
  );
}

function KanbanBoard({
  items,
  projectById,
  stageById,
  today,
  onOpenItem,
}: {
  items: BoardItem[];
  projectById: Map<string, BoardProject>;
  stageById: Map<string, BoardStage>;
  today: string;
  onOpenItem: (item: BoardItem) => void;
}) {
  return (
    <div className="overflow-x-auto pb-2" aria-label="Project Kanban board">
      <div className="grid min-w-[92rem] grid-cols-5 gap-4 xl:min-w-0">
        {kanbanColumns.map(([status, label]) => {
          const columnItems = items.filter((item) => item.status === status);
          return (
            <section key={status} className="rounded-xl border bg-muted/25" aria-labelledby={`kanban-${status}`}>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 id={`kanban-${status}`} className="font-sans text-sm font-semibold">{label}</h2>
                <Badge variant="secondary" className="font-mono">{columnItems.length}</Badge>
              </div>
              <div className="min-h-56 space-y-3 p-3">
                {columnItems.map((item) => {
                  const project = projectById.get(item.projectId);
                  if (!project) return null;
                  return (
                    <BoardItemButton
                      key={`${item.kind}:${item.id}`}
                      item={item}
                      project={project}
                      stageTitle={item.kind === "milestone" && item.projectStageId ? stageById.get(item.projectStageId)?.title : undefined}
                      today={today}
                      onClick={() => onOpenItem(item)}
                    />
                  );
                })}
                {columnItems.length === 0 ? (
                  <div className="grid min-h-28 place-items-center rounded-lg border border-dashed px-4 text-center text-xs text-muted-foreground">No items</div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BoardItemButton({
  item,
  project,
  stageTitle,
  today,
  onClick,
}: {
  item: BoardItem;
  project: BoardProject;
  stageTitle?: string;
  today: string;
  onClick: () => void;
}) {
  const dueDate = itemDueDate(item);
  const overdue = isItemOverdue(item, today);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border bg-card p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {item.kind === "stage" ? <GanttChartSquare className="size-3.5" /> : <Flag className="size-3.5" />}
          {item.kind}
        </span>
        <StatusBadge value={item.status} />
      </div>
      <h3 className="mt-3 font-sans text-sm font-semibold leading-5">{item.title}</h3>
      <p className="mt-1 truncate text-xs text-muted-foreground">{project.title}</p>
      {stageTitle ? <p className="mt-1 text-[11px] text-muted-foreground">Stage · {stageTitle}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={cn("inline-flex items-center gap-1", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
          <CalendarDays className="size-3.5" />
          {dueDate ? `${overdue ? "Overdue · " : "Due · "}${formatBoardDate(dueDate)}` : "Unscheduled"}
        </span>
        {item.kind === "milestone" ? (
          <Badge variant="outline" className="text-[10px]">{item.clientVisible ? "Seller-visible" : "Owner only"}</Badge>
        ) : null}
      </div>
    </button>
  );
}

function isScheduled(item: BoardItem) {
  return item.kind === "stage"
    ? Boolean(item.plannedStartDate && item.plannedEndDate)
    : Boolean(item.dueDate);
}

function statusBarTone(status: BoardItemStatus) {
  if (status === "active") return "border-terracotta/40 bg-terracotta/15 text-foreground";
  if (status === "blocked") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (status === "done") return "border-primary/30 bg-primary/15 text-primary";
  if (status === "skipped") return "border-border bg-muted text-muted-foreground";
  return "border-gold/40 bg-gold/15 text-foreground";
}

function scrollTimeline(node: HTMLDivElement, todayOffset: number, behavior: ScrollBehavior) {
  const left = Math.max(0, todayOffset - node.clientWidth / 2 + 240);
  if (typeof node.scrollTo === "function") node.scrollTo({ left, behavior });
  else node.scrollLeft = left;
}

function formatBoardDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}
