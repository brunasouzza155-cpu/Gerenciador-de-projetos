"use client";

import { useCallback, useState } from "react";
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

// Camada de dados em memória. Quando o Supabase for conectado, só este
// arquivo muda: as ações passam a ler/gravar no banco em vez do estado local.

const uid = () => crypto.randomUUID();
const nowISO = () => new Date().toISOString();

export interface AppStore {
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

export function useAppStore(): AppStore {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [quickWins, setQuickWins] = useState<QuickWin[]>(mockQuickWins);
  const [priorities, setPriorities] = useState<Priority[]>(mockPriorities);
  const [followups, setFollowups] = useState<Followup[]>(mockFollowups);
  const [goals, setGoals] = useState<MonthlyGoal[]>(mockGoals);

  const addProject: AppStore["addProject"] = useCallback((data) => {
    const t = nowISO();
    setProjects((p) => [...p, { ...data, id: uid(), createdAt: t, updatedAt: t }]);
  }, []);

  const updateProject: AppStore["updateProject"] = useCallback((id, patch) => {
    setProjects((p) =>
      p.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowISO() } : x))
    );
  }, []);

  const deleteProject: AppStore["deleteProject"] = useCallback((id) => {
    setProjects((p) => p.filter((x) => x.id !== id));
    setTasks((t) => t.filter((x) => x.projectId !== id));
    setQuickWins((q) => q.filter((x) => x.projectId !== id));
    setFollowups((f) => f.map((x) => (x.projectId === id ? { ...x, projectId: null } : x)));
  }, []);

  const addTask: AppStore["addTask"] = useCallback((projectId, parentId, title, dueDate = null) => {
    const t = nowISO();
    setTasks((ts) => [
      ...ts,
      {
        id: uid(),
        projectId,
        parentId,
        title,
        done: false,
        dueDate,
        sortOrder: ts.length,
        createdAt: t,
        updatedAt: t,
      },
    ]);
  }, []);

  const updateTask: AppStore["updateTask"] = useCallback((id, patch) => {
    setTasks((ts) =>
      ts.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowISO() } : x))
    );
  }, []);

  // Marcar a mãe marca/desmarca todas as filhas em cascata.
  const toggleTask: AppStore["toggleTask"] = useCallback((id, done) => {
    setTasks((ts) => {
      const ids = new Set([id, ...descendantIds(ts, id)]);
      const t = nowISO();
      return ts.map((x) => (ids.has(x.id) ? { ...x, done, updatedAt: t } : x));
    });
  }, []);

  const deleteTask: AppStore["deleteTask"] = useCallback((id) => {
    setTasks((ts) => {
      const ids = new Set([id, ...descendantIds(ts, id)]);
      return ts.filter((x) => !ids.has(x.id));
    });
  }, []);

  const addQuickWin: AppStore["addQuickWin"] = useCallback((data) => {
    setQuickWins((q) => [...q, { ...data, id: uid(), done: false }]);
  }, []);

  const toggleQuickWin: AppStore["toggleQuickWin"] = useCallback((id, done) => {
    setQuickWins((q) => q.map((x) => (x.id === id ? { ...x, done } : x)));
  }, []);

  const deleteQuickWin: AppStore["deleteQuickWin"] = useCallback((id) => {
    setQuickWins((q) => q.filter((x) => x.id !== id));
  }, []);

  const addPriority: AppStore["addPriority"] = useCallback((data) => {
    setPriorities((p) => [...p, { ...data, id: uid(), done: false }]);
  }, []);

  const togglePriority: AppStore["togglePriority"] = useCallback((id, done) => {
    setPriorities((p) => p.map((x) => (x.id === id ? { ...x, done } : x)));
  }, []);

  const deletePriority: AppStore["deletePriority"] = useCallback((id) => {
    setPriorities((p) => p.filter((x) => x.id !== id));
  }, []);

  const addFollowup: AppStore["addFollowup"] = useCallback((data) => {
    setFollowups((f) => [...f, { ...data, id: uid(), done: false }]);
  }, []);

  const updateFollowup: AppStore["updateFollowup"] = useCallback((id, patch) => {
    setFollowups((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const deleteFollowup: AppStore["deleteFollowup"] = useCallback((id) => {
    setFollowups((f) => f.filter((x) => x.id !== id));
  }, []);

  // Cria ou atualiza a meta do mês daquele workspace.
  const saveGoal: AppStore["saveGoal"] = useCallback((data) => {
    setGoals((gs) => {
      const existing = gs.find(
        (g) => g.workspace === data.workspace && g.month === data.month
      );
      if (existing) {
        return gs.map((g) => (g.id === existing.id ? { ...g, ...data } : g));
      }
      return [...gs, { ...data, id: uid() }];
    });
  }, []);

  return {
    projects, tasks, quickWins, priorities, followups, goals,
    addProject, updateProject, deleteProject,
    addTask, updateTask, toggleTask, deleteTask,
    addQuickWin, toggleQuickWin, deleteQuickWin,
    addPriority, togglePriority, deletePriority,
    addFollowup, updateFollowup, deleteFollowup,
    saveGoal,
  };
}
