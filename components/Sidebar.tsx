"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { PRESET_THEMES, AVAILABLE_FONTS, applyTheme, applyFont } from "@/lib/theme";
import {
  loadPlanners, savePlanners, loadPlannerConfig, loadPlannerBlocks,
  getActivePlannerId, setActivePlannerId, DEFAULT_BLOCKS,
  type PlannerBlock, type PlannerConfig,
} from "@/lib/planner-config";

// Lazy-load PlannerEditor to keep sidebar bundle small
const PlannerEditor = lazy(() =>
  import("@/components/PlannerEditor").then((m) => ({ default: m.PlannerEditor }))
);

// ── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  activePlannerId: string | null;
  onSwitchPlanner: (id: string | null) => void;
  onBlocksChange: (blocks: PlannerBlock[]) => void;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar({
  open,
  onClose,
  activePlannerId,
  onSwitchPlanner,
  onBlocksChange,
}: SidebarProps) {
  const [planners, setPlanners] = useState<PlannerConfig[]>([]);
  // undefined = editor closed; null = editing default; string = editing specific planner
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);

  // Load planners from localStorage
  useEffect(() => {
    setPlanners(loadPlanners());
  }, [open]); // re-load when sidebar opens to pick up new planners

  // Apply saved theme/font on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("planner_theme");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.id === "custom" && p.custom) {
          const { kraft, ink, tan } = p.custom;
          const theme = deriveTheme(kraft, ink, tan);
          applyTheme(theme);
        } else {
          const preset = PRESET_THEMES.find((t) => t.id === p.id);
          if (preset) applyTheme(preset);
        }
      }
      const savedFont = localStorage.getItem("planner_font");
      if (savedFont) applyFont(savedFont);
    } catch {}
  }, []);

  const handleSwitchPlanner = (id: string | null) => {
    onSwitchPlanner(id);
    if (id) setActivePlannerId(id);
    else localStorage.removeItem("planner_active_id");
    onClose();
  };

  const handleEditorSave = (blocks: PlannerBlock[], name: string, emoji: string) => {
    if (editingId === null) {
      // Editing default planner
      import("@/lib/planner-config").then(({ savePlannerConfig }) => {
        savePlannerConfig(blocks);
        onBlocksChange(blocks);
      });
    } else if (editingId) {
      // Editing named planner
      const updated = planners.map((p) =>
        p.id === editingId ? { ...p, name, emoji, blocks } : p
      );
      savePlanners(updated);
      setPlanners(updated);
      if (activePlannerId === editingId) {
        onBlocksChange(blocks);
      }
    }
    setEditingId(undefined);
  };

  const handleDeletePlanner = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remover este planner?")) return;
    const updated = planners.filter((p) => p.id !== id);
    savePlanners(updated);
    setPlanners(updated);
    if (activePlannerId === id) {
      onSwitchPlanner(null);
    }
  };

  if (!open) return null;

  const editingPlanner = editingId === null
    ? null
    : planners.find((p) => p.id === editingId) ?? null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[1px]" onClick={onClose} aria-hidden />

      {/* Sidebar panel */}
      <aside className="sidebar-overlay fixed inset-y-0 left-0 z-50 w-72 bg-paper border-r border-hairline flex flex-col shadow-[4px_0_40px_rgba(44,43,39,0.12)] animate-slide-in">

        {/* App Logo/Name */}
        <div className="px-5 pt-6 pb-4 border-b border-hairline">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[18px] font-semibold tracking-[0.15em] uppercase text-ink">
                Planner
              </h1>
              <p className="text-[10px] text-muted font-serif-note mt-0.5">
                seu caderno digital
              </p>
            </div>
            <button
              className="text-[13px] text-muted hover:text-ink transition-colors p-1.5"
              onClick={onClose}
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

          {/* Meus Planners */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-muted font-semibold mb-3">
              Meus Planners
            </p>

            <div className="space-y-1.5">
              {/* Default Planner */}
              <PlannerRow
                label="Planner padrão"
                emoji="📓"
                active={activePlannerId === null}
                onClick={() => handleSwitchPlanner(null)}
                onEdit={() => setEditingId(null)}
              />

              {/* User planners */}
              {planners.map((p) => (
                <PlannerRow
                  key={p.id}
                  label={p.name}
                  emoji={p.emoji}
                  active={activePlannerId === p.id}
                  onClick={() => handleSwitchPlanner(p.id)}
                  onEdit={() => setEditingId(p.id)}
                  onDelete={(e) => handleDeletePlanner(p.id, e)}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-hairline" />

          {/* Actions */}
          <div className="space-y-2">
            <a
              href="/construtor"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-tan-soft border border-tan/40 hover:border-tan transition-all text-[12px] font-medium"
            >
              <span className="text-[20px]">🏗</span>
              <div>
                <p className="text-ink font-semibold text-[12px]">Construir meu Planner</p>
                <p className="text-muted text-[10px]">crie um planner temático</p>
              </div>
            </a>

            <a
              href="/painel"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-hairline hover:border-ink/30 hover:bg-tan-soft/40 transition-all text-[12px]"
            >
              <span className="text-[20px]">📊</span>
              <div>
                <p className="text-ink font-medium text-[12px]">Painel Gerencial</p>
                <p className="text-muted text-[10px]">gráficos e relatórios</p>
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-hairline">
          <p className="text-[9px] text-muted font-serif-note text-center leading-relaxed">
            &ldquo;Um dia de cada vez — mas com o portfólio inteiro à vista.&rdquo;
          </p>
        </div>
      </aside>

      {/* PlannerEditor modal */}
      {editingId !== undefined && (
        <Suspense fallback={null}>
          <PlannerEditor
            planner={editingPlanner}
            onSave={handleEditorSave}
            onClose={() => setEditingId(undefined)}
          />
        </Suspense>
      )}
    </>
  );
}

// ── Planner row item ─────────────────────────────────────────────────────────
function PlannerRow({
  label,
  emoji,
  active,
  onClick,
  onEdit,
  onDelete,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all cursor-pointer group ${
        active
          ? "bg-ink text-paper"
          : "hover:bg-tan-soft/60 text-ink"
      }`}
      onClick={onClick}
    >
      <span className="text-[16px] flex-shrink-0">{emoji}</span>
      <span className={`flex-1 text-[12px] font-medium ${active ? "text-paper" : "text-ink"}`}>
        {label}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className={`text-[12px] p-1 rounded-md transition-colors ${
            active ? "hover:bg-paper/20 text-paper/70 hover:text-paper" : "hover:bg-ink/10 text-muted hover:text-ink"
          }`}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Editar planner"
        >
          ✏️
        </button>
        {onDelete && (
          <button
            className={`text-[11px] p-1 rounded-md transition-colors ${
              active ? "hover:bg-paper/20 text-paper/70 hover:text-paper" : "hover:bg-alert/10 text-muted hover:text-alert"
            }`}
            onClick={onDelete}
            title="Remover"
          >
            ×
          </button>
        )}
      </div>
      {active && (
        <span className="text-[10px] text-paper/60 opacity-100 group-hover:opacity-0 transition-opacity">●</span>
      )}
    </div>
  );
}

// ── Theme derive helper (used for applying saved custom themes) ───────────────
function hexToRgb(hex: string) {
  return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
}
function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function blend(h1: string, h2: string, t: number) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}
function deriveTheme(kraft: string, ink: string, tan: string) {
  return {
    id: "custom", name: "Personalizado", emoji: "🎨",
    kraft,
    paper: blend(kraft, "#FFFFFF", 0.35),
    ink,
    muted: blend(ink, kraft, 0.55),
    hairline: blend(kraft, ink, 0.18),
    tan,
    tanSoft: blend(tan, "#FFFFFF", 0.5),
    alert: "#9C5148",
  };
}
