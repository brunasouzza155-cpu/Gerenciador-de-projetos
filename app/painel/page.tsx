"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { addDays, fmtLong, fmtShort, todayISO, mondayOf, WEEKDAYS_PT, MONTHS_PT } from "@/lib/dates";
import { projectLeaves, projectProgress } from "@/lib/tree";
import { HEALTH_META, STATUS_META, fmtBRL } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import type { AppStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AuthGate } from "@/components/AuthGate";
import { getActivePlannerId, loadPlannerBlocks, loadPlannerConfig, loadPlanners, loadDefaultPlannerMeta, isDefaultPlannerHidden } from "@/lib/planner-config";
import { AddInline, InkCheck } from "@/components/ui";
import type { Task, TaskTag, Workspace } from "@/lib/types";

const subscribeNoop = () => () => {};

export default function PainelPage() {
  if (isSupabaseConfigured) {
    return (
      <AuthGate>
        <Painel mode="supabase" />
      </AuthGate>
    );
  }
  return <Painel mode="mock" />;
}

// ── Gráfico de barras SVG ─────────────────────────────────────────────────────
function BarChart({ data, color = "var(--ink)" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const H = 80, W = 220, barW = Math.floor(W / data.length) - 4;

  return (
    <svg width={W} height={H + 20} className="w-full max-w-[300px]">
      {data.map((d, i) => {
        const barH = Math.round((d.value / max) * H);
        const x = i * (barW + 4) + 2;
        return (
          <g key={i}>
            <rect
              x={x} y={H - barH} width={barW} height={barH}
              fill={color} opacity={d.value === 0 ? 0.12 : 0.85}
            />
            <text
              x={x + barW / 2} y={H + 14}
              textAnchor="middle" fontSize="8" fill="var(--muted)"
            >
              {d.label}
            </text>
            {d.value > 0 && (
              <text
                x={x + barW / 2} y={H - barH - 3}
                textAnchor="middle" fontSize="8" fill="var(--ink)"
              >
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Gráfico de pizza SVG ──────────────────────────────────────────────────────
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-[11px] text-muted font-serif-note">Sem dados</p>;

  const R = 44, cx = 60, cy = 50;
  let angle = -Math.PI / 2;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const pct   = d.value / total;
      const start = angle;
      angle += pct * 2 * Math.PI;
      return { ...d, pct, startAngle: start, endAngle: angle };
    });

  return (
    <div className="flex items-center gap-4">
      <svg width={120} height={100}>
        {slices.map((s, i) => {
          const x1 = cx + R * Math.cos(s.startAngle);
          const y1 = cy + R * Math.sin(s.startAngle);
          const x2 = cx + R * Math.cos(s.endAngle);
          const y2 = cy + R * Math.sin(s.endAngle);
          const large = s.pct > 0.5 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M${cx},${cy} L${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} Z`}
              fill={s.color}
              opacity={0.85}
            />
          );
        })}
      </svg>
      <div className="space-y-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2.5 h-2.5 shrink-0" style={{ background: s.color, opacity: 0.85 }} />
            <span className="text-muted">{s.label}</span>
            <span className="font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Card de estatística ────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-paper border border-hairline p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-1">{label}</p>
      <p className="text-2xl font-semibold" style={accent ? { color: accent } : {}}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted mt-0.5 font-serif-note">{sub}</p>}
    </div>
  );
}

// ── Tag metadata for weekly view ──────────────────────────────────────────────
const WEEK_TAG_META: Record<NonNullable<TaskTag>, { label: string; bg: string; color: string }> = {
  rapida:         { label: "RÁPIDA",    bg: "#EFE5D4", color: "#8C8578" },
  acompanhamento: { label: "ACOMP.",    bg: "#E8EEF4", color: "#51677F" },
  atividade:      { label: "ATIVIDADE", bg: "#E8F4EC", color: "#4D6B57" },
  agenda:         { label: "AGENDA",    bg: "#F0E8F4", color: "#6B4D7F" },
  prioridade:     { label: "PRIOR.",    bg: "#FFF0E8", color: "#8C5D3F" },
};

// ── Task detail modal ─────────────────────────────────────────────────────────
function TaskDetailModal({
  task,
  store,
  onClose,
}: {
  task: Task;
  store: AppStore;
  onClose: () => void;
}) {
  const [title, setTitle]   = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [tag, setTag]       = useState<TaskTag>(task.tag);

  const subtasks = store.tasks
    .filter((t) => t.parentId === task.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const project = store.projects.find((p) => p.id === task.projectId);

  const persist = (extra?: Partial<Task>) => {
    store.updateTask(task.id, {
      title: title.trim() || task.title,
      dueDate: dueDate || null,
      tag,
      tagDueDate: tag === "acompanhamento" ? task.tagDueDate : null,
      ...extra,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-paper border border-hairline w-full sm:max-w-[480px] max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-hairline shrink-0">
          <div className="min-w-0 pr-2">
            {project && (
              <p className="text-[9px] uppercase tracking-wider text-muted mb-0.5">
                {project.code ? `${project.code} · ` : ""}{project.name}
              </p>
            )}
            <h3 className="text-[13px] font-semibold leading-tight truncate">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted hover:text-ink text-[20px] leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">Título</label>
            <input
              className="ink-input w-full"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => persist()}
            />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">Data</label>
            <input
              type="date"
              className="ink-input w-full"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                persist({ dueDate: e.target.value || null });
              }}
            />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">Classificação</label>
            <select
              className="ink-input w-full"
              value={tag ?? ""}
              onChange={(e) => {
                const t = (e.target.value as TaskTag) || null;
                setTag(t);
                persist({ tag: t, tagDueDate: null });
              }}
            >
              <option value="">sem classificação</option>
              <option value="prioridade">⭐ Prioridade</option>
              <option value="rapida">⚡ Tarefa Rápida</option>
              <option value="acompanhamento">👁 Acompanhamento</option>
              <option value="atividade">📋 Atividade</option>
              <option value="agenda">🗓 Agenda</option>
            </select>
          </div>

          {/* Subtasks */}
          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted block mb-2">
              Subtarefas{subtasks.length > 0 ? ` (${subtasks.length})` : ""}
            </label>
            <AddInline
              placeholder="+ nova subtarefa… (Enter para salvar)"
              onAdd={(v) => store.addTask(task.projectId, task.id, v)}
            />
            {subtasks.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2 py-1 border-b border-hairline group/sub"
                  >
                    <InkCheck
                      state={sub.done ? "done" : "open"}
                      onToggle={() => store.toggleTask(sub.id, !sub.done)}
                    />
                    <span className={`flex-1 text-[11px] ${sub.done ? "line-through text-muted" : ""}`}>
                      {sub.title}
                    </span>
                    <button
                      className="text-[11px] text-alert opacity-0 group-hover/sub:opacity-100 transition-opacity"
                      onClick={() => { if (confirm(`Excluir "${sub.title}"?`)) store.deleteTask(sub.id); }}
                      title="Excluir subtarefa"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-hairline shrink-0 flex gap-2">
          <button
            className="ink-btn flex-1 text-[11px]"
            onClick={() => {
              persist();
              store.toggleTask(task.id, !task.done);
              onClose();
            }}
          >
            {task.done ? "↩ reabrir" : "✓ concluir"}
          </button>
          <button
            className="text-[11px] px-3 py-1.5 border border-alert text-alert hover:bg-alert/10 transition-colors"
            onClick={() => {
              if (confirm(`Excluir "${task.title}"?`)) { store.deleteTask(task.id); onClose(); }
            }}
          >
            🗑 excluir
          </button>
          <button
            className="ink-btn ink-btn-solid text-[11px]"
            onClick={() => { persist(); onClose(); }}
          >
            salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add task modal ────────────────────────────────────────────────────────────
function AddTaskModal({
  store,
  defaultDate,
  onClose,
}: {
  store: AppStore;
  defaultDate: string;
  onClose: () => void;
}) {
  const allPlanners = useMemo(() => {
    const named = loadPlanners();
    const hidden = isDefaultPlannerHidden();
    const list: { id: string | null; name: string; emoji: string; workspace: "trabalho" | "pessoal" }[] = [];
    if (!hidden) {
      const meta = loadDefaultPlannerMeta();
      list.push({ id: null, name: meta.name, emoji: meta.emoji, workspace: "trabalho" });
    }
    named.forEach((p) => list.push({ id: p.id, name: p.name, emoji: p.emoji, workspace: p.workspace }));
    return list;
  }, []);

  const [title, setTitle]       = useState("");
  const [dueDate, setDueDate]   = useState(defaultDate);
  const [tag, setTag]           = useState<TaskTag>(null);
  const [plannerIdx, setPlannerIdx] = useState(0);
  const [projectId, setProjectId]   = useState("");

  const selectedWs = allPlanners[plannerIdx]?.workspace ?? "trabalho";

  const availableProjects = useMemo(
    () => store.projects.filter((p) => !p.archived && p.workspace === selectedWs && p.kind !== "objetivo"),
    [store.projects, selectedWs]
  );

  useEffect(() => {
    setProjectId(availableProjects[0]?.id ?? "");
  }, [selectedWs, availableProjects]);

  const save = () => {
    if (!title.trim() || !projectId) return;
    store.addTask(projectId, null, title.trim(), dueDate || null, tag);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-paper border border-hairline w-full max-w-md p-5 shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider">Nova Tarefa</h3>
          <button onClick={onClose} className="text-muted hover:text-ink text-[20px] leading-none">×</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">Nome da tarefa</label>
            <input
              className="ink-input w-full"
              placeholder="o que precisa ser feito?"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {allPlanners.length > 0 && (
            <div>
              <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">Planner</label>
              <select
                className="ink-input w-full"
                value={plannerIdx}
                onChange={(e) => setPlannerIdx(Number(e.target.value))}
              >
                {allPlanners.map((p, i) => (
                  <option key={String(p.id)} value={i}>
                    {p.emoji} {p.name} · {p.workspace === "trabalho" ? "profissional" : "pessoal"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">Projeto</label>
            <select
              className="ink-input w-full"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={availableProjects.length === 0}
            >
              {availableProjects.length === 0 ? (
                <option value="">nenhum projeto neste planner</option>
              ) : (
                availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code ? `${p.code} · ` : ""}{p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">Data</label>
            <input
              type="date"
              className="ink-input w-full"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">Classificação</label>
            <select
              className="ink-input w-full"
              value={tag ?? ""}
              onChange={(e) => setTag((e.target.value as TaskTag) || null)}
            >
              <option value="">sem classificação</option>
              <option value="prioridade">⭐ Prioridade</option>
              <option value="rapida">⚡ Tarefa Rápida</option>
              <option value="acompanhamento">👁 Acompanhamento</option>
              <option value="atividade">📋 Atividade</option>
              <option value="agenda">🗓 Agenda</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" className="ink-btn flex-1" onClick={onClose}>cancelar</button>
            <button
              type="submit"
              className="ink-btn ink-btn-solid flex-1"
              disabled={!title.trim() || !projectId}
            >
              criar tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Visão Semanal — tela cheia ────────────────────────────────────────────────
function WeeklyView({ store }: { store: AppStore }) {
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const [tagFilter, setTagFilter] = useState<TaskTag | "all">("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingForDay, setAddingForDay] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];

  const projectMap = useMemo(
    () => new Map(store.projects.map((p) => [p.id, p])),
    [store.projects]
  );

  const weekTasks = useMemo(
    () =>
      store.tasks.filter(
        (t) =>
          t.dueDate &&
          t.dueDate >= weekStart &&
          t.dueDate <= weekEnd &&
          (tagFilter === "all" || t.tag === tagFilter)
      ),
    [store.tasks, weekStart, weekEnd, tagFilter]
  );

  // Keep selectedTask in sync — so edits in the modal reflect immediately
  const selectedTask = selectedTaskId
    ? store.tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const thisWeek = () => setWeekStart(mondayOf(today));
  const isThisWeek = weekStart === mondayOf(today);

  const TAG_FILTERS: { value: TaskTag | "all"; label: string }[] = [
    { value: "all",            label: "Todas" },
    { value: "prioridade",     label: "⭐ Prior." },
    { value: "atividade",      label: "📋 Ativ." },
    { value: "acompanhamento", label: "👁 Acomp." },
    { value: "rapida",         label: "⚡ Rápida" },
    { value: "agenda",         label: "🗓 Agenda" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-paper border-b border-hairline px-3 py-2 flex flex-wrap items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button className="ink-btn text-[10px] px-2 py-1" onClick={prevWeek}>← ant.</button>
          <button
            className={`text-[10px] px-3 py-1 border transition-colors ${
              isThisWeek ? "bg-ink text-paper border-ink" : "border-hairline hover:bg-tan-soft"
            }`}
            onClick={thisWeek}
          >
            esta semana
          </button>
          <button className="ink-btn text-[10px] px-2 py-1" onClick={nextWeek}>próx. →</button>
        </div>

        <span className="text-[10px] text-muted font-medium tabular-nums">
          {fmtShort(weekStart)} – {fmtShort(weekEnd)}
        </span>

        <div className="flex flex-wrap gap-1 ml-auto">
          {TAG_FILTERS.map(({ value, label }) => (
            <button
              key={String(value)}
              className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border transition-colors ${
                tagFilter === value
                  ? "bg-ink text-paper border-ink"
                  : "border-hairline hover:bg-tan-soft"
              }`}
              onClick={() => setTagFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Full-height calendar grid */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-hairline overflow-hidden min-h-0">
        {days.map((day) => {
          const isToday = day === today;
          const isPast  = day < today;
          const dayTasks = weekTasks.filter((t) => t.dueDate === day);
          const doneCnt  = dayTasks.filter((t) => t.done).length;

          return (
            <div
              key={day}
              className={`flex flex-col overflow-hidden ${isToday ? "bg-tan-soft/50" : "bg-paper"}`}
            >
              {/* Day header */}
              <div
                className={`px-2 py-2 shrink-0 flex items-start justify-between border-b border-hairline ${
                  isToday ? "bg-ink" : "bg-paper"
                }`}
              >
                <div>
                  <p className={`text-[9px] uppercase tracking-wider font-bold ${
                    isToday ? "text-paper" : isPast ? "text-muted" : "text-ink"
                  }`}>
                    {WEEKDAYS_PT[days.indexOf(day)]}
                  </p>
                  <p className={`text-[13px] font-semibold tabular-nums ${
                    isToday ? "text-paper" : isPast ? "text-muted" : "text-ink"
                  }`}>
                    {fmtShort(day)}
                  </p>
                  {dayTasks.length > 0 && (
                    <p className={`text-[8px] tabular-nums mt-0.5 ${isToday ? "text-paper/60" : "text-muted"}`}>
                      {doneCnt}/{dayTasks.length} ✓
                    </p>
                  )}
                </div>
                <button
                  className={`text-[18px] leading-none mt-0.5 px-0.5 transition-opacity hover:opacity-100 ${
                    isToday ? "text-paper/70" : "text-muted opacity-50"
                  }`}
                  onClick={() => setAddingForDay(day)}
                  title="Adicionar tarefa"
                >
                  +
                </button>
              </div>

              {/* Task list — scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto py-1 px-1 space-y-0.5">
                {dayTasks.map((task) => {
                  const proj = projectMap.get(task.projectId);
                  const tagMeta = task.tag ? WEEK_TAG_META[task.tag] : null;
                  const overdue = !task.done && task.dueDate! < today;

                  return (
                    <div
                      key={task.id}
                      className={`px-1.5 py-1 border cursor-pointer transition-colors hover:border-ink/30 ${
                        task.done
                          ? "opacity-50 border-hairline"
                          : overdue
                          ? "border-alert/40 bg-alert/5"
                          : "border-hairline hover:bg-tan-soft/30"
                      }`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="flex items-start gap-1">
                        <span
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <InkCheck
                            state={task.done ? "done" : "open"}
                            onToggle={() => store.toggleTask(task.id, !task.done)}
                          />
                        </span>
                        <p className={`flex-1 text-[10px] leading-snug min-w-0 ${
                          task.done
                            ? "line-through text-muted"
                            : overdue
                            ? "text-alert font-medium"
                            : "text-ink"
                        }`}>
                          {task.title}
                        </p>
                      </div>
                      {proj && (
                        <p className="text-[8px] uppercase tracking-wider text-muted truncate pl-5 mt-0.5">
                          {proj.code ?? proj.name}
                        </p>
                      )}
                      {tagMeta && (
                        <span
                          className="inline-block ml-5 mt-0.5 text-[7px] uppercase tracking-wider px-1 py-px font-medium"
                          style={{ background: tagMeta.bg, color: tagMeta.color }}
                        >
                          {tagMeta.label}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Inline add button */}
                <button
                  className="w-full py-1.5 text-[11px] text-muted hover:text-ink border border-dashed border-hairline/60 hover:border-hairline transition-colors"
                  onClick={() => setAddingForDay(day)}
                  title="Adicionar tarefa neste dia"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          store={store}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
      {addingForDay && (
        <AddTaskModal
          store={store}
          defaultDate={addingForDay}
          onClose={() => setAddingForDay(null)}
        />
      )}
    </div>
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────
function Painel({ mode }: { mode: "mock" | "supabase" }) {
  const store = useAppStore(mode);
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const [activeTab, setActiveTab]        = useState<"relatorio" | "visao-semanal">("relatorio");
  const [wsFilter, setWsFilter]         = useState<Workspace | "all">("all");
  const [period, setPeriod]             = useState<"today" | "week" | "month" | "all">("month");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Planner block awareness
  const [blocksLoaded, setBlocksLoaded]       = useState(false);
  const [visibleBlockTypes, setVisibleBlockTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const activeId = getActivePlannerId();
    const blocks   = activeId ? loadPlannerBlocks(activeId) : loadPlannerConfig();
    setVisibleBlockTypes(new Set(blocks.filter((b) => b.visible).map((b) => b.type)));
    setBlocksLoaded(true);
  }, []);

  const has = (type: string) => visibleBlockTypes.has(type);

  const showProjects   = has("projects");
  const showObjectivos = has("objetivo");
  const showFollowups  = has("followups");
  const showActivities = has("activities");
  const showUpcoming   = has("upcoming");
  const showTasks      = has("today") || has("priorities") || has("quick-tasks");
  const showCharts     = showProjects || showTasks;

  const hasAnyContent = showProjects || showObjectivos || showFollowups || showActivities || showUpcoming || showTasks;

  const today    = todayISO();
  const weekAgo  = addDays(today, -7);
  const monthAgo = addDays(today, -30);

  if (!mounted || store.loading) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center">
        <p className="text-[12px] font-serif-note text-muted">carregando dados…</p>
      </main>
    );
  }

  // Projetos filtrados por workspace + status
  const allFiltered = store.projects.filter((p) => {
    if (wsFilter !== "all" && p.workspace !== wsFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  // Separação por kind
  const activeProjetos  = allFiltered.filter((p) => !p.archived && p.kind !== "objetivo");
  const activeObjetivos = allFiltered.filter((p) => !p.archived && p.kind === "objetivo");

  // Tarefas só de projetos (kind !== "objetivo")
  const projetoLeaves  = activeProjetos.flatMap((p) => projectLeaves(store.tasks, p.id));
  const objetivoLeaves = activeObjetivos.flatMap((p) => projectLeaves(store.tasks, p.id));

  const relevantLeaves = [
    ...(showProjects ? projetoLeaves : []),
    ...(showObjectivos ? objetivoLeaves : []),
  ];

  const overdueLeaves  = relevantLeaves.filter((t) => !t.done && t.dueDate && t.dueDate < today);
  const completedToday = relevantLeaves.filter((t) => t.done && t.dueDate === today);

  const openFollowups = store.followups.filter((f) => {
    if (wsFilter !== "all" && f.workspace !== wsFilter) return false;
    return !f.done;
  });

  // Produtividade por dia da semana (últimas 4 semanas)
  const weekdayProd = Array(7).fill(0) as number[];
  relevantLeaves.forEach((t) => {
    if (t.done && t.dueDate && t.dueDate >= monthAgo) {
      const d = new Date(t.dueDate + "T12:00:00").getDay();
      weekdayProd[d]++;
    }
  });
  const weekdayData = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    label: WEEKDAYS_PT[d === 0 ? 6 : d - 1]?.slice(0, 3) ?? "?",
    value: weekdayProd[d],
  }));

  // Distribuição por status (projetos)
  const statusDist = (["andamento", "desenvolvimento", "aguardando", "pausado", "cancelado", "concluido"] as const).map((s) => ({
    label: STATUS_META[s].label.replace("Em ", ""),
    value: activeProjetos.filter((p) => p.status === s).length,
    color: STATUS_META[s].color,
  }));

  // Distribuição por status (objetivos)
  const objetivosStatusDist = (["andamento", "desenvolvimento", "aguardando", "pausado", "cancelado", "concluido"] as const).map((s) => ({
    label: STATUS_META[s].label.replace("Em ", ""),
    value: activeObjetivos.filter((p) => p.status === s).length,
    color: STATUS_META[s].color,
  }));

  // Evolução mensal (últimos 6 meses)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const ym  = d.toISOString().slice(0, 7);
    const label = MONTHS_PT[d.getMonth()].slice(0, 3);
    const value = relevantLeaves.filter((t) => t.done && t.dueDate?.startsWith(ym)).length;
    return { label, value };
  });

  // Tarefas atrasadas por projeto
  const overdueByProject = activeProjetos
    .map((p) => ({
      project: p,
      tasks: projectLeaves(store.tasks, p.id).filter((t) => !t.done && t.dueDate && t.dueDate < today),
    }))
    .filter((e) => e.tasks.length > 0);

  return (
    <main className="min-h-screen bg-kraft flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-paper border-b border-hairline px-4 sm:px-8 py-3 flex items-center gap-3 shrink-0">
        <a href="/" className="ink-btn py-1.5">← Planner</a>
        <h1 className="flex-1 text-[11px] uppercase tracking-[0.3em] font-semibold">
          📊 Painel Gerencial
        </h1>

        {/* Tabs */}
        <div className="flex border border-hairline">
          {([
            { key: "relatorio",     label: "Relatório" },
            { key: "visao-semanal", label: "Visão Semanal" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              className={`text-[9px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
                activeTab === key ? "bg-ink text-paper" : "hover:bg-tan-soft"
              }`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          className="ink-btn"
          onClick={() => window.print()}
          title="Imprimir / Exportar PDF"
        >
          🖨 Exportar
        </button>
      </header>

      {/* Visão Semanal — full-screen, no max-width */}
      {activeTab === "visao-semanal" && (
        <div className="flex-1 min-h-0 flex flex-col">
          <WeeklyView store={store} />
        </div>
      )}

      {/* Relatório tab — constrained width */}
      {activeTab === "relatorio" && (
      <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-8 py-8 space-y-8">

        {/* Filtros */}
        <div className="bg-paper border border-hairline px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-[9px] uppercase tracking-wider text-muted">Filtrar:</span>

          <div className="flex border border-hairline">
            {(["all", "trabalho", "pessoal"] as const).map((w) => {
              const labels = { all: "Todos", trabalho: "Profissional", pessoal: "Pessoal" };
              return (
                <button
                  key={w}
                  className={`text-[9px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
                    wsFilter === w ? "bg-ink text-paper" : "hover:bg-tan-soft"
                  }`}
                  onClick={() => setWsFilter(w)}
                >
                  {labels[w]}
                </button>
              );
            })}
          </div>

          <div className="flex border border-hairline">
            {(["today", "week", "month", "all"] as const).map((p) => {
              const labels = { today: "Hoje", week: "Semana", month: "Mês", all: "Tudo" };
              return (
                <button
                  key={p}
                  className={`text-[9px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
                    period === p ? "bg-ink text-paper" : "hover:bg-tan-soft"
                  }`}
                  onClick={() => setPeriod(p)}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {(showProjects || showObjectivos) && (
            <select
              className="ink-input !w-auto text-[9px] uppercase tracking-wider border border-hairline px-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {(["andamento", "desenvolvimento", "aguardando", "pausado", "cancelado", "concluido"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Estado vazio */}
        {blocksLoaded && !hasAnyContent && (
          <div className="bg-paper border border-hairline px-6 py-12 text-center">
            <p className="text-[28px] mb-4">📭</p>
            <p className="text-[14px] font-semibold text-ink mb-2">Nenhum bloco ativo no planner</p>
            <p className="text-[12px] font-serif-note text-muted max-w-xs mx-auto leading-relaxed">
              Adicione blocos ao seu planner para visualizar dados aqui. Acesse{" "}
              <a href="/construtor" className="underline hover:text-ink">Construir meu Planner</a>{" "}
              para personalizar.
            </p>
          </div>
        )}

        {hasAnyContent && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {showProjects && (
                <StatCard
                  label="Projetos ativos"
                  value={activeProjetos.length}
                  sub={`${allFiltered.filter((p) => p.archived && p.kind !== "objetivo").length} arquivados`}
                />
              )}
              {showObjectivos && (
                <StatCard
                  label="Objetivos ativos"
                  value={activeObjetivos.length}
                  sub={`${allFiltered.filter((p) => p.archived && p.kind === "objetivo").length} arquivados`}
                />
              )}
              {(showProjects || showTasks) && (
                <StatCard
                  label="Tarefas atrasadas"
                  value={overdueLeaves.length}
                  sub="precisam de atenção"
                  accent={overdueLeaves.length > 0 ? "var(--alert)" : "var(--muted)"}
                />
              )}
              {(showProjects || showTasks) && (
                <StatCard
                  label="Concluídas hoje"
                  value={completedToday.length}
                  sub={fmtLong(today).split(",")[0]}
                />
              )}
              {showFollowups && (
                <StatCard
                  label="Acompanhamentos abertos"
                  value={openFollowups.length}
                  sub="pendentes de resposta"
                />
              )}
            </div>

            {/* Gráficos */}
            {showCharts && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-paper border border-hairline p-4">
                  <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Tarefas concluídas por dia da semana</p>
                  <BarChart data={weekdayData} color="var(--ink)" />
                </div>

                {showProjects && (
                  <div className="bg-paper border border-hairline p-4">
                    <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Projetos por status</p>
                    <PieChart data={statusDist} />
                  </div>
                )}

                {showObjectivos && !showProjects && (
                  <div className="bg-paper border border-hairline p-4">
                    <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Objetivos por status</p>
                    <PieChart data={objetivosStatusDist} />
                  </div>
                )}

                <div className="bg-paper border border-hairline p-4">
                  <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Tarefas concluídas por mês</p>
                  <BarChart data={monthlyData} color="var(--tan)" />
                </div>
              </div>
            )}

            {/* Projetos — Progresso Individual */}
            {showProjects && (
              <div className="bg-paper border border-hairline">
                <div className="section-bar">Projetos — Progresso Individual</div>
                <div className="divide-y divide-hairline">
                  {activeProjetos.length === 0 && (
                    <p className="px-4 py-6 text-[11px] font-serif-note text-muted text-center">
                      Nenhum projeto encontrado com os filtros selecionados.
                    </p>
                  )}
                  {activeProjetos.map((p) => {
                    const prog   = projectProgress(store.tasks, p.id);
                    const leaves = projectLeaves(store.tasks, p.id);
                    const overdue = leaves.filter((t) => !t.done && t.dueDate && t.dueDate < today).length;
                    const done   = leaves.filter((t) => t.done).length;
                    return (
                      <div key={p.id} className="px-4 py-3 group">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] tracking-[0.2em] text-muted w-16 shrink-0">{p.code}</span>
                          <span className="flex-1 text-[12px] font-medium">{p.name}</span>
                          <span
                            className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 shrink-0"
                            style={{ background: STATUS_META[p.status].color, color: "#FAF8F3" }}
                          >
                            {STATUS_META[p.status].label}
                          </span>
                          {p.gains && (
                            <span className="text-[10px] text-muted shrink-0">{fmtBRL(p.gains)}</span>
                          )}
                          <button
                            className="text-[11px] px-1.5 py-0.5 text-muted hover:text-alert hover:bg-alert/10 rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            title="Excluir projeto"
                            onClick={() => {
                              if (confirm(`Excluir o projeto "${p.name}" e todas as suas tarefas? Essa ação não tem volta.`)) {
                                store.deleteProject(p.id);
                              }
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 border border-hairline">
                            <div className="h-full bg-ink" style={{ width: `${prog}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums font-medium w-8 text-right">{prog}%</span>
                          <span className="text-[9px] text-muted">{done}/{leaves.length} tarefas</span>
                          {overdue > 0 && (
                            <span className="text-[9px] text-alert font-medium">⚠ {overdue} atrasada{overdue > 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Objetivos — Progresso */}
            {showObjectivos && (
              <div className="bg-paper border border-hairline">
                <div className="section-bar">🎯 Objetivos — Progresso</div>
                <div className="divide-y divide-hairline">
                  {activeObjetivos.length === 0 && (
                    <p className="px-4 py-6 text-[11px] font-serif-note text-muted text-center">
                      Nenhum objetivo encontrado com os filtros selecionados.
                    </p>
                  )}
                  {activeObjetivos.map((p) => {
                    const prog   = projectProgress(store.tasks, p.id);
                    const leaves = projectLeaves(store.tasks, p.id);
                    const done   = leaves.filter((t) => t.done).length;
                    return (
                      <div key={p.id} className="px-4 py-3 group">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[14px] shrink-0">{HEALTH_META[p.health].emoji}</span>
                          <span className="flex-1 text-[12px] font-medium">{p.name}</span>
                          <span
                            className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 shrink-0"
                            style={{ background: STATUS_META[p.status].color, color: "#FAF8F3" }}
                          >
                            {STATUS_META[p.status].label}
                          </span>
                          <button
                            className="text-[11px] px-1.5 py-0.5 text-muted hover:text-alert hover:bg-alert/10 rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            title="Excluir objetivo"
                            onClick={() => {
                              if (confirm(`Excluir o objetivo "${p.name}" e todas as suas tarefas? Essa ação não tem volta.`)) {
                                store.deleteProject(p.id);
                              }
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 border border-hairline">
                            <div className="h-full bg-ink" style={{ width: `${prog}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums font-medium w-8 text-right">{prog}%</span>
                          {leaves.length > 0 && (
                            <span className="text-[9px] text-muted">{done}/{leaves.length} tarefas</span>
                          )}
                        </div>
                        {p.notes && (
                          <p className="mt-1 text-[10px] font-serif-note text-muted leading-snug">{p.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Destaques */}
            {(showProjects || showTasks || showFollowups) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Tarefas atrasadas */}
                {(showProjects || showTasks) && (
                  <div className="bg-paper border border-hairline">
                    <div className="section-bar">⚠ Tarefas Atrasadas</div>
                    <div className="px-4 py-3">
                      {overdueByProject.length === 0 ? (
                        <p className="text-[11px] font-serif-note text-muted py-2">✓ Nenhuma tarefa atrasada.</p>
                      ) : (
                        overdueByProject.map(({ project, tasks }) => (
                          <div key={project.id} className="mb-3">
                            <p className="text-[9px] uppercase tracking-wider text-muted mb-1">
                              {project.code ? `${project.code} · ` : ""}{project.name}
                            </p>
                            {tasks.slice(0, 3).map((t) => (
                              <div key={t.id} className="flex items-center gap-2 py-0.5">
                                <span className="text-alert text-[10px]">▸</span>
                                <span className="flex-1 text-[11px]">{t.title}</span>
                                <span className="text-[9px] text-alert tabular-nums">
                                  {fmtShort(t.dueDate!)}
                                </span>
                              </div>
                            ))}
                            {tasks.length > 3 && (
                              <p className="text-[9px] text-muted mt-0.5">+{tasks.length - 3} mais…</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Próximos acompanhamentos */}
                {showFollowups && (
                  <div className="bg-paper border border-hairline">
                    <div className="section-bar">👁 Próximos Acompanhamentos</div>
                    <div className="px-4 py-3">
                      {openFollowups.length === 0 ? (
                        <p className="text-[11px] font-serif-note text-muted py-2">Sem acompanhamentos abertos.</p>
                      ) : (
                        openFollowups
                          .sort((a, b) => (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1)
                          .slice(0, 8)
                          .map((f) => {
                            const late = f.dueDate && f.dueDate < today;
                            return (
                              <div key={f.id} className="flex items-center gap-2 py-1 hairline-b">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] truncate ${late ? "text-alert font-medium" : ""}`}>
                                    {f.what}
                                  </p>
                                  <p className="text-[9px] text-muted truncate">{f.who}</p>
                                </div>
                                {f.dueDate && (
                                  <span className={`text-[9px] tabular-nums shrink-0 ${late ? "text-alert" : "text-muted"}`}>
                                    {late ? "⚠ " : ""}{fmtShort(f.dueDate)}
                                  </span>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Atividades */}
            {showActivities && (
              <div className="bg-paper border border-hairline">
                <div className="section-bar">📋 Atividades</div>
                <div className="px-4 py-6 text-center">
                  <p className="text-[11px] font-serif-note text-muted">
                    Registre atividades no seu planner para visualizá-las aqui.
                  </p>
                </div>
              </div>
            )}

            {/* Próximas Entregas */}
            {showUpcoming && (
              <div className="bg-paper border border-hairline">
                <div className="section-bar">🔔 Próximas Entregas</div>
                <div className="divide-y divide-hairline">
                  {(() => {
                    const upcoming = relevantLeaves
                      .filter((t) => !t.done && t.dueDate && t.dueDate >= today)
                      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
                      .slice(0, 10);
                    if (upcoming.length === 0) {
                      return (
                        <p className="px-4 py-6 text-[11px] font-serif-note text-muted text-center">
                          Nenhuma entrega próxima.
                        </p>
                      );
                    }
                    return upcoming.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 px-4 py-2">
                        <span className="flex-1 text-[11px]">{t.title}</span>
                        <span className="text-[9px] text-muted tabular-nums shrink-0">{fmtShort(t.dueDate!)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </>
        )}

        <footer className="text-center pt-4">
          <p className="text-[10px] font-serif-note text-muted">
            Dados atualizados em tempo real · {fmtLong(today)}
          </p>
        </footer>

      </div>
      )}
    </main>
  );
}
