import type { Health, ProjectStatus } from "./types";

// Tema visual: conjunto de variáveis CSS.
export interface AppTheme {
  id: string;
  name: string;
  kraft: string;
  paper: string;
  ink: string;
  muted: string;
  hairline: string;
  tan: string;
  tanSoft: string;
  alert: string;
}

export const PRESET_THEMES: AppTheme[] = [
  {
    id: "editorial",
    name: "Editorial",
    kraft: "#ECE7DC",
    paper: "#FAF8F3",
    ink: "#1C1B18",
    muted: "#8C8578",
    hairline: "#D9D2C2",
    tan: "#D8C3A3",
    tanSoft: "#EFE5D4",
    alert: "#9C5148",
  },
  {
    id: "aesthetic",
    name: "Aesthetic ✿",
    kraft: "#F2E4EF",
    paper: "#FDF6FA",
    ink: "#4A1A3A",
    muted: "#A06890",
    hairline: "#E0C4D8",
    tan: "#E8B4D0",
    tanSoft: "#F8E4F0",
    alert: "#C04070",
  },
  {
    id: "ghibli",
    name: "Studio Ghibli",
    kraft: "#D4E8CC",
    paper: "#F2F8EE",
    ink: "#1E3820",
    muted: "#5A7A5C",
    hairline: "#B0D0A8",
    tan: "#90C080",
    tanSoft: "#D0E8C4",
    alert: "#905040",
  },
  {
    id: "carros",
    name: "Carros",
    kraft: "#1E1E26",
    paper: "#28283A",
    ink: "#F0F0FF",
    muted: "#9090B8",
    hairline: "#404060",
    tan: "#FF6820",
    tanSoft: "#3A2018",
    alert: "#FF5050",
  },
  {
    id: "futebol",
    name: "Futebol",
    kraft: "#1C3A1E",
    paper: "#F8FAF0",
    ink: "#1A2A1C",
    muted: "#4A6A4C",
    hairline: "#B0C8B0",
    tan: "#80C840",
    tanSoft: "#D4ECC0",
    alert: "#C04040",
  },
];

export function applyTheme(theme: Partial<AppTheme>) {
  const root = document.documentElement;
  if (theme.kraft)   root.style.setProperty("--kraft",    theme.kraft);
  if (theme.paper)   root.style.setProperty("--paper",    theme.paper);
  if (theme.ink)     root.style.setProperty("--ink",      theme.ink);
  if (theme.muted)   root.style.setProperty("--muted",    theme.muted);
  if (theme.hairline)root.style.setProperty("--hairline", theme.hairline);
  if (theme.tan)     root.style.setProperty("--tan",      theme.tan);
  if (theme.tanSoft) root.style.setProperty("--tan-soft", theme.tanSoft);
  if (theme.alert)   root.style.setProperty("--alert",    theme.alert);
}

// Paleta editorial do caderno
export const INK = "#1C1B18"; // tinta
export const PAPER = "#FAF8F3"; // página
export const KRAFT = "#ECE7DC"; // fundo externo
export const HAIRLINE = "#D9D2C2"; // linhas finas
export const MUTED = "#8C8578"; // texto secundário
export const TAN = "#D8C3A3"; // destaque "fita adesiva"
export const TAN_SOFT = "#EFE5D4"; // destaque suave
export const ALERT = "#9C5148"; // vermelho/coral para atrasos

export const STATUS_META: Record<
  ProjectStatus,
  { label: string; color: string }
> = {
  andamento: { label: "Em andamento", color: "#4D6B57" },
  desenvolvimento: { label: "Em desenvolvimento", color: "#51677F" },
  aguardando: { label: "Aguardando aprovação", color: "#A8854B" },
  pausado: { label: "Pausado", color: "#8C8578" },
  cancelado: { label: "Cancelado", color: "#9C5148" },
  concluido: { label: "Concluído", color: "#2E4A3A" },
};

export const STATUS_ORDER: ProjectStatus[] = [
  "andamento",
  "desenvolvimento",
  "aguardando",
  "pausado",
  "cancelado",
  "concluido",
];

export const HEALTH_META: Record<Health, { emoji: string; label: string }> = {
  0: { emoji: "🟢", label: "Saudável" },
  1: { emoji: "🟡", label: "Atenção" },
  2: { emoji: "🔴", label: "Crítico" },
};

export function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
