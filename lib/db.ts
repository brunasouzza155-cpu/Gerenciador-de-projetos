import { supabase } from "./supabase";
import type {
  Followup,
  Health,
  MonthlyGoal,
  Priority,
  Project,
  ProjectStatus,
  QuickWin,
  Task,
  Workspace,
} from "./types";

// Tradução entre o formato do banco (snake_case, como em schema.sql)
// e o formato usado pelo app (camelCase). O user_id não aparece aqui:
// o banco preenche sozinho com a usuária logada.

interface ProjectRow {
  id: string;
  workspace: Workspace;
  code: string;
  name: string;
  status: ProjectStatus;
  health: Health;
  start_date: string | null;
  due_date: string | null;
  stopped_date: string | null;
  gains: number | null;
  fte: number | null;
  notes: string;
  archived: boolean;
  kind?: "projeto" | "objetivo";
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  done: boolean;
  due_date: string | null;
  tag: Task["tag"];
  tag_due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface QuickWinRow {
  id: string;
  workspace: Workspace;
  project_id: string | null;
  title: string;
  done: boolean;
  date: string | null;
}

interface PriorityRow {
  id: string;
  workspace: Workspace;
  title: string;
  done: boolean;
  date: string;
}

interface FollowupRow {
  id: string;
  workspace: Workspace;
  project_id: string | null;
  who: string;
  what: string;
  since_date: string;
  due_date: string | null;
  validation_date: string | null;
  done: boolean;
}

interface MonthlyGoalRow {
  id: string;
  workspace: Workspace;
  month: string;
  goal: string;
  how: string;
}

const projectFromRow = (r: ProjectRow): Project => ({
  id: r.id,
  workspace: r.workspace,
  code: r.code,
  name: r.name,
  status: r.status,
  health: r.health,
  startDate: r.start_date,
  dueDate: r.due_date,
  stoppedDate: r.stopped_date,
  gains: r.gains === null ? null : Number(r.gains),
  fte: r.fte === null ? null : Number(r.fte),
  notes: r.notes,
  archived: r.archived,
  kind: r.kind ?? "projeto",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const taskFromRow = (r: TaskRow): Task => ({
  id: r.id,
  projectId: r.project_id,
  parentId: r.parent_id,
  title: r.title,
  done: r.done,
  dueDate: r.due_date,
  tag: r.tag,
  tagDueDate: r.tag_due_date,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const quickWinFromRow = (r: QuickWinRow): QuickWin => ({
  id: r.id,
  workspace: r.workspace,
  projectId: r.project_id,
  title: r.title,
  done: r.done,
  date: r.date,
});

const priorityFromRow = (r: PriorityRow): Priority => ({ ...r });

const followupFromRow = (r: FollowupRow): Followup => ({
  id: r.id,
  workspace: r.workspace,
  projectId: r.project_id,
  who: r.who,
  what: r.what,
  sinceDate: r.since_date,
  dueDate: r.due_date,
  validationDate: r.validation_date,
  done: r.done,
});

const goalFromRow = (r: MonthlyGoalRow): MonthlyGoal => ({
  id: r.id,
  workspace: r.workspace,
  month: r.month,
  goal: r.goal,
  how: r.how,
});

// Converte um pedaço de Project/Task/etc. para as colunas do banco.
export function projectToRow(p: Partial<Project>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.workspace !== undefined) row.workspace = p.workspace;
  if (p.code !== undefined) row.code = p.code;
  if (p.name !== undefined) row.name = p.name;
  if (p.status !== undefined) row.status = p.status;
  if (p.health !== undefined) row.health = p.health;
  if (p.startDate !== undefined) row.start_date = p.startDate;
  if (p.dueDate !== undefined) row.due_date = p.dueDate;
  if (p.stoppedDate !== undefined) row.stopped_date = p.stoppedDate;
  if (p.gains !== undefined) row.gains = p.gains;
  if (p.fte !== undefined) row.fte = p.fte;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.archived !== undefined) row.archived = p.archived;
  if (p.kind !== undefined) row.kind = p.kind;
  return row;
}

export function taskToRow(t: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (t.id !== undefined) row.id = t.id;
  if (t.projectId !== undefined) row.project_id = t.projectId;
  if (t.parentId !== undefined) row.parent_id = t.parentId;
  if (t.title !== undefined) row.title = t.title;
  if (t.done !== undefined) row.done = t.done;
  if (t.dueDate !== undefined) row.due_date = t.dueDate;
  if (t.tag !== undefined) row.tag = t.tag;
  if (t.tagDueDate !== undefined) row.tag_due_date = t.tagDueDate;
  if (t.sortOrder !== undefined) row.sort_order = t.sortOrder;
  return row;
}

export function quickWinToRow(q: Partial<QuickWin>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (q.id !== undefined) row.id = q.id;
  if (q.workspace !== undefined) row.workspace = q.workspace;
  if (q.projectId !== undefined) row.project_id = q.projectId;
  if (q.title !== undefined) row.title = q.title;
  if (q.done !== undefined) row.done = q.done;
  if (q.date !== undefined) row.date = q.date;
  return row;
}

export function followupToRow(f: Partial<Followup>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (f.id !== undefined) row.id = f.id;
  if (f.workspace !== undefined) row.workspace = f.workspace;
  if (f.projectId !== undefined) row.project_id = f.projectId;
  if (f.who !== undefined) row.who = f.who;
  if (f.what !== undefined) row.what = f.what;
  if (f.sinceDate !== undefined) row.since_date = f.sinceDate;
  if (f.dueDate !== undefined) row.due_date = f.dueDate;
  if (f.validationDate !== undefined) row.validation_date = f.validationDate;
  if (f.done !== undefined) row.done = f.done;
  return row;
}

export interface AllData {
  projects: Project[];
  tasks: Task[];
  quickWins: QuickWin[];
  priorities: Priority[];
  followups: Followup[];
  goals: MonthlyGoal[];
}

/** Carrega tudo da usuária logada (o RLS garante que só vem o que é dela). */
export async function fetchAll(): Promise<AllData> {
  if (!supabase) throw new Error("Supabase não configurado");
  const [projects, tasks, quickWins, priorities, followups, goals] =
    await Promise.all([
      supabase.from("projects").select("*").order("created_at"),
      supabase.from("tasks").select("*").order("sort_order"),
      supabase.from("quick_wins").select("*"),
      supabase.from("priorities").select("*"),
      supabase.from("followups").select("*"),
      supabase.from("monthly_goals").select("*"),
    ]);
  const fail =
    projects.error ?? tasks.error ?? quickWins.error ?? priorities.error ??
    followups.error ?? goals.error;
  if (fail) throw fail;
  return {
    projects: (projects.data as ProjectRow[]).map(projectFromRow),
    tasks: (tasks.data as TaskRow[]).map(taskFromRow),
    quickWins: (quickWins.data as QuickWinRow[]).map(quickWinFromRow),
    priorities: (priorities.data as PriorityRow[]).map(priorityFromRow),
    followups: (followups.data as FollowupRow[]).map(followupFromRow),
    goals: (goals.data as MonthlyGoalRow[]).map(goalFromRow),
  };
}

/** Loga erros de gravação no console sem travar a interface. */
export function logDbError(action: string) {
  return ({ error }: { error: { message: string } | null }) => {
    if (error) console.error(`[supabase] ${action}:`, error.message);
  };
}
