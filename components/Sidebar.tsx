"use client";

import { useEffect, useState } from "react";
import { todayISO, addDays } from "@/lib/dates";
import { projectLeaves } from "@/lib/tree";
import { PRESET_THEMES, applyTheme, type AppTheme } from "@/lib/theme";
import type { AppStore } from "@/lib/store";
import type { Workspace } from "@/lib/types";
import type { AppMode } from "@/lib/modes";
import { DEFAULT_MODES } from "@/lib/modes";

// ── helpers de cor ──────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function blend(hex1: string, hex2: string, t: number) {
  const a = hexToRgb(hex1), b = hexToRgb(hex2);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

function deriveTheme(kraft: string, ink: string, tan: string): AppTheme {
  return {
    id: "custom",
    name: "Personalizado",
    kraft,
    paper: blend(kraft, "#FFFFFF", 0.4),
    ink,
    muted: blend(ink, kraft, 0.55),
    hairline: blend(kraft, ink, 0.18),
    tan,
    tanSoft: blend(tan, "#FFFFFF", 0.5),
    alert: "#9C5148",
  };
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  store: AppStore;
  activeMode: AppMode;
  modes: AppMode[];
  onModeChange: (mode: AppMode) => void;
  onModesChange: (modes: AppMode[]) => void;
}

