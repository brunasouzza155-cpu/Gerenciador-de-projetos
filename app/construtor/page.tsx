"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EmojiPicker } from "@/components/EmojiPicker";
import {
  DEFAULT_BLOCKS,
  BLOCK_CATEGORIES,
  PLANNER_TEMPLATES,
  loadPlannerConfig,
  savePlannerConfig,
  loadPlanners,
  savePlanners,
  createPlannerFromTemplate,
  getActivePlannerId,
  setActivePlannerId,
  type PlannerBlock,
  type PlannerConfig,
  type PlannerTemplate,
} from "@/lib/planner-config";

// ── Bloco arrastável ──────────────────────────────────────────────────────────
function SortableBlock({
  block,
  onToggle,
  onEmoji,
  onLabel,
  onMenuOpen,
  editingId,
  setEditingId,
}: {
  block: PlannerBlock;
  onToggle: (id: string) => void;
  onEmoji: (id: string, emoji: string) => void;
  onLabel: (id: string, label: string) => void;
  onMenuOpen: (id: string | null) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [labelVal, setLabelVal] = useState(block.label);
  const editing = editingId === block.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
        block.visible
          ? "border-hairline bg-paper shadow-sm"
          : "border-dashed border-hairline bg-kraft/40 opacity-60"
      } ${isDragging ? "shadow-xl" : ""}`}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted text-[12px] px-0.5 select-none touch-none"
        title="Arrastar"
      >
        ⠿
      </span>

      {/* Emoji */}
      <EmojiPicker value={block.emoji} onChange={(e) => onEmoji(block.id, e)} size="sm" />

      {/* Label */}
      {editing ? (
        <input
          autoFocus
          className="ink-input flex-1 text-[12px]"
          value={labelVal}
          onChange={(e) => setLabelVal(e.target.value)}
          onBlur={() => { onLabel(block.id, labelVal || block.label); setEditingId(null); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onLabel(block.id, labelVal || block.label); setEditingId(null); }
            if (e.key === "Escape") { setLabelVal(block.label); setEditingId(null); }
          }}
        />
      ) : (
        <button
          className="flex-1 text-left text-[12px] hover:text-muted transition-colors"
          onClick={() => setEditingId(block.id)}
          title="Clique para renomear"
        >
          {block.label}
        </button>
      )}

      {/* Col badge */}
      <span className="text-[9px] text-muted border border-hairline px-1.5 py-0.5">
        {block.column}
      </span>

      {/* Toggle visibilidade */}
      <button
        className={`text-[10px] px-2 py-1 border transition-all ${
          block.visible
            ? "border-ink bg-ink text-paper"
            : "border-hairline text-muted hover:border-ink"
        }`}
        onClick={() => onToggle(block.id)}
        title={block.visible ? "Ocultar" : "Mostrar"}
      >
        {block.visible ? "✓" : "○"}
      </button>
    </div>
  );
}

// Drag overlay ghost
function BlockGhost({ block }: { block: PlannerBlock }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-ink bg-paper shadow-xl opacity-90">
      <span className="text-muted text-[12px]">⠿</span>
      <span>{block.emoji}</span>
      <span className="text-[12px]">{block.label}</span>
    </div>
  );
}

// ── Column drop zone ──────────────────────────────────────────────────────────
function ColumnZone({
  column,
  label,
  blocks,
  onToggle,
  onEmoji,
  onLabel,
  onMoveToCol,
  editingId,
  setEditingId,
}: {
  column: 1 | 2 | 3;
  label: string;
  blocks: PlannerBlock[];
  onToggle: (id: string) => void;
  onEmoji: (id: string, emoji: string) => void;
  onLabel: (id: string, label: string) => void;
  onMoveToCol: (id: string, col: 1 | 2 | 3) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const colBlocks = blocks
    .filter((b) => b.column === column)
    .sort((a, b) => a.order - b.order);

  const otherBlocks = blocks.filter((b) => b.column !== column);

  return (
    <div className="flex flex-col gap-3">
      <div className="section-bar">{label}</div>

      <SortableContext items={colBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5 min-h-[60px]">
          {colBlocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              onToggle={onToggle}
              onEmoji={onEmoji}
              onLabel={onLabel}
              onMenuOpen={() => {}}
              editingId={editingId}
              setEditingId={setEditingId}
            />
          ))}
          {colBlocks.length === 0 && (
            <div className="rounded-xl border border-dashed border-hairline py-6 text-center text-[10px] text-muted">
              Arraste blocos para cá
            </div>
          )}
        </div>
      </SortableContext>

      {/* Mover para esta coluna */}
      {otherBlocks.length > 0 && (
        <div className="mt-1">
          <p className="text-[8px] uppercase tracking-wider text-muted mb-1">Mover para cá:</p>
          <div className="flex flex-wrap gap-1">
            {otherBlocks.map((b) => (
              <button
                key={b.id}
                className="text-[9px] px-2 py-1 rounded-lg border border-hairline hover:border-ink text-muted hover:text-ink transition-all hover:bg-tan-soft/40"
                onClick={() => onMoveToCol(b.id, column)}
              >
                {b.emoji} {b.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Template onboarding ───────────────────────────────────────────────────────
function TemplateOnboarding({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string, emoji: string, template: PlannerTemplate, blocks: string[]) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"template" | "blocks">("template");
  const [selected, setSelected] = useState<PlannerTemplate | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📓");
  const [chosenBlocks, setChosenBlocks] = useState<string[]>([]);

  const handlePickTemplate = (t: PlannerTemplate) => {
    setSelected(t);
    setName(t.name);
    setEmoji(t.emoji);
    setChosenBlocks(t.suggestedBlocks);
    setStep("blocks");
  };

  const toggleBlock = (id: string) => {
    setChosenBlocks((bs) =>
      bs.includes(id) ? bs.filter((b) => b !== id) : [...bs, id]
    );
  };

  if (step === "template") {
    return (
      <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px] flex items-center justify-center p-4">
        <div className="bg-paper rounded-2xl border border-hairline max-w-2xl w-full p-6 shadow-[0_8px_48px_rgba(44,43,39,0.18)]">
          <h2 className="text-[11px] uppercase tracking-[0.3em] font-semibold mb-1">Novo Planner</h2>
          <p className="text-[11px] text-muted font-serif-note mb-5">Escolha um modelo para começar:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PLANNER_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => handlePickTemplate(t)}
                className="rounded-xl border border-hairline hover:border-tan p-3 text-left transition-all hover:bg-tan-soft/40 hover:shadow-sm"
              >
                <div className="text-2xl mb-1">{t.emoji}</div>
                <div className="text-[11px] font-semibold">{t.name}</div>
                <div className="text-[9px] text-muted mt-1 leading-relaxed">{t.description}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button className="ink-btn" onClick={onCancel}>cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl border border-hairline max-w-lg w-full p-6 shadow-[0_8px_48px_rgba(44,43,39,0.18)]">
        <h2 className="text-[11px] uppercase tracking-[0.3em] font-semibold mb-4">
          {selected?.emoji} Personalizar planner
        </h2>

        <div className="space-y-3 mb-5">
          <div className="flex gap-2">
            <EmojiPicker value={emoji} onChange={setEmoji} size="md" />
            <input
              className="ink-input flex-1"
              placeholder="Nome do planner…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <p className="text-[9px] uppercase tracking-wider text-muted mb-2">Blocos recomendados:</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {DEFAULT_BLOCKS.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-[11px] cursor-pointer py-1">
              <input
                type="checkbox"
                checked={chosenBlocks.includes(b.id)}
                onChange={() => toggleBlock(b.id)}
                className="accent-ink"
              />
              <span>{b.emoji}</span>
              <span>{b.label}</span>
              {selected?.suggestedBlocks.includes(b.id) && (
                <span className="text-[8px] text-muted border border-hairline px-1">recomendado</span>
              )}
            </label>
          ))}
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <button className="ink-btn" onClick={() => setStep("template")}>← voltar</button>
          <button
            className="ink-btn ink-btn-solid"
            disabled={!name.trim()}
            onClick={() => selected && onConfirm(name.trim(), emoji, selected, chosenBlocks)}
          >
            criar planner
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal do Construtor ────────────────────────────────────────────
export default function ConstrutorPage() {
  const [blocks, setBlocks]       = useState<PlannerBlock[]>(DEFAULT_BLOCKS);
  const [planners, setPlanners]   = useState<PlannerConfig[]>([]);
  const [activePlannerId, setActiveId] = useState<string | null>(null);
  const [saved, setSaved]         = useState(false);
  const [preview, setPreview]     = useState(false);
  const [activeId, setDragId]     = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Load saved config + planners
  useEffect(() => {
    const savedPlanners = loadPlanners();
    setPlanners(savedPlanners);
    const aid = getActivePlannerId();
    if (aid && savedPlanners.find((p) => p.id === aid)) {
      setActiveId(aid);
      const p = savedPlanners.find((p) => p.id === aid)!;
      const existingIds = new Set(p.blocks.map((b) => b.id));
      const missing = DEFAULT_BLOCKS.filter((b) => !existingIds.has(b.id));
      setBlocks([...p.blocks, ...missing]);
    } else {
      setBlocks(loadPlannerConfig());
    }
  }, []);

  const activeBlock = blocks.find((b) => b.id === activeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDragId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    if (!over || active.id === over.id) return;

    const aId = String(active.id);
    const oId = String(over.id);
    const aBlock = blocks.find((b) => b.id === aId);
    const oBlock = blocks.find((b) => b.id === oId);
    if (!aBlock || !oBlock) return;

    setBlocks((prev) => {
      if (aBlock.column === oBlock.column) {
        // Same column: reorder with arrayMove
        const col = prev
          .filter((b) => b.column === aBlock.column)
          .sort((a, b) => a.order - b.order);
        const aIdx = col.findIndex((b) => b.id === aId);
        const oIdx = col.findIndex((b) => b.id === oId);
        const reordered = arrayMove(col, aIdx, oIdx).map((b, i) => ({ ...b, order: i }));
        return [...prev.filter((b) => b.column !== aBlock.column), ...reordered];
      } else {
        // Cross-column: move to target column at target position
        const targetCol = prev
          .filter((b) => b.column === oBlock.column)
          .sort((a, b) => a.order - b.order);
        const insertAt = targetCol.findIndex((b) => b.id === oId);

        // Remove from old column and reorder
        const oldCol = prev
          .filter((b) => b.column === aBlock.column && b.id !== aId)
          .sort((a, b) => a.order - b.order)
          .map((b, i) => ({ ...b, order: i }));

        // Insert into new column
        const newColItems = [...targetCol];
        newColItems.splice(insertAt, 0, { ...aBlock, column: oBlock.column });
        const newCol = newColItems.map((b, i) => ({ ...b, order: i }));

        return [
          ...prev.filter((b) => b.column !== aBlock.column && b.column !== oBlock.column),
          ...oldCol,
          ...newCol,
        ];
      }
    });
    setSaved(false);
  };

  const handleToggle = useCallback((id: string) => {
    setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, visible: !b.visible } : b));
    setSaved(false);
  }, []);

  const handleEmoji = useCallback((id: string, emoji: string) => {
    setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, emoji } : b));
    setSaved(false);
  }, []);

  const handleLabel = useCallback((id: string, label: string) => {
    setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, label } : b));
    setSaved(false);
  }, []);

  const handleMoveToCol = useCallback((id: string, column: 1 | 2 | 3) => {
    setBlocks((bs) => {
      const colBlocks = bs.filter((b) => b.column === column).sort((a, b) => a.order - b.order);
      const newOrder = colBlocks.length;
      const src = bs.find((b) => b.id === id);
      if (!src) return bs;
      // Reorder old column
      const oldCol = bs
        .filter((b) => b.column === src.column && b.id !== id)
        .sort((a, b) => a.order - b.order)
        .map((b, i) => ({ ...b, order: i }));
      return [
        ...bs.filter((b) => b.column !== src.column && b.column !== column),
        ...oldCol,
        ...colBlocks,
        { ...src, column, order: newOrder },
      ];
    });
    setSaved(false);
  }, []);

  const handleSave = () => {
    if (activePlannerId) {
      const updated = planners.map((p) =>
        p.id === activePlannerId ? { ...p, blocks } : p
      );
      savePlanners(updated);
      setPlanners(updated);
    } else {
      savePlannerConfig(blocks);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setBlocks(DEFAULT_BLOCKS);
    if (activePlannerId) {
      const updated = planners.map((p) =>
        p.id === activePlannerId ? { ...p, blocks: DEFAULT_BLOCKS } : p
      );
      savePlanners(updated);
      setPlanners(updated);
    } else {
      savePlannerConfig(DEFAULT_BLOCKS);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCreatePlanner = (
    name: string,
    emoji: string,
    template: PlannerTemplate,
    chosenBlocks: string[]
  ) => {
    const newPlanner = createPlannerFromTemplate(name, emoji, template);
    const chosen = new Set(chosenBlocks);
    newPlanner.blocks = newPlanner.blocks.map((b) => ({
      ...b,
      visible: chosen.has(b.id),
    }));
    const updated = [...planners, newPlanner];
    savePlanners(updated);
    setPlanners(updated);
    setActiveId(newPlanner.id);
    setActivePlannerId(newPlanner.id);
    setBlocks(newPlanner.blocks);
    setShowOnboarding(false);
  };

  const handleSwitchPlanner = (id: string | null) => {
    setActiveId(id);
    if (id) {
      setActivePlannerId(id);
      const p = planners.find((pl) => pl.id === id);
      if (p) {
        const existingIds = new Set(p.blocks.map((b) => b.id));
        const missing = DEFAULT_BLOCKS.filter((b) => !existingIds.has(b.id));
        setBlocks([...p.blocks, ...missing]);
      }
    } else {
      setBlocks(loadPlannerConfig());
    }
  };

  const handleDeletePlanner = (id: string) => {
    const updated = planners.filter((p) => p.id !== id);
    savePlanners(updated);
    setPlanners(updated);
    if (activePlannerId === id) {
      setActiveId(null);
      setBlocks(loadPlannerConfig());
    }
  };

  const visibleBlocks = blocks.filter((b) => b.visible);
  const activeConfig = planners.find((p) => p.id === activePlannerId);

  return (
    <div className="min-h-screen bg-kraft">
      {showOnboarding && (
        <TemplateOnboarding
          onConfirm={handleCreatePlanner}
          onCancel={() => setShowOnboarding(false)}
        />
      )}

      {/* Barra superior */}
      <header className="sticky top-0 z-30 bg-paper border-b border-hairline px-4 sm:px-8 py-3 flex items-center gap-2 flex-wrap shadow-sm">
        <a href="/" className="ink-btn py-1.5">← Voltar</a>
        <h1 className="text-[11px] uppercase tracking-[0.3em] font-semibold">
          🏗 Construir Planner
        </h1>
        {activeConfig && (
          <span className="text-[11px] text-muted border border-hairline px-3 py-1 rounded-full">
            {activeConfig.emoji} {activeConfig.name}
          </span>
        )}
        <div className="flex-1" />
        <button className="ink-btn" onClick={() => setPreview((p) => !p)}>
          {preview ? "✕ Fechar prévia" : "👁 Pré-visualizar"}
        </button>
        <button className="ink-btn" onClick={handleReset}>↺ Resetar</button>
        <button
          className={`ink-btn ink-btn-solid ${saved ? "opacity-70" : ""}`}
          onClick={handleSave}
        >
          {saved ? "✓ Salvo!" : "💾 Salvar"}
        </button>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">

          {/* Painel esquerdo */}
          <aside className="space-y-4">

            {/* Meus Planners */}
            <div className="bg-paper border border-hairline rounded-2xl p-4 shadow-sm">
              <h2 className="text-[9px] uppercase tracking-[0.25em] font-semibold text-muted mb-3">Meus Planners</h2>
              <div className="space-y-1.5">
                <button
                  className={`w-full text-left px-3 py-2 text-[11px] rounded-xl border transition-all ${
                    !activePlannerId ? "border-ink bg-ink text-paper font-medium" : "border-hairline hover:border-ink hover:bg-tan-soft/40"
                  }`}
                  onClick={() => handleSwitchPlanner(null)}
                >
                  📓 Planner padrão
                </button>
                {planners.map((p) => (
                  <div key={p.id} className="flex items-center gap-1">
                    <button
                      className={`flex-1 text-left px-3 py-2 text-[11px] rounded-xl border transition-all ${
                        activePlannerId === p.id ? "border-ink bg-ink text-paper font-medium" : "border-hairline hover:border-ink hover:bg-tan-soft/40"
                      }`}
                      onClick={() => handleSwitchPlanner(p.id)}
                    >
                      {p.emoji} {p.name}
                    </button>
                    <button
                      className="text-[13px] text-muted hover:text-alert px-2 py-1 rounded-lg hover:bg-alert/10 transition-colors"
                      onClick={() => handleDeletePlanner(p.id)}
                      title="Remover"
                    >×</button>
                  </div>
                ))}
                <button
                  className="w-full ink-btn text-[10px] mt-1"
                  onClick={() => setShowOnboarding(true)}
                >
                  + novo planner
                </button>
              </div>
            </div>

            {/* Categorias de blocos */}
            <div className="bg-paper border border-hairline rounded-2xl p-4 shadow-sm">
              <h2 className="text-[9px] uppercase tracking-[0.25em] font-semibold text-muted mb-3">Blocos disponíveis</h2>
              {BLOCK_CATEGORIES.map((cat) => (
                <div key={cat.label} className="mb-3">
                  <p className="text-[8px] uppercase tracking-wider text-muted/70 mb-1.5">{cat.label}</p>
                  <div className="space-y-1">
                    {cat.blocks.map((type) => {
                      const block = blocks.find((b) => b.type === type);
                      if (!block) return null;
                      return (
                        <div
                          key={type}
                          className={`px-2.5 py-1.5 rounded-lg border text-[10px] flex items-center gap-2 transition-colors ${
                            block.visible
                              ? "border-tan/30 bg-tan-soft/50 shadow-sm"
                              : "border-dashed border-hairline text-muted"
                          }`}
                        >
                          <span>{block.emoji}</span>
                          <span className="flex-1">{block.label}</span>
                          <span className="text-[8px] text-muted/60">col {block.column}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-hairline">
                <p className="text-[9px] text-muted font-serif-note leading-relaxed">
                  Arraste para reordenar. Clique no nome para renomear. Use ✓/○ para mostrar/ocultar.
                </p>
              </div>
            </div>
          </aside>

          {/* Área principal */}
          {preview ? (
            <div>
              <h2 className="text-[9px] uppercase tracking-[0.25em] text-muted font-semibold mb-4">Pré-visualização</h2>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1fr] gap-4">
                {([1, 2, 3] as const).map((col) => (
                  <div key={col} className="flex flex-col gap-3">
                    {visibleBlocks
                      .filter((b) => b.column === col)
                      .sort((a, b) => a.order - b.order)
                      .map((b) => (
                        <div
                          key={b.id}
                          className="bg-paper border border-hairline rounded-xl shadow-sm overflow-hidden"
                          style={b.accentColor ? { "--section-color": b.accentColor } as React.CSSProperties : undefined}
                        >
                          <div className="section-bar">
                            {b.emoji} {b.label}
                          </div>
                          <p className="text-[10px] text-muted font-serif-note py-4 text-center px-3">
                            conteúdo aparecerá aqui
                          </p>
                        </div>
                      ))}
                    {visibleBlocks.filter((b) => b.column === col).length === 0 && (
                      <div className="rounded-xl border border-dashed border-hairline py-8 text-center text-[10px] text-muted">
                        Coluna {col} — vazia
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([
                  [1, "Coluna 1 — Dia"],
                  [2, "Coluna 2 — Projetos"],
                  [3, "Coluna 3 — Planner"],
                ] as [1 | 2 | 3, string][]).map(([col, label]) => (
                  <div key={col} className="bg-paper border border-hairline rounded-2xl p-4 shadow-sm">
                  <ColumnZone
                    column={col}
                    label={label}
                    blocks={blocks}
                    onToggle={handleToggle}
                    onEmoji={handleEmoji}
                    onLabel={handleLabel}
                    onMoveToCol={handleMoveToCol}
                    editingId={editingId}
                    setEditingId={setEditingId}
                  />
                  </div>
                ))}
              </div>

              <DragOverlay>
                {activeId && activeBlock ? <BlockGhost block={activeBlock} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
