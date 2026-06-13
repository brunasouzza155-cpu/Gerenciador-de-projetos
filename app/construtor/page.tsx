"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
  loadPlannerConfig,
  savePlannerConfig,
  type PlannerBlock,
} from "@/lib/planner-config";

// ── Bloco arrastável ──────────────────────────────────────────────────────────
function SortableBlock({
  block,
  onToggle,
  onEmoji,
  onLabel,
}: {
  block: PlannerBlock;
  onToggle: (id: string) => void;
  onEmoji: (id: string, emoji: string) => void;
  onLabel: (id: string, label: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [labelVal, setLabelVal] = useState(block.label);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 border transition-all ${
        block.visible
          ? "border-hairline bg-paper"
          : "border-dashed border-hairline bg-kraft/40 opacity-60"
      }`}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted text-[12px] px-0.5 select-none"
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
          onBlur={() => { onLabel(block.id, labelVal || block.label); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onLabel(block.id, labelVal || block.label); setEditing(false); }
            if (e.key === "Escape") { setLabelVal(block.label); setEditing(false); }
          }}
        />
      ) : (
        <button
          className="flex-1 text-left text-[12px] hover:text-muted transition-colors"
          onClick={() => setEditing(true)}
          title="Clique para renomear"
        >
          {block.label}
        </button>
      )}

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

// ── Coluna do builder ──────────────────────────────────────────────────────────
function BuilderColumn({
  column,
  label,
  blocks,
  onToggle,
  onEmoji,
  onLabel,
  onMove,
}: {
  column: 1 | 2 | 3;
  label: string;
  blocks: PlannerBlock[];
  onToggle: (id: string) => void;
  onEmoji: (id: string, emoji: string) => void;
  onLabel: (id: string, label: string) => void;
  onMove: (id: string, to: 1 | 2 | 3) => void;
}) {
  const colBlocks = blocks
    .filter((b) => b.column === column)
    .sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="section-bar">{label}</div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          // Handled by parent via reorder
          onMove(String(active.id), column); // re-trigger sort
        }}
      >
        <SortableContext items={colBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {colBlocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onToggle={onToggle}
                onEmoji={onEmoji}
                onLabel={onLabel}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Mover bloco para esta coluna (de outra) */}
      <div className="mt-1">
        <p className="text-[8px] uppercase tracking-wider text-muted mb-1">Mover para cá:</p>
        <div className="flex flex-wrap gap-1">
          {blocks
            .filter((b) => b.column !== column && !colBlocks.some((c) => c.id === b.id))
            .map((b) => (
              <button
                key={b.id}
                className="text-[9px] px-1.5 py-0.5 border border-hairline hover:border-ink text-muted hover:text-ink transition-all"
                onClick={() => onMove(b.id, column)}
              >
                {b.emoji} {b.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── Página principal do Construtor ────────────────────────────────────────────
export default function ConstruitorPage() {
  const [blocks, setBlocks] = useState<PlannerBlock[]>(DEFAULT_BLOCKS);
  const [saved, setSaved]   = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setBlocks(loadPlannerConfig());
  }, []);

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

  const handleMove = useCallback((id: string, column: 1 | 2 | 3) => {
    setBlocks((bs) => {
      const colBlocks = bs.filter((b) => b.column === column).sort((a, b) => a.order - b.order);
      const newOrder  = colBlocks.length;
      return bs.map((b) => b.id === id ? { ...b, column, order: newOrder } : b);
    });
    setSaved(false);
  }, []);

  const handleReorder = useCallback((column: 1 | 2 | 3, oldIndex: number, newIndex: number) => {
    setBlocks((bs) => {
      const colBlocks = bs
        .filter((b) => b.column === column)
        .sort((a, b) => a.order - b.order);
      const reordered = arrayMove(colBlocks, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }));
      const others = bs.filter((b) => b.column !== column);
      return [...others, ...reordered];
    });
    setSaved(false);
  }, []);

  const handleSave = () => {
    savePlannerConfig(blocks);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setBlocks(DEFAULT_BLOCKS);
    savePlannerConfig(DEFAULT_BLOCKS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const visibleBlocks = blocks.filter((b) => b.visible);

  return (
    <div className="min-h-screen bg-kraft">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 bg-paper border-b border-hairline px-4 sm:px-8 py-3 flex items-center gap-3">
        <a href="/" className="ink-btn py-1.5">← Voltar</a>
        <h1 className="flex-1 text-[11px] uppercase tracking-[0.3em] font-semibold">
          🏗 Construir meu Planner
        </h1>
        <button className="ink-btn" onClick={() => setPreview((p) => !p)}>
          {preview ? "✕ Fechar pré-visualização" : "👁 Pré-visualizar"}
        </button>
        <button className="ink-btn" onClick={handleReset}>↺ Resetar</button>
        <button
          className={`ink-btn ink-btn-solid ${saved ? "opacity-70" : ""}`}
          onClick={handleSave}
        >
          {saved ? "✓ Salvo!" : "💾 Salvar layout"}
        </button>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8">

        {preview ? (
          /* Pré-visualização */
          <div>
            <h2 className="text-[11px] uppercase tracking-wider text-muted mb-4">Pré-visualização do layout</h2>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1fr] gap-4">
              {[1, 2, 3].map((col) => (
                <div key={col} className="flex flex-col gap-3">
                  {visibleBlocks
                    .filter((b) => b.column === col)
                    .sort((a, b) => a.order - b.order)
                    .map((b) => (
                      <div key={b.id} className="bg-paper border border-hairline px-3 py-2">
                        <div className="section-bar -mx-3 -mt-2 mb-2 px-3">
                          {b.emoji} {b.label}
                        </div>
                        <p className="text-[10px] text-muted font-serif-note py-2 text-center">
                          Conteúdo do bloco aparecerá aqui
                        </p>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Editor */
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">

            {/* Painel esquerdo: categorias */}
            <aside className="space-y-4">
              <h2 className="text-[10px] uppercase tracking-[0.25em] font-semibold">Blocos disponíveis</h2>
              {BLOCK_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <p className="text-[9px] uppercase tracking-wider text-muted mb-2">{cat.label}</p>
                  <div className="space-y-1">
                    {cat.blocks.map((type) => {
                      const block = blocks.find((b) => b.type === type);
                      if (!block) return null;
                      return (
                        <div
                          key={type}
                          className={`px-3 py-2 border text-[11px] flex items-center gap-2 ${
                            block.visible
                              ? "border-ink bg-paper"
                              : "border-dashed border-hairline text-muted"
                          }`}
                        >
                          <span>{block.emoji}</span>
                          <span className="flex-1">{block.label}</span>
                          <span className="text-[9px] text-muted">col {block.column}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-hairline">
                <p className="text-[9px] text-muted font-serif-note leading-relaxed">
                  Arraste os blocos para reordenar. Clique no nome para renomear. Clique no emoji para personalizar.
                </p>
              </div>
            </aside>

            {/* Grid de 3 colunas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                [1, "Coluna 1 — Dia"],
                [2, "Coluna 2 — Projetos"],
                [3, "Coluna 3 — Planner"],
              ] as [1 | 2 | 3, string][]).map(([col, label]) => (
                <BuilderColumn
                  key={col}
                  column={col}
                  label={label}
                  blocks={blocks}
                  onToggle={handleToggle}
                  onEmoji={handleEmoji}
                  onLabel={handleLabel}
                  onMove={handleMove}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
