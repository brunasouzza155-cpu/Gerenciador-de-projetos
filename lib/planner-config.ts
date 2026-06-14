"use client";

export type BlockType =
  | "priorities" | "today" | "quick-tasks" | "projects" | "objetivo"
  | "planner" | "upcoming" | "followups" | "activities" | "summary" | "goals"
  | "pomodoro" | "countdown" | "clock"
  | "quote" | "weather" | "water-tracker"
  | "shopping" | "reading" | "weekly-goals" | "habits"
  | "mini-calendar" | "progress-chart" | "quick-kanban";

export interface PlannerBlock {
  id: string;
  type: BlockType;
  emoji: string;
  label: string;
  visible: boolean;
  column: 1 | 2 | 3;
  order: number;
  visibleModes?: string[];
  accentColor?: string;
}

export type PlannerTemplateKey =
  | "estudos" | "profissional" | "pessoal" | "viagem" | "saude" | "criativo" | "blank";

export interface PlannerTemplate {
  key: PlannerTemplateKey;
  name: string;
  emoji: string;
  description: string;
  suggestedBlocks: string[];
  suggestedTheme?: string;
}

export interface PlannerConfig {
  id: string;
  name: string;
  emoji: string;
  template: PlannerTemplateKey;
  blocks: PlannerBlock[];
  createdAt: string;
}

// ── Default blocks (baseline layout) ────────────────────────────────────────
export const DEFAULT_BLOCKS: PlannerBlock[] = [
  // Column 1 – Dia
  { id: "priorities",     type: "priorities",     emoji: "🎯", label: "Prioridades e Urgências", visible: true,  column: 1, order: 0 },
  { id: "today",          type: "today",          emoji: "📅", label: "Hoje",                    visible: true,  column: 1, order: 1 },
  { id: "quick-tasks",    type: "quick-tasks",    emoji: "⚡", label: "Tarefas Rápidas",          visible: true,  column: 1, order: 2 },
  { id: "goals",          type: "goals",          emoji: "🌟", label: "Metas do mês",             visible: false, column: 1, order: 3 },
  { id: "pomodoro",       type: "pomodoro",       emoji: "🍅", label: "Pomodoro",                 visible: false, column: 1, order: 4 },
  { id: "countdown",      type: "countdown",      emoji: "⏳", label: "Contagem Regressiva",      visible: false, column: 1, order: 5 },
  { id: "clock",          type: "clock",          emoji: "🕐", label: "Relógio",                  visible: false, column: 1, order: 6 },
  { id: "quote",          type: "quote",          emoji: "💬", label: "Frase do Dia",             visible: false, column: 1, order: 7 },
  { id: "water-tracker",  type: "water-tracker",  emoji: "💧", label: "Hidratação",               visible: false, column: 1, order: 8 },
  { id: "mini-calendar",  type: "mini-calendar",  emoji: "📅", label: "Mini Calendário",          visible: false, column: 1, order: 9 },
  { id: "weather",        type: "weather",        emoji: "🌤", label: "Tempo",                    visible: false, column: 1, order: 10 },
  // Column 2 – Projetos
  { id: "objetivo",       type: "objetivo",       emoji: "🎯", label: "Objetivos",                visible: true,  column: 2, order: 0 },
  { id: "projects",       type: "projects",       emoji: "📁", label: "Projetos",                 visible: false, column: 2, order: 1 },
  { id: "quick-kanban",   type: "quick-kanban",   emoji: "🗂",  label: "Kanban Rápido",            visible: false, column: 2, order: 2 },
  // Column 3 – Planner
  { id: "planner",        type: "planner",        emoji: "📆", label: "Calendário / Planner",     visible: false, column: 3, order: 0 },
  { id: "upcoming",       type: "upcoming",       emoji: "🔔", label: "Próximas entregas",         visible: false, column: 3, order: 1 },
  { id: "followups",      type: "followups",      emoji: "👁",  label: "Acompanhamentos",          visible: true,  column: 3, order: 2 },
  { id: "activities",     type: "activities",     emoji: "📋", label: "Atividades",               visible: false, column: 3, order: 3 },
  { id: "summary",        type: "summary",        emoji: "📊", label: "Resumo e Metas",            visible: false, column: 3, order: 4 },
  { id: "shopping",       type: "shopping",       emoji: "🛒", label: "Lista de Compras",          visible: false, column: 3, order: 4 },
  { id: "reading",        type: "reading",        emoji: "📚", label: "Leituras",                 visible: false, column: 3, order: 5 },
  { id: "weekly-goals",   type: "weekly-goals",   emoji: "📋", label: "Metas da Semana",          visible: false, column: 3, order: 6 },
  { id: "habits",         type: "habits",         emoji: "🔄", label: "Hábitos",                  visible: false, column: 3, order: 7 },
  { id: "progress-chart", type: "progress-chart", emoji: "📈", label: "Gráfico de Progresso",     visible: false, column: 3, order: 8 },
];

// ── Block categories for builder sidebar ────────────────────────────────────
export const BLOCK_CATEGORIES: { label: string; blocks: BlockType[] }[] = [
  {
    label: "Organização",
    blocks: ["priorities", "today", "quick-tasks", "followups", "activities", "shopping", "weekly-goals"],
  },
  {
    label: "Projetos",
    blocks: ["projects", "objetivo", "quick-kanban"],
  },
  {
    label: "Tempo",
    blocks: ["planner", "upcoming", "mini-calendar", "countdown", "clock"],
  },
  {
    label: "Foco",
    blocks: ["pomodoro"],
  },
  {
    label: "Hábitos e Bem-estar",
    blocks: ["habits", "water-tracker", "reading"],
  },
  {
    label: "Inspiração",
    blocks: ["goals", "summary", "progress-chart", "quote", "weather"],
  },
];

