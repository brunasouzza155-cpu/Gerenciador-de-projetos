"use client";

import { useState, useEffect } from "react";
import { EmojiPicker } from "@/components/EmojiPicker";
import {
  PRESET_THEMES,
  AVAILABLE_FONTS,
  applyTheme,
  applyFont,
  type AppTheme,
} from "@/lib/theme";
import {
  DEFAULT_BLOCKS,
  loadPlanners,
  savePlanners,
  loadPlannerConfig,
  savePlannerConfig,
  type PlannerBlock,
  type PlannerConfig,
} from "@/lib/planner-config";

// ── Helper functions ─────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) =>
    Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function blend(h1: string, h2: string, t: number) {
  const a = hexToRgb(h1),
    b = hexToRgb(h2);
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

function deriveTheme(kraft: string, ink: string, tan: string): AppTheme {
  return {
    id: "custom",
    name: "Personalizado",
    emoji: "🎨",
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

// ── Types ────────────────────────────────────────────────────────────────────

interface PlannerEditorProps {
  planner: PlannerConfig | null; // null = editing the default planner
  onSave: (blocks: PlannerBlock[], name: string, emoji: string) => void;
  onClose: () => void;
}

type TabId = "blocos" | "aparencia" | "cores";

// ── Component ────────────────────────────────────────────────────────────────

export function PlannerEditor({ planner, onSave, onClose }: PlannerEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>("blocos");

  // Planner identity — load saved name/emoji even for the default planner
  const [name, setName] = useState(() => {
    if (planner) return planner.name;
    try {
      const raw = localStorage.getItem("planner_default_meta");
      if (raw) return JSON.parse(raw).name ?? "Planner";
    } catch {}
    return "Planner";
  });
  const [emoji, setEmoji] = useState(() => {
    if (planner) return planner.emoji;
    try {
      const raw = localStorage.getItem("planner_default_meta");
      if (raw) return JSON.parse(raw).emoji ?? "📓";
    } catch {}
    return "📓";
  });

  // Blocks state
  const [blocks, setBlocks] = useState<PlannerBlock[]>(() => {
    if (planner) {
      // Merge planner blocks with DEFAULT_BLOCKS to catch any new blocks
      const existingIds = new Set(planner.blocks.map((b) => b.id));
      const missing = DEFAULT_BLOCKS.filter((b) => !existingIds.has(b.id));
      return [...planner.blocks, ...missing];
    }
    return loadPlannerConfig();
  });

  // Theme state
  const [activeThemeId, setActiveThemeId] = useState("notion");
  const [activeFontId, setActiveFontId] = useState("archivo");

  // Custom color state
  const [customColors, setCustomColors] = useState({
    kraft: "#F5F2EB",
    ink: "#2C2B27",
    tan: "#C8B47A",
  });

  // Load saved theme/font on mount
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
      if (savedFont) {
        setActiveFontId(savedFont);
        applyFont(savedFont);
      }
    } catch {}
  }, []);

  // ── Block helpers ──────────────────────────────────────────────────────────

  function toggleBlock(id: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b))
    );
  }

  function setBlockColumn(id: string, col: 1 | 2 | 3) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, column: col } : b))
    );
  }

  function setBlockColor(id: string, color: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, accentColor: color } : b))
    );
  }

  // ── Theme helpers ──────────────────────────────────────────────────────────

  function handleSelectTheme(theme: AppTheme) {
    setActiveThemeId(theme.id);
    applyTheme(theme);
    try {
      localStorage.setItem("planner_theme", JSON.stringify({ id: theme.id }));
    } catch {}
    if (theme.font) {
      setActiveFontId(theme.font);
      applyFont(theme.font);
      try {
        localStorage.setItem("planner_font", theme.font);
      } catch {}
    }
  }

  function handleSelectFont(fontId: string) {
    setActiveFontId(fontId);
    applyFont(fontId);
    try {
      localStorage.setItem("planner_font", fontId);
    } catch {}
  }

  function handleApplyCustomColors() {
    const derived = deriveTheme(customColors.kraft, customColors.ink, customColors.tan);
    setActiveThemeId("custom");
    applyTheme(derived);
    try {
      localStorage.setItem(
        "planner_theme",
        JSON.stringify({ id: "custom", custom: customColors })
      );
    } catch {}
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  function handleSave() {
    onSave(blocks, name, emoji);
  }

  // ── Derived data for block tab ─────────────────────────────────────────────

  const blocksByColumn = {
    1: blocks.filter((b) => b.column === 1).sort((a, b) => a.order - b.order),
    2: blocks.filter((b) => b.column === 2).sort((a, b) => a.order - b.order),
    3: blocks.filter((b) => b.column === 3).sort((a, b) => a.order - b.order),
  };

  const columnLabels: Record<number, string> = {
    1: "Coluna 1 — Dia",
    2: "Coluna 2 — Projetos",
    3: "Coluna 3 — Planner",
  };

  // ── Custom color preview ───────────────────────────────────────────────────

  const previewTheme = deriveTheme(customColors.kraft, customColors.ink, customColors.tan);

  // ── Tabs config ────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string }[] = [
    { id: "blocos", label: "Blocos" },
    { id: "aparencia", label: "Aparência" },
    { id: "cores", label: "Cores" },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-paper w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        style={{ borderRadius: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b border-hairline"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
          <EmojiPicker value={emoji} onChange={setEmoji} size="md" />
          <input
            className="ink-input flex-1 text-[15px] font-medium"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do planner"
          />

          <button
            className="ink-btn text-muted hover:text-ink text-[18px] w-8 h-8 flex items-center justify-center"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-hairline">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "px-4 py-2 text-[13px] font-medium transition-colors",
                "rounded-t-xl border border-b-0",
                activeTab === tab.id
                  ? "bg-paper border-hairline text-ink"
                  : "bg-transparent border-transparent text-muted hover:text-ink",
              ].join(" ")}
              style={{
                marginBottom: activeTab === tab.id ? -1 : 0,
                position: "relative",
                zIndex: activeTab === tab.id ? 1 : 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content area ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Tab: Blocos ─────────────────────────────────────────────── */}
          {activeTab === "blocos" && (
            <div className="space-y-6">
              {([1, 2, 3] as const).map((col) => (
                <div key={col}>
                  <div className="section-bar mb-3">
                    <span className="text-[12px] font-semibold tracking-wide uppercase text-muted">
                      {columnLabels[col]}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {blocksByColumn[col].map((block) => (
                      <div
                        key={block.id}
                        className={[
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors",
                          block.visible
                            ? "border-tan/40 bg-tan-soft/50"
                            : "border-hairline bg-kraft/30",
                        ].join(" ")}
                      >
                        {/* Emoji */}
                        <span className="text-[16px] w-6 text-center flex-shrink-0">
                          {block.emoji}
                        </span>

                        {/* Label */}
                        <span
                          className={[
                            "flex-1 text-[13px]",
                            block.visible ? "text-ink font-medium" : "text-muted",
                          ].join(" ")}
                        >
                          {block.label}
                        </span>

                        {/* Color picker for section bar */}
                        <div title="Cor do cabeçalho deste bloco" className="flex-shrink-0">
                          <input
                            type="color"
                            value={block.accentColor || "#2C2B27"}
                            onChange={(e) => setBlockColor(block.id, e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-hairline"
                            style={{ padding: 2 }}
                          />
                        </div>

                        {/* Column selector */}
                        <select
                          value={block.column}
                          onChange={(e) =>
                            setBlockColumn(block.id, Number(e.target.value) as 1 | 2 | 3)
                          }
                          className="ink-input text-[12px] py-1 px-2 pr-6 min-w-0 w-[72px]"
                          style={{ paddingTop: 4, paddingBottom: 4 }}
                        >
                          <option value={1}>Col. 1</option>
                          <option value={2}>Col. 2</option>
                          <option value={3}>Col. 3</option>
                        </select>

                        {/* Visibility toggle */}
                        <button
                          onClick={() => toggleBlock(block.id)}
                          className={[
                            "w-8 h-8 rounded-full flex items-center justify-center text-[14px] transition-colors flex-shrink-0",
                            block.visible
                              ? "bg-tan text-paper hover:bg-tan/80"
                              : "bg-hairline text-muted hover:bg-tan/20 hover:text-ink",
                          ].join(" ")}
                          title={block.visible ? "Ocultar bloco" : "Mostrar bloco"}
                        >
                          {block.visible ? "✓" : "○"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Builder link */}
              <div className="pt-2 pb-1 text-center">
                <a
                  href="/construtor"
                  className="text-[13px] text-muted hover:text-tan transition-colors underline underline-offset-2"
                >
                  Ir para o Construtor →
                </a>
              </div>
            </div>
          )}

          {/* ── Tab: Aparência ──────────────────────────────────────────── */}
          {activeTab === "aparencia" && (
            <div className="space-y-7">
              {/* Theme presets */}
              <div>
                <div className="section-bar mb-4">
                  <span className="text-[12px] font-semibold tracking-wide uppercase text-muted">
                    Temas
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {PRESET_THEMES.map((theme) => {
                    const isActive = activeThemeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleSelectTheme(theme)}
                        className={[
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all",
                          isActive
                            ? "border-tan ring-2 ring-tan/30 bg-tan-soft/60"
                            : "border-hairline hover:border-tan/50 hover:bg-kraft/40",
                        ].join(" ")}
                      >
                        {/* Color swatch stack */}
                        <div className="flex flex-col gap-[2px] flex-shrink-0">
                          <div
                            className="w-4 h-[7px] rounded-sm"
                            style={{ backgroundColor: theme.kraft }}
                          />
                          <div
                            className="w-4 h-[7px] rounded-sm"
                            style={{ backgroundColor: theme.tan }}
                          />
                          <div
                            className="w-4 h-[7px] rounded-sm"
                            style={{ backgroundColor: theme.ink }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-ink truncate leading-tight">
                            {theme.emoji} {theme.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font selector */}
              <div>
                <div className="section-bar mb-4">
                  <span className="text-[12px] font-semibold tracking-wide uppercase text-muted">
                    Fonte
                  </span>
                </div>
                <div className="space-y-2">
                  {AVAILABLE_FONTS.map((font) => {
                    const isActive = activeFontId === font.id;
                    return (
                      <button
                        key={font.id}
                        onClick={() => handleSelectFont(font.id)}
                        className={[
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                          isActive
                            ? "border-tan ring-2 ring-tan/30 bg-tan-soft/60"
                            : "border-hairline hover:border-tan/50 hover:bg-kraft/40",
                        ].join(" ")}
                      >
                        <span
                          className="text-[15px] text-ink"
                          style={{ fontFamily: font.cssVar }}
                        >
                          {font.name}
                        </span>
                        <span className="text-[11px] text-muted ml-2">
                          {font.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Cores ──────────────────────────────────────────────── */}
          {activeTab === "cores" && (
            <div className="space-y-6">
              <div>
                <div className="section-bar mb-4">
                  <span className="text-[12px] font-semibold tracking-wide uppercase text-muted">
                    Cores personalizadas
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Fundo (kraft) */}
                  <div className="flex items-center gap-4">
                    <label className="text-[13px] font-medium text-ink w-24 flex-shrink-0">
                      Fundo
                    </label>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <input
                          type="color"
                          value={customColors.kraft}
                          onChange={(e) =>
                            setCustomColors((prev) => ({
                              ...prev,
                              kraft: e.target.value,
                            }))
                          }
                          className="sr-only"
                          id="color-kraft"
                        />
                        <label
                          htmlFor="color-kraft"
                          className="block w-10 h-10 rounded-xl border-2 border-hairline cursor-pointer shadow-sm hover:scale-105 transition-transform"
                          style={{ backgroundColor: customColors.kraft }}
                        />
                      </div>
                      <input
                        type="text"
                        value={customColors.kraft}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v))
                            setCustomColors((prev) => ({ ...prev, kraft: v }));
                        }}
                        className="ink-input text-[13px] w-28 font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  {/* Texto (ink) */}
                  <div className="flex items-center gap-4">
                    <label className="text-[13px] font-medium text-ink w-24 flex-shrink-0">
                      Texto
                    </label>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <input
                          type="color"
                          value={customColors.ink}
                          onChange={(e) =>
                            setCustomColors((prev) => ({
                              ...prev,
                              ink: e.target.value,
                            }))
                          }
                          className="sr-only"
                          id="color-ink"
                        />
                        <label
                          htmlFor="color-ink"
                          className="block w-10 h-10 rounded-xl border-2 border-hairline cursor-pointer shadow-sm hover:scale-105 transition-transform"
                          style={{ backgroundColor: customColors.ink }}
                        />
                      </div>
                      <input
                        type="text"
                        value={customColors.ink}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v))
                            setCustomColors((prev) => ({ ...prev, ink: v }));
                        }}
                        className="ink-input text-[13px] w-28 font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  {/* Destaque (tan) */}
                  <div className="flex items-center gap-4">
                    <label className="text-[13px] font-medium text-ink w-24 flex-shrink-0">
                      Destaque
                    </label>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <input
                          type="color"
                          value={customColors.tan}
                          onChange={(e) =>
                            setCustomColors((prev) => ({
                              ...prev,
                              tan: e.target.value,
                            }))
                          }
                          className="sr-only"
                          id="color-tan"
                        />
                        <label
                          htmlFor="color-tan"
                          className="block w-10 h-10 rounded-xl border-2 border-hairline cursor-pointer shadow-sm hover:scale-105 transition-transform"
                          style={{ backgroundColor: customColors.tan }}
                        />
                      </div>
                      <input
                        type="text"
                        value={customColors.tan}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v))
                            setCustomColors((prev) => ({ ...prev, tan: v }));
                        }}
                        className="ink-input text-[13px] w-28 font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview box */}
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-3">
                  Pré-visualização
                </p>
                <div
                  className="rounded-2xl p-5 border-2 shadow-inner"
                  style={{
                    backgroundColor: previewTheme.kraft,
                    borderColor: previewTheme.hairline,
                  }}
                >
                  <div
                    className="rounded-xl p-4 mb-3 shadow-sm"
                    style={{ backgroundColor: previewTheme.paper }}
                  >
                    <div
                      className="text-[15px] font-semibold mb-1"
                      style={{ color: previewTheme.ink }}
                    >
                      Título do bloco
                    </div>
                    <div
                      className="text-[12px] leading-relaxed"
                      style={{ color: previewTheme.muted }}
                    >
                      Texto de exemplo para visualizar como ficará o seu planner
                      com essas cores.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 rounded-full flex-1"
                      style={{ backgroundColor: previewTheme.hairline }}
                    >
                      <div
                        className="h-full w-2/3 rounded-full"
                        style={{ backgroundColor: previewTheme.tan }}
                      />
                    </div>
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: previewTheme.ink }}
                    >
                      67%
                    </span>
                  </div>
                </div>
              </div>

              {/* Apply button */}
              <button
                onClick={handleApplyCustomColors}
                className="ink-btn-solid w-full py-2.5 text-[14px] font-medium"
              >
                Aplicar cores
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t border-hairline bg-kraft/40"
          style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
        >
          <button className="ink-btn px-5 py-2 text-[14px] text-muted" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="ink-btn-solid px-6 py-2 text-[14px] font-medium"
            onClick={handleSave}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
