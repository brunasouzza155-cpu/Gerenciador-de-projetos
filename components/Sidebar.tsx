"use client";

import { useEffect, useRef, useState } from "react";
import { PRESET_THEMES, AVAILABLE_FONTS, applyTheme, applyFont, type AppTheme } from "@/lib/theme";
import type { AppMode } from "@/lib/modes";
import { DEFAULT_MODES, WORKSPACE_LABELS } from "@/lib/modes";
import type { Workspace } from "@/lib/types";

// ── helpers de cor ────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function blend(h1: string, h2: string, t: number) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}
function deriveTheme(kraft: string, ink: string, tan: string): AppTheme {
  return {
    id: "custom", name: "Personalizado", emoji: "🎨",
    kraft,
    paper:    blend(kraft, "#FFFFFF", 0.35),
    ink,
    muted:    blend(ink, kraft, 0.55),
    hairline: blend(kraft, ink, 0.18),
    tan,
    tanSoft:  blend(tan, "#FFFFFF", 0.5),
    alert:    "#9C5148",
  };
}

// ── tipos ─────────────────────────────────────────────────────────────────────
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  activeMode: AppMode;
  modes: AppMode[];
  onModeChange: (mode: AppMode) => void;
  onModesChange: (modes: AppMode[]) => void;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar({
  open, onClose, focusMode, onToggleFocus,
  activeMode, modes, onModeChange, onModesChange,
}: SidebarProps) {
  const [activeThemeId, setActiveThemeId] = useState("notion");
  const [activeFontId, setActiveFontId]   = useState("archivo");
  const [customColors, setCustomColors]   = useState({ kraft: "#F7F5F0", ink: "#1A1A18", tan: "#D4C5A0" });
  const [addingMode,   setAddingMode]     = useState(false);
  const [newModeName,  setNewModeName]    = useState("");
  const [newModeWs,    setNewModeWs]      = useState<Workspace>("trabalho");
  const [section, setSection]             = useState<"modes" | "themes" | "fonts" | "colors">("modes");

  // Carregar tema/fonte salvos
  useEffect(() => {
    try {
      const saved = localStorage.getItem("planner_theme");
      if (saved) {
        const p = JSON.parse(saved);
        setActiveThemeId(p.id ?? "notion");
        if (p.id === "custom" && p.custom) {
          setCustomColors(p.custom);
          applyTheme(deriveTheme(p.custom.kraft, p.custom.ink, p.custom.tan));
        } else {
          const preset = PRESET_THEMES.find((t) => t.id === p.id);
          if (preset) applyTheme(preset);
        }
      }
      const savedFont = localStorage.getItem("planner_font");
      if (savedFont) { setActiveFontId(savedFont); applyFont(savedFont); }
    } catch {}
  }, []);

  // ── temas ──────────────────────────────────────────────────────────────────
  const selectPreset = (theme: AppTheme) => {
    document.documentElement.classList.add("theme-transition");
    applyTheme(theme);
    if (theme.font) { applyFont(theme.font); setActiveFontId(theme.font); }
    setActiveThemeId(theme.id);
    try {
      localStorage.setItem("planner_theme", JSON.stringify({ id: theme.id }));
      if (theme.font) localStorage.setItem("planner_font", theme.font);
    } catch {}
    setTimeout(() => document.documentElement.classList.remove("theme-transition"), 350);
  };

  const applyCustomColors = () => {
    const theme = deriveTheme(customColors.kraft, customColors.ink, customColors.tan);
    document.documentElement.classList.add("theme-transition");
    applyTheme(theme);
    setActiveThemeId("custom");
    try { localStorage.setItem("planner_theme", JSON.stringify({ id: "custom", custom: customColors })); } catch {}
    setTimeout(() => document.documentElement.classList.remove("theme-transition"), 350);
  };

  const resetTheme = () => selectPreset(PRESET_THEMES[0]);

  // ── fontes ─────────────────────────────────────────────────────────────────
  const selectFont = (id: string) => {
    setActiveFontId(id);
    applyFont(id);
    try { localStorage.setItem("planner_font", id); } catch {}
  };

  // ── modos ──────────────────────────────────────────────────────────────────
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

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} aria-hidden />

      <aside className="sidebar-overlay fixed inset-y-0 left-0 z-50 w-64 bg-paper border-r border-hairline flex flex-col shadow-[4px_0_32px_rgba(0,0,0,0.1)] animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
          <span className="text-[10px] uppercase tracking-[0.3em] font-semibold">Menu</span>
          <button className="ink-btn py-1 px-2 text-[11px]" onClick={onClose} title="Fechar">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Navegação rápida */}
          <div className="px-4 py-3 border-b border-hairline space-y-1">
            <NavLink href="/"          icon="📋" label="Planner"         onClick={onClose} />
            <NavLink href="/painel"    icon="📊" label="Painel Gerencial" onClick={onClose} />
            <NavLink href="/construtor" icon="🏗" label="Construir meu Planner" onClick={onClose} highlight />
          </div>

          {/* Sub-abas */}
          <div className="flex border-b border-hairline text-[9px] uppercase tracking-wider">
            {(["modes", "themes", "fonts", "colors"] as const).map((s) => {
              const labels = { modes: "Modos", themes: "Temas", fonts: "Fontes", colors: "Cores" };
              return (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`flex-1 py-2 transition-colors ${
                    section === s ? "bg-ink text-paper font-semibold" : "text-muted hover:text-ink"
                  }`}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>

          <div className="px-4 py-4">

            {/* ── Modos ────────────────────────────────────────────────────── */}
            {section === "modes" && (
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase tracking-wider text-muted mb-2">Área de trabalho</p>
                {modes.map((m) => {
                  const isActive  = m.id === activeMode.id;
                  const isDefault = m.id === "profissional" || m.id === "pessoal";
                  return (
                    <div key={m.id} className="flex items-center gap-1">
                      <button
                        className={`flex-1 text-left px-3 py-2 text-[12px] border transition-all ${
                          isActive
                            ? "bg-ink text-paper border-ink font-semibold"
                            : "border-hairline hover:border-ink"
                        }`}
                        onClick={() => { onModeChange(m); onClose(); }}
                      >
                        <span className="mr-1">{isActive ? "●" : "○"}</span>
                        {m.name}
                        <span className="ml-1.5 text-[8px] opacity-50">
                          {WORKSPACE_LABELS[m.workspace] ?? m.workspace}
                        </span>
                      </button>
                      {!isDefault && (
                        <button className="text-[11px] text-muted hover:text-alert px-1" onClick={() => deleteMode(m.id)} title="Remover">×</button>
                      )}
                    </div>
                  );
                })}

                {addingMode ? (
                  <div className="mt-2 space-y-1.5 border border-hairline p-3">
                    <input
                      autoFocus
                      className="ink-input w-full"
                      placeholder="Nome do modo…"
                      value={newModeName}
                      onChange={(e) => setNewModeName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addMode(); if (e.key === "Escape") setAddingMode(false); }}
                    />
                    <select className="ink-input w-full" value={newModeWs} onChange={(e) => setNewModeWs(e.target.value as Workspace)}>
                      <option value="trabalho">Área: Profissional</option>
                      <option value="pessoal">Área: Pessoal</option>
                    </select>
                    <div className="flex gap-1.5">
                      <button className="ink-btn flex-1" onClick={addMode}>criar</button>
                      <button className="ink-btn" onClick={() => setAddingMode(false)}>cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button className="mt-1 w-full ink-btn text-[10px]" onClick={() => setAddingMode(true)}>
                    + criar modo
                  </button>
                )}

                {/* Modo foco */}
                <div className="mt-4 pt-3 border-t border-hairline">
                  <button
                    className={`w-full ink-btn ${focusMode ? "ink-btn-solid" : ""}`}
                    onClick={() => { onToggleFocus(); onClose(); }}
                  >
                    {focusMode ? "⊙ Modo foco ativo" : "⊙ Modo foco"}
                  </button>
                  <p className="text-[9px] text-muted mt-1 text-center font-serif-note">
                    {focusMode ? "Clique para restaurar a sidebar" : "Expande o conteúdo em tela cheia"}
                  </p>
                </div>
              </div>
            )}

            {/* ── Temas ─────────────────────────────────────────────────────── */}
            {section === "themes" && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Temas prontos</p>
                <div className="space-y-1.5">
                  {PRESET_THEMES.map((theme) => {
                    const isActive = activeThemeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => selectPreset(theme)}
                        className={`w-full text-left px-3 py-2 border text-[11px] flex items-center gap-2 transition-all ${
                          isActive ? "border-ink bg-ink text-paper" : "border-hairline hover:border-ink"
                        }`}
                        style={
                          !isActive
                            ? { background: theme.kraft, color: theme.ink, borderColor: theme.hairline }
                            : {}
                        }
                      >
                        <span>{theme.emoji}</span>
                        <span className={`font-medium ${isActive ? "" : ""}`}>{theme.name}</span>
                        {isActive && <span className="ml-auto text-[9px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Fontes ────────────────────────────────────────────────────── */}
            {section === "fonts" && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Tipografia</p>
                <div className="space-y-2">
                  {AVAILABLE_FONTS.map((font) => {
                    const isActive = activeFontId === font.id;
                    return (
                      <button
                        key={font.id}
                        onClick={() => selectFont(font.id)}
                        className={`w-full text-left px-3 py-2.5 border transition-all ${
                          isActive ? "border-ink bg-ink text-paper" : "border-hairline hover:border-ink"
                        }`}
                      >
                        <p
                          className="text-[14px] leading-tight"
                          style={{ fontFamily: font.cssVar }}
                        >
                          {font.name}
                        </p>
                        <p className={`text-[9px] uppercase tracking-wider mt-0.5 ${isActive ? "opacity-70" : "text-muted"}`}>
                          {font.category}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Cores ─────────────────────────────────────────────────────── */}
            {section === "colors" && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Cores personalizadas</p>
                <div className="space-y-3">
                  {[
                    { key: "kraft" as const, label: "Fundo",    desc: "Cor de fundo da tela" },
                    { key: "ink"   as const, label: "Letras",   desc: "Cor do texto principal" },
                    { key: "tan"   as const, label: "Detalhes", desc: "Cor de destaque / accent" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-medium">{label}</p>
                        <p className="text-[9px] text-muted">{desc}</p>
                      </div>
                      <input
                        type="color"
                        value={customColors[key]}
                        onChange={(e) => setCustomColors((c) => ({ ...c, [key]: e.target.value }))}
                        className="w-10 h-8 cursor-pointer border border-hairline"
                        title={label}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="ink-btn flex-1" onClick={applyCustomColors}>aplicar</button>
                  <button className="ink-btn" onClick={resetTheme} title="Restaurar padrão">resetar</button>
                </div>
                <div
                  className="mt-3 p-3 border border-hairline text-[11px]"
                  style={{
                    background: customColors.kraft,
                    color: customColors.ink,
                    borderColor: blend(customColors.kraft, customColors.ink, 0.18),
                  }}
                >
                  <p className="font-medium">Pré-visualização</p>
                  <p className="text-[10px] mt-0.5 opacity-70">Texto secundário de exemplo</p>
                  <div className="mt-1.5 h-[3px] w-1/2" style={{ background: customColors.tan }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Link de navegação ─────────────────────────────────────────────────────────
function NavLink({
  href, icon, label, onClick, highlight,
}: {
  href: string; icon: string; label: string; onClick: () => void; highlight?: boolean;
}) {
  const isActive = typeof window !== "undefined" && window.location.pathname === href;
  return (
    <a
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2 py-2 text-[12px] transition-colors border ${
        isActive
          ? "bg-ink text-paper border-ink"
          : highlight
            ? "border-tan bg-tan-soft/50 hover:bg-tan-soft font-medium"
            : "border-transparent hover:border-hairline hover:bg-tan-soft/50"
      }`}
    >
      <span className="text-[14px]">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
