"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MetaSubtask {
  id: string;
  title: string;
  done: boolean;
}

interface Meta {
  id: string;
  title: string;
  emoji: string;
  description: string;
  horizon: "mes" | "trimestre" | "ano" | "vida";
  deadline: string | null;
  subtasks: MetaSubtask[];
  done: boolean;
  createdAt: string;
}

const STORAGE_KEY = "metas_data";

type HorizonFilter = "todos" | "mes" | "trimestre" | "ano" | "vida";

const HORIZON_LABELS: Record<string, string> = {
  mes: "Este mês",
  trimestre: "Trimestre",
  ano: "Ano",
  vida: "Vida",
};

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function deadlineLabel(deadline: string | null): { text: string; overdue: boolean } | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(deadline);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: "vencida", overdue: true };
  if (diffDays === 0) return { text: "hoje", overdue: false };
  return { text: `${diffDays} dias`, overdue: false };
}

function calcProgress(meta: Meta): number {
  if (meta.subtasks.length === 0) return meta.done ? 100 : 0;
  const done = meta.subtasks.filter((s) => s.done).length;
  return Math.round((done / meta.subtasks.length) * 100);
}

function isOverdue(meta: Meta): boolean {
  if (!meta.deadline || meta.done) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(meta.deadline);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
}

// ─── Goal Card ───────────────────────────────────────────────────────────────

