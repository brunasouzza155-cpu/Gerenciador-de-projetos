"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { descendantIds } from "./tree";
import type {
  Followup,
  MonthlyGoal,
  Priority,
  Project,
  QuickWin,
  Task,
} from "./types";
import {
  mockFollowups,
  mockGoals,
  mockPriorities,
  mockProjects,
  mockQuickWins,
  mockTasks,
} from "./mock-data";
import { supabase } from "./supabase";
import {
  fetchAll,
  followupToRow,
  logDbError,
  projectToRow,
  quickWinToRow,
  taskToRow,
} from "./db";

// Camada de dados do app. Dois modos:
// - "mock": persiste em localStorage (sobrevive a recargas da página)
// - "supabase": a tela atualiza na hora e a gravação no banco acontece
//   em seguida, em segundo plano — é o "salvar automático".
//   Em ambos os modos os dados são gravados em localStorage de forma
//   síncrona dentro de cada setter, garantindo que nada se perca ao
//   fechar a aba antes do próximo ciclo de render.

export type StoreMode = "mock" | "supabase";

// ── Persistência local (síncrona) ────────────────────────────────────────────
// Chaves separadas por entidade para poder salvar UMA de cada vez de
// forma síncrona dentro do setter, sem precisar do estado das outras.
const LK = {
  projects:   "planner_projects_v1",
  tasks:      "planner_tasks_v1",
  quickWins:  "planner_quickwins_v1",
  priorities: "planner_priorities_v1",
  followups:  "planner_followups_v1",
  goals:      "planner_goals_v1",
} as const;

function saveLocal<T>(key: string, data: T): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

const uid = () => crypto.randomUUID();
const nowISO = () => new Date().toISOString();

export interface AppStore {
  loading: boolean;
  loadError: string | null;

  projects: Project[];
  tasks: Task[];
  quickWins: QuickWin[];
  priorities: Priority[];
  followups: Followup[];
  goals: MonthlyGoal[];

  addProject: (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addTask: (projectId: string, parentId: string | null, title: string, dueDate?: string | null) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string, done: boolean) => void;
  deleteTask: (id: string) => void;

  addQuickWin: (data: Omit<QuickWin, "id" | "done">) => void;
  toggleQuickWin: (id: string, done: boolean) => void;
  deleteQuickWin: (id: string) => void;

  addPriority: (data: Omit<Priority, "id" | "done">) => void;
  togglePriority: (id: string, done: boolean) => void;
  deletePriority: (id: string) => void;

  addFollowup: (data: Omit<Followup, "id" | "done">) => void;
  updateFollowup: (id: string, patch: Partial<Followup>) => void;
  deleteFollowup: (id: string) => void;

  saveGoal: (data: Omit<MonthlyGoal, "id">) => void;
}

