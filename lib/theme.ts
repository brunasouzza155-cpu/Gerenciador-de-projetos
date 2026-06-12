import type { Health, ProjectStatus } from "./types";

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
