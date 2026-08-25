import type {
  ListingStageCode,
  ListingStageStatus,
  MilestoneStatus,
  ProjectStatus,
} from "@/types/domain";

export const boardViews = ["timeline", "kanban"] as const;
export const timelineZooms = ["day", "week", "biweek", "month", "quarter"] as const;
export const dueFilters = ["any", "overdue", "7", "30", "90", "none", "custom"] as const;
export const projectStatusOptions = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "archived",
] as const satisfies readonly ProjectStatus[];
export const boardItemStatusOptions = [
  "not_started",
  "active",
  "blocked",
  "done",
  "skipped",
] as const satisfies readonly ListingStageStatus[];
export const defaultProjectStatuses = ["planning", "active", "on_hold"] as const;

export type BoardView = (typeof boardViews)[number];
export type TimelineZoom = (typeof timelineZooms)[number];
export type DueFilter = (typeof dueFilters)[number];
export type BoardItemStatus = (typeof boardItemStatusOptions)[number];

export interface BoardProject {
  id: string;
  referenceCode: string;
  title: string;
  propertyAddressShort: string;
  sellerNickname: string;
  summary: string;
  status: ProjectStatus;
  progress: number;
  startDate: string | null;
  targetDate: string | null;
  officialAssessmentRevisionId: string | null;
}

export interface BoardStage {
  kind: "stage";
  id: string;
  projectId: string;
  title: string;
  code: ListingStageCode;
  status: ListingStageStatus;
  position: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartedAt: string | null;
  actualCompletedAt: string | null;
  skipReason: string | null;
}

export interface BoardMilestone {
  kind: "milestone";
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  projectStageId: string | null;
  clientVisible: boolean;
}

export type BoardItem = BoardStage | BoardMilestone;

export interface BoardFilters {
  projectIds: string[];
  projectStatuses: ProjectStatus[];
  itemStatuses: BoardItemStatus[];
  due: DueFilter;
  from: string;
  to: string;
}

export interface BoardQueryState extends BoardFilters {
  view: BoardView;
  zoom: TimelineZoom;
}

export const defaultBoardQuery: BoardQueryState = {
  view: "timeline",
  zoom: "week",
  projectIds: [],
  projectStatuses: [...defaultProjectStatuses],
  itemStatuses: [],
  due: "any",
  from: "",
  to: "",
};

function validValues<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const allowedSet = new Set<string>(allowed);
  return [...new Set(values.filter((value): value is T => allowedSet.has(value)))];
}

export function parseBoardQuery(
  searchParams: URLSearchParams,
  projectIds: readonly string[],
): BoardQueryState {
  const view = validValues([searchParams.get("view") ?? ""], boardViews)[0] ?? "timeline";
  const zoom = validValues([searchParams.get("zoom") ?? ""], timelineZooms)[0] ?? "week";
  const due = validValues([searchParams.get("due") ?? ""], dueFilters)[0] ?? "any";
  const requestedProjectStatuses = validValues(
    searchParams.getAll("projectStatus"),
    projectStatusOptions,
  );

  return {
    view,
    zoom,
    due,
    projectIds: validValues(searchParams.getAll("project"), projectIds),
    projectStatuses: searchParams.has("projectStatus")
      ? requestedProjectStatuses
      : [...defaultProjectStatuses],
    itemStatuses: validValues(searchParams.getAll("itemStatus"), boardItemStatusOptions),
    from: validDateKey(searchParams.get("from")) ? searchParams.get("from")! : "",
    to: validDateKey(searchParams.get("to")) ? searchParams.get("to")! : "",
  };
}

export function serializeBoardQuery(state: BoardQueryState) {
  const params = new URLSearchParams();
  if (state.view !== "timeline") params.set("view", state.view);
  if (state.zoom !== "week") params.set("zoom", state.zoom);
  state.projectIds.forEach((id) => params.append("project", id));
  if (!sameValues(state.projectStatuses, defaultProjectStatuses)) {
    state.projectStatuses.forEach((status) => params.append("projectStatus", status));
  }
  state.itemStatuses.forEach((status) => params.append("itemStatus", status));
  if (state.due !== "any") params.set("due", state.due);
  if (state.due === "custom" && validDateKey(state.from)) params.set("from", state.from);
  if (state.due === "custom" && validDateKey(state.to)) params.set("to", state.to);
  return params.toString();
}