export function useAppStore(mode: StoreMode): AppStore {
  const db = mode === "supabase" ? supabase : null;

  const [loading, setLoading] = useState(mode === "supabase");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Inicializa do localStorage; em mock usa mockData como fallback,
  // em supabase usa [] (Supabase vai sobrescrever com fetchAll).
  const [projects, setProjects] = useState<Project[]>(() =>
    loadLocal(LK.projects, db ? ([] as Project[]) : mockProjects)
  );
  const [tasks, setTasks] = useState<Task[]>(() =>
    loadLocal(LK.tasks, db ? ([] as Task[]) : mockTasks)
  );
  const [quickWins, setQuickWins] = useState<QuickWin[]>(() =>
    loadLocal(LK.quickWins, db ? ([] as QuickWin[]) : mockQuickWins)
  );
  const [priorities, setPriorities] = useState<Priority[]>(() =>
    loadLocal(LK.priorities, db ? ([] as Priority[]) : mockPriorities)
  );
  const [followups, setFollowups] = useState<Followup[]>(() =>
    loadLocal(LK.followups, db ? ([] as Followup[]) : mockFollowups)
  );
  const [goals, setGoals] = useState<MonthlyGoal[]>(() =>
    loadLocal(LK.goals, db ? ([] as MonthlyGoal[]) : mockGoals)
  );

  // Espelhos do estado atual, para as ações que precisam calcular algo
  // (ex.: marcar todas as subtarefas) sem depender de estado desatualizado.
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  const goalsRef = useRef(goals);
  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);

  // Carga inicial vinda do banco (modo supabase).
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    fetchAll()
      .then((data) => {
        if (cancelled) return;
        setProjects(data.projects);
        setTasks(data.tasks);
        setQuickWins(data.quickWins);
        setPriorities(data.priorities);
        setFollowups(data.followups);
        setGoals(data.goals);
        setLoading(false);
      })
      .catch((e: { message?: string }) => {
        if (cancelled) return;
        setLoadError(e.message ?? "erro ao carregar dados");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  // ── Ações — cada setter salva no localStorage de forma síncrona ─────────────

  const addProject: AppStore["addProject"] = useCallback((data) => {
    const t = nowISO();
    const project: Project = { ...data, id: uid(), createdAt: t, updatedAt: t };
    setProjects((p) => { const n = [...p, project]; saveLocal(LK.projects, n); return n; });
    db?.from("projects").insert(projectToRow(project)).then(logDbError("criar projeto"));
  }, [db]);

  const updateProject: AppStore["updateProject"] = useCallback((id, patch) => {
    setProjects((p) => {
      const n = p.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowISO() } : x));
      saveLocal(LK.projects, n);
      return n;
    });
    db?.from("projects").update(projectToRow(patch)).eq("id", id).then(logDbError("editar projeto"));
  }, [db]);

  const deleteProject: AppStore["deleteProject"] = useCallback((id) => {
    setProjects((p) => { const n = p.filter((x) => x.id !== id); saveLocal(LK.projects, n); return n; });
    setTasks((t)  => { const n = t.filter((x) => x.projectId !== id); saveLocal(LK.tasks, n); return n; });
    setQuickWins((q) => { const n = q.filter((x) => x.projectId !== id); saveLocal(LK.quickWins, n); return n; });
    setFollowups((f) => {
      const n = f.map((x) => (x.projectId === id ? { ...x, projectId: null } : x));
      saveLocal(LK.followups, n);
      return n;
    });
    db?.from("projects").delete().eq("id", id).then(logDbError("excluir projeto"));
  }, [db]);

  const addTask: AppStore["addTask"] = useCallback((projectId, parentId, title, dueDate = null) => {
    const t = nowISO();
    const task: Task = {
      id: uid(), projectId, parentId, title,
      done: false, dueDate, tag: null, tagDueDate: null,
      sortOrder: tasksRef.current.length, createdAt: t, updatedAt: t,
    };
    setTasks((ts) => { const n = [...ts, task]; saveLocal(LK.tasks, n); return n; });
    db?.from("tasks").insert(taskToRow(task)).then(logDbError("criar tarefa"));
  }, [db]);

  const updateTask: AppStore["updateTask"] = useCallback((id, patch) => {
    setTasks((ts) => {
      const n = ts.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowISO() } : x));
      saveLocal(LK.tasks, n);
      return n;
    });
    db?.from("tasks").update(taskToRow(patch)).eq("id", id).then(logDbError("editar tarefa"));
  }, [db]);

  // Marcar a mãe marca/desmarca todas as filhas em cascata.
  const toggleTask: AppStore["toggleTask"] = useCallback((id, done) => {
    const ids = [id, ...descendantIds(tasksRef.current, id)];
    const idSet = new Set(ids);
    const t = nowISO();
    setTasks((ts) => {
      const n = ts.map((x) => (idSet.has(x.id) ? { ...x, done, updatedAt: t } : x));
      saveLocal(LK.tasks, n);
      return n;
    });
    db?.from("tasks").update({ done }).in("id", ids).then(logDbError("concluir tarefa"));
  }, [db]);

  const deleteTask: AppStore["deleteTask"] = useCallback((id) => {
    const idSet = new Set([id, ...descendantIds(tasksRef.current, id)]);
    setTasks((ts) => { const n = ts.filter((x) => !idSet.has(x.id)); saveLocal(LK.tasks, n); return n; });
    db?.from("tasks").delete().eq("id", id).then(logDbError("excluir tarefa"));
  }, [db]);

  const addQuickWin: AppStore["addQuickWin"] = useCallback((data) => {
    const win: QuickWin = { ...data, id: uid(), done: false };
    setQuickWins((q) => { const n = [...q, win]; saveLocal(LK.quickWins, n); return n; });
    db?.from("quick_wins").insert(quickWinToRow(win)).then(logDbError("criar quick win"));
  }, [db]);

  const toggleQuickWin: AppStore["toggleQuickWin"] = useCallback((id, done) => {
    setQuickWins((q) => { const n = q.map((x) => (x.id === id ? { ...x, done } : x)); saveLocal(LK.quickWins, n); return n; });
    db?.from("quick_wins").update({ done }).eq("id", id).then(logDbError("concluir quick win"));
  }, [db]);

  const deleteQuickWin: AppStore["deleteQuickWin"] = useCallback((id) => {
    setQuickWins((q) => { const n = q.filter((x) => x.id !== id); saveLocal(LK.quickWins, n); return n; });
    db?.from("quick_wins").delete().eq("id", id).then(logDbError("excluir quick win"));
  }, [db]);

  const addPriority: AppStore["addPriority"] = useCallback((data) => {
    const priority: Priority = { ...data, id: uid(), done: false };
    setPriorities((p) => { const n = [...p, priority]; saveLocal(LK.priorities, n); return n; });
    db?.from("priorities").insert(priority).then(logDbError("criar prioridade"));
  }, [db]);

  const togglePriority: AppStore["togglePriority"] = useCallback((id, done) => {
    setPriorities((p) => { const n = p.map((x) => (x.id === id ? { ...x, done } : x)); saveLocal(LK.priorities, n); return n; });
    db?.from("priorities").update({ done }).eq("id", id).then(logDbError("concluir prioridade"));
  }, [db]);

  const deletePriority: AppStore["deletePriority"] = useCallback((id) => {
    setPriorities((p) => { const n = p.filter((x) => x.id !== id); saveLocal(LK.priorities, n); return n; });
    db?.from("priorities").delete().eq("id", id).then(logDbError("excluir prioridade"));
  }, [db]);

  const addFollowup: AppStore["addFollowup"] = useCallback((data) => {
    const followup: Followup = { ...data, id: uid(), done: false };
    setFollowups((f) => { const n = [...f, followup]; saveLocal(LK.followups, n); return n; });
    db?.from("followups").insert(followupToRow(followup)).then(logDbError("criar acompanhamento"));
  }, [db]);

  const updateFollowup: AppStore["updateFollowup"] = useCallback((id, patch) => {
    setFollowups((f) => {
      const n = f.map((x) => (x.id === id ? { ...x, ...patch } : x));
      saveLocal(LK.followups, n);
      return n;
    });
    db?.from("followups").update(followupToRow(patch)).eq("id", id).then(logDbError("editar acompanhamento"));
  }, [db]);

  const deleteFollowup: AppStore["deleteFollowup"] = useCallback((id) => {
    setFollowups((f) => { const n = f.filter((x) => x.id !== id); saveLocal(LK.followups, n); return n; });
    db?.from("followups").delete().eq("id", id).then(logDbError("excluir acompanhamento"));
  }, [db]);

  // Cria ou atualiza a meta do mês daquele workspace.
  const saveGoal: AppStore["saveGoal"] = useCallback((data) => {
    const existing = goalsRef.current.find(
      (g) => g.workspace === data.workspace && g.month === data.month
    );
    if (existing) {
      setGoals((gs) => {
        const n = gs.map((g) => (g.id === existing.id ? { ...g, ...data } : g));
        saveLocal(LK.goals, n);
        return n;
      });
      db?.from("monthly_goals")
        .update({ goal: data.goal, how: data.how })
        .eq("id", existing.id)
        .then(logDbError("editar meta"));
    } else {
      const goal: MonthlyGoal = { ...data, id: uid() };
      setGoals((gs) => { const n = [...gs, goal]; saveLocal(LK.goals, n); return n; });
      db?.from("monthly_goals").insert(goal).then(logDbError("criar meta"));
    }
  }, [db]);

  return {
    loading, loadError,
    projects, tasks, quickWins, priorities, followups, goals,
    addProject, updateProject, deleteProject,
    addTask, updateTask, toggleTask, deleteTask,
    addQuickWin, toggleQuickWin, deleteQuickWin,
    addPriority, togglePriority, deletePriority,
    addFollowup, updateFollowup, deleteFollowup,
    saveGoal,
  };
}