function MetaCard({
  meta,
  onToggleSubtask,
  onMarkDone,
  onDelete,
}: {
  meta: Meta;
  onToggleSubtask: (metaId: string, subtaskId: string) => void;
  onMarkDone: (metaId: string) => void;
  onDelete: (metaId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = calcProgress(meta);
  const dl = deadlineLabel(meta.deadline);

  return (
    <div
      className={`rounded border border-hairline bg-paper mb-3 overflow-hidden ${meta.done ? "opacity-60" : ""}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-3">
        <span className="text-2xl leading-none mt-0.5 select-none">{meta.emoji || "🎯"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-ink text-sm leading-snug ${meta.done ? "line-through" : ""}`}>
              {meta.title}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-tan-soft text-muted uppercase tracking-wide">
              {HORIZON_LABELS[meta.horizon]}
            </span>
            {dl && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-mono ${dl.overdue ? "text-alert bg-red-50" : "text-muted bg-tan-soft"}`}
              >
                {dl.text}
              </span>
            )}
          </div>
          {meta.description && (
            <p className="text-xs text-muted mt-0.5 leading-snug">{meta.description}</p>
          )}

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-tan-soft overflow-hidden">
              <div
                className="h-full rounded-full bg-ink transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted font-mono w-8 text-right">{progress}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {meta.subtasks.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ink-btn text-xs px-2 py-1"
              title={expanded ? "Recolher" : "Expandir subtarefas"}
            >
              {expanded ? "▲" : "▼"}
            </button>
          )}
          {!meta.done && (
            <button
              onClick={() => onMarkDone(meta.id)}
              className="ink-btn text-xs px-2 py-1"
              title="Marcar como concluída"
            >
              ✓
            </button>
          )}
          <button
            onClick={() => onDelete(meta.id)}
            className="ink-btn text-xs px-2 py-1 text-alert"
            title="Excluir meta"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Subtask checklist */}
      {expanded && meta.subtasks.length > 0 && (
        <div className="border-t border-hairline px-3 pb-3 pt-2 space-y-1.5">
          {meta.subtasks.map((sub) => (
            <label
              key={sub.id}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={sub.done}
                onChange={() => onToggleSubtask(meta.id, sub.id)}
                className="rounded border-hairline accent-ink"
              />
              <span
                className={`text-sm ${sub.done ? "line-through text-muted" : "text-ink"} group-hover:text-ink transition-colors`}
              >
                {sub.title}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

interface NewSubtask {
  id: string;
  title: string;
}

interface FormState {
  title: string;
  emoji: string;
  description: string;
  horizon: "mes" | "trimestre" | "ano" | "vida";
  deadline: string;
  subtasks: NewSubtask[];
}

const EMPTY_FORM: FormState = {
  title: "",
  emoji: "🎯",
  description: "",
  horizon: "mes",
  deadline: "",
  subtasks: [],
};

function AddMetaForm({ onAdd }: { onAdd: (meta: Meta) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newSubtask, setNewSubtask] = useState("");
  const [error, setError] = useState("");

  function addSubtask() {
    const title = newSubtask.trim();
    if (!title) return;
    setForm((f) => ({
      ...f,
      subtasks: [...f.subtasks, { id: genId(), title }],
    }));
    setNewSubtask("");
  }

  function removeSubtask(id: string) {
    setForm((f) => ({ ...f, subtasks: f.subtasks.filter((s) => s.id !== id) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("O título é obrigatório.");
      return;
    }
    const meta: Meta = {
      id: genId(),
      title: form.title.trim(),
      emoji: form.emoji.trim() || "🎯",
      description: form.description.trim(),
      horizon: form.horizon,
      deadline: form.deadline || null,
      subtasks: form.subtasks.map((s) => ({ id: s.id, title: s.title, done: false })),
      done: false,
      createdAt: new Date().toISOString(),
    };
    onAdd(meta);
    setForm(EMPTY_FORM);
    setNewSubtask("");
    setError("");
    setOpen(false);
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="ink-btn-solid text-sm px-4 py-2 w-full"
      >
        {open ? "▲ Cancelar" : "+ Nova Meta"}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 bg-paper border border-hairline rounded p-4 space-y-3"
        >
          {error && <p className="text-alert text-xs">{error}</p>}

          {/* Emoji + Title */}
          <div className="flex gap-2">
            <input
              type="text"
              value={form.emoji}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              className="ink-input w-14 text-center text-xl"
              maxLength={4}
              placeholder="🎯"
            />
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="ink-input flex-1"
              placeholder="Título da meta *"
              required
            />
          </div>

          {/* Description */}
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="ink-input w-full resize-none"
            rows={2}
            placeholder="Descrição (opcional)"
          />

          {/* Horizon + Deadline */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={form.horizon}
              onChange={(e) =>
                setForm((f) => ({ ...f, horizon: e.target.value as Meta["horizon"] }))
              }
              className="ink-input flex-1 min-w-[120px]"
            >
              <option value="mes">Este mês</option>
              <option value="trimestre">Trimestre</option>
              <option value="ano">Ano</option>
              <option value="vida">Vida</option>
            </select>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="ink-input flex-1 min-w-[140px]"
            />
          </div>

          {/* Subtasks */}
          <div>
            <p className="text-xs text-muted mb-1">Subtarefas</p>
            <div className="space-y-1 mb-2">
              {form.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-sm text-ink flex-1">{s.title}</span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(s.id)}
                    className="ink-btn text-xs px-2 py-0.5 text-alert"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
                className="ink-input flex-1"
                placeholder="Adicionar subtarefa…"
              />
              <button type="button" onClick={addSubtask} className="ink-btn text-sm px-3 py-1">
                +
              </button>
            </div>
          </div>

          <button type="submit" className="ink-btn-solid w-full text-sm py-2">
            Salvar Meta
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: HorizonFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "mes", label: "Este mês" },
  { key: "trimestre", label: "Trimestre" },
  { key: "ano", label: "Ano" },
  { key: "vida", label: "Vida" },
];

export default function MetasPage() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [filter, setFilter] = useState<HorizonFilter>("todos");
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMetas(JSON.parse(raw));
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metas));
  }, [metas, hydrated]);

  function addMeta(meta: Meta) {
    setMetas((prev) => [meta, ...prev]);
  }

  function toggleSubtask(metaId: string, subtaskId: string) {
    setMetas((prev) =>
      prev.map((m) =>
        m.id !== metaId
          ? m
          : {
              ...m,
              subtasks: m.subtasks.map((s) =>
                s.id !== subtaskId ? s : { ...s, done: !s.done }
              ),
            }
      )
    );
  }

  function markDone(metaId: string) {
    setMetas((prev) =>
      prev.map((m) => (m.id !== metaId ? m : { ...m, done: true }))
    );
  }

  function deleteMeta(metaId: string) {
    setMetas((prev) => prev.filter((m) => m.id !== metaId));
  }

  // Stats
  const total = metas.length;
  const completed = metas.filter((m) => m.done).length;
  const inProgress = metas.filter((m) => !m.done && calcProgress(m) > 0).length;
  const overdue = metas.filter((m) => isOverdue(m)).length;

  // Filtered list
  const filtered =
    filter === "todos" ? metas : metas.filter((m) => m.horizon === filter);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-kraft flex items-center justify-center">
        <span className="text-muted text-sm">Carregando…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kraft">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-kraft border-b border-hairline shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="ink-btn text-sm px-2 py-1">
            ← Voltar
          </Link>
          <h1 className="font-serif-note text-lg text-ink flex-1">🌟 Metas</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Stats bar */}
        <div className="section-bar">
          <span className="font-semibold">Resumo</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: total },
            { label: "Concluídas", value: completed },
            { label: "Em progresso", value: inProgress },
            { label: "Vencidas", value: overdue, alert: overdue > 0 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-paper border border-hairline rounded p-3 text-center"
            >
              <div
                className={`text-2xl font-semibold ${stat.alert ? "text-alert" : "text-ink"}`}
              >
                {stat.value}
              </div>
              <div className="text-xs text-muted mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        <div className="section-bar">
          <span className="font-semibold">Nova Meta</span>
        </div>
        <AddMetaForm onAdd={addMeta} />

        {/* Filter tabs */}
        <div className="section-bar">
          <span className="font-semibold">Suas Metas</span>
        </div>
        <div className="flex gap-1 flex-wrap mb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                filter === tab.key
                  ? "ink-btn-solid"
                  : "ink-btn"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Goal list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-sm">
              {filter === "todos"
                ? "Nenhuma meta cadastrada ainda."
                : `Nenhuma meta para "${FILTER_TABS.find((t) => t.key === filter)?.label}".`}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((meta) => (
              <MetaCard
                key={meta.id}
                meta={meta}
                onToggleSubtask={toggleSubtask}
                onMarkDone={markDone}
                onDelete={deleteMeta}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