export function Sidebar({
  open,
  onClose,
  store,
  activeMode,
  modes,
  onModeChange,
  onModesChange,
}: SidebarProps) {
  // ── temas ────────────────────────────────────────────────────────────────
  const [activeThemeId, setActiveThemeId] = useState("editorial");
  const [customColors, setCustomColors] = useState({
    kraft: "#ECE7DC",
    ink: "#1C1B18",
    tan: "#D8C3A3",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("planner_theme");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setActiveThemeId(parsed.id ?? "editorial");
      if (parsed.id === "custom" && parsed.custom) {
        setCustomColors(parsed.custom);
        applyTheme(deriveTheme(parsed.custom.kraft, parsed.custom.ink, parsed.custom.tan));
      } else {
        const preset = PRESET_THEMES.find((t) => t.id === parsed.id);
        if (preset) applyTheme(preset);
      }
    } catch {}
  }, []);

  const selectPreset = (theme: AppTheme) => {
    applyTheme(theme);
    setActiveThemeId(theme.id);
    try { localStorage.setItem("planner_theme", JSON.stringify({ id: theme.id })); } catch {}
  };

  const applyCustom = () => {
    const theme = deriveTheme(customColors.kraft, customColors.ink, customColors.tan);
    applyTheme(theme);
    setActiveThemeId("custom");
    try {
      localStorage.setItem("planner_theme", JSON.stringify({ id: "custom", custom: customColors }));
    } catch {}
  };

  const resetTheme = () => {
    const editorial = PRESET_THEMES[0];
    applyTheme(editorial);
    setActiveThemeId("editorial");
    setCustomColors({ kraft: "#ECE7DC", ink: "#1C1B18", tan: "#D8C3A3" });
    try { localStorage.setItem("planner_theme", JSON.stringify({ id: "editorial" })); } catch {}
  };

  // ── modos personalizados ─────────────────────────────────────────────────
  const [addingMode, setAddingMode] = useState(false);
  const [newModeName, setNewModeName] = useState("");
  const [newModeWs, setNewModeWs] = useState<Workspace>("trabalho");

  const addMode = () => {
    if (!newModeName.trim()) return;
    const id = `custom_${Date.now()}`;
    onModesChange([...modes, { id, name: newModeName.trim(), workspace: newModeWs }]);
    setNewModeName("");
    setAddingMode(false);
  };

  const deleteMode = (id: string) => {
    const filtered = modes.filter((m) => m.id !== id);
    onModesChange(filtered);
    if (activeMode.id === id) onModeChange(filtered[0] ?? DEFAULT_MODES[0]);
  };

  // ── dashboard ────────────────────────────────────────────────────────────
  const today = todayISO();
  const nextWeek = addDays(today, 7);
  const wsProjects = store.projects.filter(
    (p) => p.workspace === activeMode.workspace && !p.archived
  );
  const overdueCount = wsProjects.reduce((sum, proj) => {
    return (
      sum +
      projectLeaves(store.tasks, proj.id).filter(
        (t) => !t.done && t.dueDate && t.dueDate < today
      ).length
    );
  }, 0);
  const upcomingCount = wsProjects.reduce((sum, proj) => {
    return (
      sum +
      projectLeaves(store.tasks, proj.id).filter(
        (t) => !t.done && t.dueDate && t.dueDate >= today && t.dueDate <= nextWeek
      ).length
    );
  }, 0);
  const openFollowups = store.followups.filter(
    (f) => f.workspace === activeMode.workspace && !f.done
  ).length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-ink/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel lateral */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-paper border-r border-hairline overflow-y-auto flex flex-col shadow-[4px_0_24px_rgba(28,27,24,0.15)]">
        {/* Header do sidebar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold">Menu</span>
          <button
            className="ink-btn py-1 px-2"
            onClick={onClose}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* ── Modos ─────────────────────────────────────────────────── */}
          <section>
            <div className="section-bar -mx-4 px-4 mb-2">Modos</div>
            <div className="space-y-1">
              {modes.map((m) => {
                const isActive = m.id === activeMode.id;
                const isDefault = m.id === "profissional" || m.id === "pessoal";
                return (
                  <div key={m.id} className="flex items-center gap-1">
                    <button
                      className={`flex-1 text-left px-2 py-1.5 text-[12px] border transition-colors ${
                        isActive
                          ? "bg-ink text-paper border-ink font-semibold"
                          : "border-hairline hover:border-ink"
                      }`}
                      onClick={() => { onModeChange(m); onClose(); }}
                    >
                      {isActive ? "● " : "○ "}{m.name}
                      <span className="text-[9px] ml-1 opacity-60">
                        ({m.workspace === "trabalho" ? "trabalho" : "pessoal"})
                      </span>
                    </button>
                    {!isDefault && (
                      <button
                        className="text-[10px] text-muted hover:text-alert px-1"
                        title="Excluir modo"
                        onClick={() => deleteMode(m.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {addingMode ? (
              <div className="mt-2 space-y-1.5">
                <input
                  autoFocus
                  className="ink-input w-full"
                  placeholder="Nome do modo…"
                  value={newModeName}
                  onChange={(e) => setNewModeName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addMode(); if (e.key === "Escape") setAddingMode(false); }}
                />
                <select
                  className="ink-input w-full"
                  value={newModeWs}
                  onChange={(e) => setNewModeWs(e.target.value as Workspace)}
                >
                  <option value="trabalho">Área: Trabalho</option>
                  <option value="pessoal">Área: Pessoal</option>
                </select>
                <div className="flex gap-1.5">
                  <button className="ink-btn flex-1" onClick={addMode}>criar</button>
                  <button className="ink-btn" onClick={() => setAddingMode(false)}>cancelar</button>
                </div>
              </div>
            ) : (
              <button
                className="mt-2 w-full ink-btn text-[10px]"
                onClick={() => setAddingMode(true)}
              >
                + criar modo
              </button>
            )}
          </section>

          {/* ── Dashboard ─────────────────────────────────────────────── */}
          <section>
            <div className="section-bar -mx-4 px-4 mb-2">Painel Geral</div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted">Projetos ativos</span>
                <span className="font-semibold">{wsProjects.length}</span>
              </div>
              {overdueCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-alert">⚠ Tarefas atrasadas</span>
                  <span className="font-semibold text-alert">{overdueCount}</span>
                </div>
              )}
              {overdueCount === 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Tarefas atrasadas</span>
                  <span className="font-semibold text-[#4D6B57]">✓ nenhuma</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Próximos 7 dias</span>
                <span className="font-semibold">{upcomingCount} tarefas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Acompanhamentos abertos</span>
                <span className="font-semibold">{openFollowups}</span>
              </div>
              {wsProjects.length > 0 && (
                <div className="pt-1 border-t border-hairline">
                  <div className="text-[9px] uppercase tracking-wider text-muted mb-1">
                    Por status
                  </div>
                  {(["andamento", "desenvolvimento", "aguardando", "pausado", "cancelado", "concluido"] as const).map((s) => {
                    const n = wsProjects.filter((p) => p.status === s).length;
                    if (n === 0) return null;
                    const labels: Record<string, string> = {
                      andamento: "Em andamento", desenvolvimento: "Desenvolvimento",
                      aguardando: "Aguardando", pausado: "Pausado",
                      cancelado: "Cancelado", concluido: "Concluído",
                    };
                    return (
                      <div key={s} className="flex justify-between text-[10px]">
                        <span className="text-muted">{labels[s]}</span>
                        <span>{n}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Personalizar ──────────────────────────────────────────── */}
          <section>
            <div className="section-bar -mx-4 px-4 mb-2">Personalizar</div>

            <div className="text-[9px] uppercase tracking-wider text-muted mb-1.5">Temas</div>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {PRESET_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => selectPreset(theme)}
                  className={`text-[10px] px-2 py-2 border text-left transition-colors ${
                    activeThemeId === theme.id
                      ? "border-ink bg-ink text-paper font-semibold"
                      : "border-hairline hover:border-ink"
                  }`}
                  style={
                    activeThemeId !== theme.id
                      ? { background: theme.kraft, color: theme.ink, borderColor: theme.hairline }
                      : {}
                  }
                >
                  {theme.name}
                </button>
              ))}
            </div>

            <div className="text-[9px] uppercase tracking-wider text-muted mb-1.5">Cores personalizadas</div>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Fundo</span>
                <input
                  type="color"
                  value={customColors.kraft}
                  onChange={(e) => setCustomColors((c) => ({ ...c, kraft: e.target.value }))}
                  className="w-8 h-6 cursor-pointer border border-hairline"
                  title="Cor de fundo"
                />
              </label>
              <label className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Letras</span>
                <input
                  type="color"
                  value={customColors.ink}
                  onChange={(e) => setCustomColors((c) => ({ ...c, ink: e.target.value }))}
                  className="w-8 h-6 cursor-pointer border border-hairline"
                  title="Cor das letras"
                />
              </label>
              <label className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Detalhes</span>
                <input
                  type="color"
                  value={customColors.tan}
                  onChange={(e) => setCustomColors((c) => ({ ...c, tan: e.target.value }))}
                  className="w-8 h-6 cursor-pointer border border-hairline"
                  title="Cor dos detalhes"
                />
              </label>
            </div>
            <div className="flex gap-1.5 mt-2">
              <button className="ink-btn flex-1" onClick={applyCustom}>
                aplicar
              </button>
              <button className="ink-btn" onClick={resetTheme} title="Voltar ao tema Editorial">
                resetar
              </button>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
