import type { Health, ProjectStatus } from "./types";

// ── Fontes disponíveis ───────────────────────────────────────────────────────
export interface AppFont {
  id: string;
  name: string;
  cssVar: string; // valor a atribuir em --font-body
  category: string;
}

export const AVAILABLE_FONTS: AppFont[] = [
  { id: "archivo",   name: "Archivo",          cssVar: "var(--font-archivo), sans-serif",      category: "Geométrica" },
  { id: "inter",     name: "Inter",             cssVar: "var(--font-inter), sans-serif",         category: "Ultra clean" },
  { id: "lato",      name: "Lato",              cssVar: "var(--font-lato), sans-serif",          category: "Amigável" },
  { id: "playfair",  name: "Playfair Display",  cssVar: "var(--font-playfair), serif",           category: "Elegante" },
  { id: "cormorant", name: "Cormorant Garamond",cssVar: "var(--font-cormorant), serif",          category: "Literária" },
  { id: "garamond",  name: "EB Garamond",       cssVar: "var(--font-garamond), serif",           category: "Clássica" },
];

// ── Tema visual ──────────────────────────────────────────────────────────────
export interface AppTheme {
  id: string;
  name: string;
  emoji: string;
  kraft: string;      // fundo externo
  paper: string;      // página/card
  ink: string;        // texto principal
  muted: string;      // texto secundário
  hairline: string;   // bordas finas
  tan: string;        // destaque / accent
  tanSoft: string;    // destaque suave
  alert: string;      // alertas
  font?: string;      // id de fonte recomendada
}

export const PRESET_THEMES: AppTheme[] = [
  {
    id: "notion",
    name: "Notion Aesthetic",
    emoji: "📓",
    kraft: "#F7F5F0",
    paper: "#FDFCFA",
    ink: "#1A1A18",
    muted: "#7A7568",
    hairline: "#E8E4DA",
    tan: "#D4C5A0",
    tanSoft: "#F0EBE0",
    alert: "#9C5148",
    font: "archivo",
  },
  {
    id: "editorial",
    name: "Editorial",
    emoji: "📰",
    kraft: "#ECE7DC",
    paper: "#FAF8F3",
    ink: "#1C1B18",
    muted: "#8C8578",
    hairline: "#D9D2C2",
    tan: "#D8C3A3",
    tanSoft: "#EFE5D4",
    alert: "#9C5148",
    font: "playfair",
  },
  {
    id: "aesthetic",
    name: "Aesthetic",
    emoji: "🌸",
    kraft: "#F5E8F0",
    paper: "#FDF6FB",
    ink: "#4A1A3A",
    muted: "#A068A0",
    hairline: "#E8C8E0",
    tan: "#E8B8D8",
    tanSoft: "#F8E8F4",
    alert: "#C04070",
    font: "cormorant",
  },
  {
    id: "ghibli",
    name: "Studio Ghibli",
    emoji: "🌿",
    kraft: "#D8E8CC",
    paper: "#F4F8F0",
    ink: "#1E3820",
    muted: "#5A7A5C",
    hairline: "#B4D0A8",
    tan: "#90C080",
    tanSoft: "#D0E8C4",
    alert: "#905040",
    font: "lato",
  },
  {
    id: "ocean",
    name: "Oceano",
    emoji: "🌊",
    kraft: "#D0E8F0",
    paper: "#F0F8FC",
    ink: "#0A2840",
    muted: "#4A7890",
    hairline: "#A8D0E0",
    tan: "#5BB8D4",
    tanSoft: "#D0EEF8",
    alert: "#8B3A3A",
    font: "inter",
  },
  {
    id: "carros",
    name: "Carros",
    emoji: "🏎️",
    kraft: "#1E1E26",
    paper: "#28283A",
    ink: "#F0F0FF",
    muted: "#9090B8",
    hairline: "#404060",
    tan: "#FF6820",
    tanSoft: "#3A2018",
    alert: "#FF5050",
    font: "inter",
  },
  {
    id: "futebol",
    name: "Futebol",
    emoji: "⚽",
    kraft: "#1A3A1C",
    paper: "#F8FAF0",
    ink: "#1A2A1C",
    muted: "#4A6A4C",
    hairline: "#B0C8B0",
    tan: "#80C840",
    tanSoft: "#D4ECC0",
    alert: "#C04040",
    font: "lato",
  },
  {
    id: "darkluxury",
    name: "Dark Luxury",
    emoji: "🌙",
    kraft: "#0E0E14",
    paper: "#18181F",
    ink: "#F0E8D8",
    muted: "#908070",
    hairline: "#303040",
    tan: "#C8A840",
    tanSoft: "#282018",
    alert: "#A84040",
    font: "cormorant",
  },
  {
    id: "cottagecore",
    name: "Cottagecore",
    emoji: "🍂",
    kraft: "#E8D8C0",
    paper: "#FAF4EC",
    ink: "#2A1A0A",
    muted: "#806040",
    hairline: "#D0B898",
    tan: "#C08040",
    tanSoft: "#F0E4CC",
    alert: "#903020",
    font: "cormorant",
  },
  {
    id: "cloud",
    name: "Minimal Cloud",
    emoji: "☁️",
    kraft: "#EEF3F8",
    paper: "#F8FAFD",
    ink: "#1A2A3A",
    muted: "#7088A0",
    hairline: "#D0DCE8",
    tan: "#90B8D8",
    tanSoft: "#E0EEF8",
    alert: "#8B3A3A",
    font: "inter",
  },
  {
    id: "retropop",
    name: "Retro Pop",
    emoji: "🎨",
    kraft: "#FFF0C0",
    paper: "#FFFDF4",
    ink: "#1A0A00",
    muted: "#806030",
    hairline: "#F0D890",
    tan: "#FF6830",
    tanSoft: "#FFE8C0",
    alert: "#CC2020",
    font: "lato",
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

export function applyFont(fontId: string) {
  const font = AVAILABLE_FONTS.find((f) => f.id === fontId);
  if (font) document.documentElement.style.setProperty("--font-body", font.cssVar);
}

// ── Constantes de cor (legado, compatibilidade) ──────────────────────────────
export const INK = "#1A1A18";
export const PAPER = "#FDFCFA";
export const KRAFT = "#F7F5F0";
export const HAIRLINE = "#E8E4DA";
export const MUTED = "#7A7568";
export const TAN = "#D4C5A0";
export const TAN_SOFT = "#F0EBE0";
export const ALERT = "#9C5148";

export const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  andamento:     { label: "Em andamento",      color: "#4D6B57" },
  desenvolvimento: { label: "Em desenvolvimento", color: "#51677F" },
  aguardando:    { label: "Aguardando aprovação", color: "#A8854B" },
  pausado:       { label: "Pausado",           color: "#8C8578" },
  cancelado:     { label: "Cancelado",         color: "#9C5148" },
  concluido:     { label: "Concluído",         color: "#2E4A3A" },
};

export const STATUS_ORDER: ProjectStatus[] = [
  "andamento", "desenvolvimento", "aguardando", "pausado", "cancelado", "concluido",
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