function sameValues(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

export function filterBoardItems(
  projects: BoardProject[],
  items: BoardItem[],
  filters: BoardFilters,
  today = localDateKey(),
) {
  const selectedProjects = projects.filter(
    (project) =>
      (filters.projectIds.length === 0 || filters.projectIds.includes(project.id)) &&
      filters.projectStatuses.includes(project.status),
  );
  const visibleProjectIds = new Set(selectedProjects.map((project) => project.id));
  const visibleItems = items
    .filter((item) => visibleProjectIds.has(item.projectId))
    .filter(
      (item) => filters.itemStatuses.length === 0 || filters.itemStatuses.includes(item.status),
    )
    .filter((item) => matchesDueFilter(item, filters, today));

  return { projects: selectedProjects, items: sortBoardItems(visibleItems, selectedProjects) };
}

export function itemDueDate(item: BoardItem) {
  return item.kind === "stage" ? item.plannedEndDate : item.dueDate;
}

export function itemStartDate(item: BoardItem) {
  return item.kind === "stage" ? item.plannedStartDate : item.dueDate;
}

export function isTerminalItem(item: BoardItem) {
  return item.status === "done" || (item.kind === "stage" && item.status === "skipped");
}

export function isItemOverdue(item: BoardItem, today = localDateKey()) {
  const dueDate = itemDueDate(item);
  return Boolean(dueDate && dueDate < today && !isTerminalItem(item));
}

function matchesDueFilter(item: BoardItem, filters: BoardFilters, today: string) {
  const dueDate = itemDueDate(item);
  if (filters.due === "any") return true;
  if (filters.due === "none") return dueDate === null;
  if (!dueDate) return false;
  if (filters.due === "overdue") return dueDate < today && !isTerminalItem(item);
  if (filters.due === "custom") {
    return (!filters.from || dueDate >= filters.from) && (!filters.to || dueDate <= filters.to);
  }
  return dueDate >= today && dueDate <= addDays(today, Number(filters.due));
}

export function sortBoardItems(items: BoardItem[], projects: BoardProject[]) {
  const projectTitles = new Map(projects.map((project) => [project.id, project.title]));
  return [...items].sort((left, right) => {
    const leftDue = itemDueDate(left) ?? "9999-12-31";
    const rightDue = itemDueDate(right) ?? "9999-12-31";
    return (
      leftDue.localeCompare(rightDue) ||
      (projectTitles.get(left.projectId) ?? "").localeCompare(
        projectTitles.get(right.projectId) ?? "",
      ) ||
      left.position - right.position ||
      left.title.localeCompare(right.title)
    );
  });
}

export interface TimelineRange {
  start: string;
  end: string;
  days: number;
}

const zoomPaddingDays: Record<TimelineZoom, number> = {
  day: 1,
  week: 7,
  biweek: 14,
  month: 31,
  quarter: 92,
};

export const zoomPixelsPerDay: Record<TimelineZoom, number> = {
  day: 42,
  week: 18,
  biweek: 10,
  month: 5,
  quarter: 2.5,
};

export function getTimelineRange(
  projects: BoardProject[],
  items: BoardItem[],
  zoom: TimelineZoom,
  today = localDateKey(),
): TimelineRange {
  const dates = [today];
  projects.forEach((project) => {
    if (project.startDate) dates.push(project.startDate);
    if (project.targetDate) dates.push(project.targetDate);
  });
  items.forEach((item) => {
    const start = itemStartDate(item);
    const due = itemDueDate(item);
    if (start) dates.push(start);
    if (due) dates.push(due);
  });
  dates.sort();
  const padding = zoomPaddingDays[zoom];
  const start = addDays(dates[0] ?? today, -padding);
  const end = addDays(dates.at(-1) ?? today, padding);
  return { start, end, days: differenceInDays(start, end) + 1 };
}

export interface TimelineTick {
  date: string;
  label: string;
  offsetDays: number;
}

export function buildTimelineTicks(range: TimelineRange, zoom: TimelineZoom) {
  const ticks: TimelineTick[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    ticks.push({
      date: cursor,
      label: tickLabel(cursor, zoom),
      offsetDays: differenceInDays(range.start, cursor),
    });
    cursor = nextTick(cursor, zoom);
  }
  return ticks;
}

export function timelinePosition(date: string, range: TimelineRange, zoom: TimelineZoom) {
  return differenceInDays(range.start, date) * zoomPixelsPerDay[zoom];
}

export function timelineWidth(
  start: string,
  end: string,
  range: TimelineRange,
  zoom: TimelineZoom,
) {
  const left = timelinePosition(start, range, zoom);
  const right = timelinePosition(end, range, zoom) + zoomPixelsPerDay[zoom];
  return { left, width: Math.max(right - left, zoomPixelsPerDay[zoom]) };
}

function nextTick(date: string, zoom: TimelineZoom) {
  if (zoom === "day") return addDays(date, 1);
  if (zoom === "week") return addDays(date, 7);
  if (zoom === "biweek") return addDays(date, 14);
  const current = parseDateKey(date);
  if (zoom === "month") {
    return formatDateKey(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1)));
  }
  const nextQuarterMonth = Math.floor(current.getUTCMonth() / 3) * 3 + 3;
  return formatDateKey(new Date(Date.UTC(current.getUTCFullYear(), nextQuarterMonth, 1)));
}

function tickLabel(date: string, zoom: TimelineZoom) {
  const parsed = parseDateKey(date);
  if (zoom === "day") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parsed);
  }
  if (zoom === "week" || zoom === "biweek") {
    return `${zoom === "biweek" ? "2 wk · " : ""}${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parsed)}`;
  }
  if (zoom === "month") {
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
  }
  return `Q${Math.floor(parsed.getUTCMonth() / 3) + 1} ${parsed.getUTCFullYear()}`;
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, days: number) {
  const parsed = parseDateKey(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatDateKey(parsed);
}

export function differenceInDays(start: string, end: string) {
  return Math.round((parseDateKey(end).getTime() - parseDateKey(start).getTime()) / 86_400_000);
}

function validDateKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return formatDateKey(parseDateKey(value)) === value;
}

function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}