// ── Planner templates ────────────────────────────────────────────────────────
export const PLANNER_TEMPLATES: PlannerTemplate[] = [
  {
    key: "estudos",
    name: "Estudos",
    emoji: "📖",
    description: "Para estudantes e quem se prepara para concursos, provas ou aprendizado contínuo.",
    suggestedBlocks: ["priorities", "today", "pomodoro", "goals", "habits", "mini-calendar", "reading", "weekly-goals"],
    suggestedTheme: "notion",
  },
  {
    key: "profissional",
    name: "Profissional",
    emoji: "💼",
    description: "Gestão de projetos, reuniões, entregas e acompanhamento de equipes.",
    suggestedBlocks: ["priorities", "today", "projects", "planner", "upcoming", "followups", "summary", "quick-kanban"],
    suggestedTheme: "editorial",
  },
  {
    key: "pessoal",
    name: "Pessoal",
    emoji: "🌸",
    description: "Rotinas pessoais, autocuidado, hábitos e metas de vida.",
    suggestedBlocks: ["priorities", "today", "quick-tasks", "habits", "water-tracker", "quote", "goals", "mini-calendar"],
    suggestedTheme: "aesthetic",
  },
  {
    key: "viagem",
    name: "Viagem",
    emoji: "✈️",
    description: "Planejamento de viagens, listas de compras, roteiros e contagens regressivas.",
    suggestedBlocks: ["countdown", "today", "shopping", "quick-tasks", "mini-calendar", "goals"],
    suggestedTheme: "ocean",
  },
  {
    key: "saude",
    name: "Saúde",
    emoji: "💪",
    description: "Acompanhamento de treinos, hidratação, alimentação e bem-estar.",
    suggestedBlocks: ["today", "habits", "water-tracker", "quote", "weekly-goals", "progress-chart"],
    suggestedTheme: "cottagecore",
  },
  {
    key: "criativo",
    name: "Criativo",
    emoji: "🎨",
    description: "Para artistas, escritores e criadores de conteúdo.",
    suggestedBlocks: ["quote", "today", "projects", "reading", "goals", "quick-kanban", "habits"],
    suggestedTheme: "retropop",
  },
  {
    key: "blank",
    name: "Em branco",
    emoji: "📄",
    description: "Comece do zero e monte seu planner do seu jeito.",
    suggestedBlocks: ["priorities", "today", "projects"],
  },
];

// ── Storage helpers ──────────────────────────────────────────────────────────
const LAYOUT_KEY   = "planner_layout";
const PLANNERS_KEY = "planner_configs";
const ACTIVE_KEY   = "planner_active_id";

export function loadPlannerConfig(): PlannerBlock[] {
  if (typeof window === "undefined") return DEFAULT_BLOCKS;
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_BLOCKS;
    const parsed: PlannerBlock[] = JSON.parse(raw);
    const existingIds = new Set(parsed.map((b) => b.id));
    const missing = DEFAULT_BLOCKS.filter((b) => !existingIds.has(b.id));
    return [...parsed, ...missing];
  } catch {
    return DEFAULT_BLOCKS;
  }
}

export function savePlannerConfig(blocks: PlannerBlock[]) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(blocks)); } catch {}
}

export function loadPlanners(): PlannerConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLANNERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePlanners(planners: PlannerConfig[]) {
  try { localStorage.setItem(PLANNERS_KEY, JSON.stringify(planners)); } catch {}
}

export function getActivePlannerId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export function setActivePlannerId(id: string) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
}

export function createPlannerFromTemplate(
  name: string,
  emoji: string,
  template: PlannerTemplate
): PlannerConfig {
  const suggested = new Set(template.suggestedBlocks);
  const blocks: PlannerBlock[] = DEFAULT_BLOCKS.map((b) => ({
    ...b,
    visible: template.key === "blank" ? ["priorities", "today", "projects"].includes(b.id) : suggested.has(b.id),
  }));
  return {
    id: `planner_${Date.now()}`,
    name,
    emoji,
    template: template.key,
    blocks,
    createdAt: new Date().toISOString(),
  };
}

export function loadPlannerBlocks(plannerId: string): PlannerBlock[] {
  const planners = loadPlanners();
  const found = planners.find((p) => p.id === plannerId);
  if (!found) return loadPlannerConfig();
  const existingIds = new Set(found.blocks.map((b) => b.id));
  const missing = DEFAULT_BLOCKS.filter((b) => !existingIds.has(b.id));
  return [...found.blocks, ...missing];
}

export function savePlannerBlocks(plannerId: string, blocks: PlannerBlock[]) {
  const planners = loadPlanners();
  const updated = planners.map((p) =>
    p.id === plannerId ? { ...p, blocks } : p
  );
  savePlanners(updated);
}

// ── Default planner identity (name + emoji) ──────────────────────────────────
const DEFAULT_META_KEY = "planner_default_meta";

export function loadDefaultPlannerMeta(): { name: string; emoji: string } {
  if (typeof window === "undefined") return { name: "Planner", emoji: "📓" };
  try {
    const raw = localStorage.getItem(DEFAULT_META_KEY);
    if (raw) return { name: "Planner", emoji: "📓", ...JSON.parse(raw) };
  } catch {}
  return { name: "Planner", emoji: "📓" };
}

export function saveDefaultPlannerMeta(name: string, emoji: string) {
  try { localStorage.setItem(DEFAULT_META_KEY, JSON.stringify({ name, emoji })); } catch {}
}
