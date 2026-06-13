"use client";

export type BlockType =
  | "priorities"
  | "today"
  | "quick-tasks"
  | "projects"
  | "planner"
  | "upcoming"
  | "followups"
  | "summary"
  | "goals";

export interface PlannerBlock {
  id: string;
  type: BlockType;
  emoji: string;
  label: string;
  visible: boolean;
  column: 1 | 2 | 3;
  order: number;
}

export const DEFAULT_BLOCKS: PlannerBlock[] = [
  { id: "priorities", type: "priorities", emoji: "🎯", label: "Prioridades e Urgências", visible: true,  column: 1, order: 0 },
  { id: "today",      type: "today",      emoji: "📅", label: "Hoje",                    visible: true,  column: 1, order: 1 },
  { id: "quick-tasks",type: "quick-tasks",emoji: "⚡", label: "Tarefas Rápidas",          visible: true,  column: 1, order: 2 },
  { id: "projects",   type: "projects",   emoji: "📁", label: "Projetos",                 visible: true,  column: 2, order: 0 },
  { id: "planner",    type: "planner",    emoji: "📆", label: "Calendário / Planner",     visible: true,  column: 3, order: 0 },
  { id: "upcoming",   type: "upcoming",   emoji: "🔔", label: "Próximas entregas",         visible: true,  column: 3, order: 1 },
  { id: "followups",  type: "followups",  emoji: "👁", label: "Acompanhamentos",           visible: true,  column: 3, order: 2 },
  { id: "summary",    type: "summary",    emoji: "📊", label: "Resumo e Metas",            visible: true,  column: 3, order: 3 },
  { id: "goals",      type: "goals",      emoji: "🌟", label: "Metas do mês",              visible: false, column: 1, order: 3 },
];

export const BLOCK_CATEGORIES = [
  {
    label: "Organização",
    blocks: ["priorities", "today", "quick-tasks", "followups"] as BlockType[],
  },
  {
    label: "Projetos",
    blocks: ["projects"] as BlockType[],
  },
  {
    label: "Tempo",
    blocks: ["planner", "upcoming"] as BlockType[],
  },
  {
    label: "Produtividade",
    blocks: ["goals", "summary"] as BlockType[],
  },
];

const STORAGE_KEY = "planner_layout";

export function loadPlannerConfig(): PlannerBlock[] {
  if (typeof window === "undefined") return DEFAULT_BLOCKS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_BLOCKS;
    const parsed: PlannerBlock[] = JSON.parse(saved);
    // Merge com defaults para garantir que novos blocos sejam incluídos
    const existingIds = new Set(parsed.map((b) => b.id));
    const missing = DEFAULT_BLOCKS.filter((b) => !existingIds.has(b.id));
    return [...parsed, ...missing];
  } catch {
    return DEFAULT_BLOCKS;
  }
}

export function savePlannerConfig(blocks: PlannerBlock[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks)); } catch {}
}
