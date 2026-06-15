"use client";

import { useState } from "react";
import { fmtShort, todayISO } from "@/lib/dates";
import { buildTree, nodeState } from "@/lib/tree";
import type { AppStore } from "@/lib/store";
import type { Project, Task, Workspace } from "@/lib/types";
import { STATUS_META } from "@/lib/theme";
import { AddInline, InkCheck, RowBtn, SectionBar } from "./ui";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityItem {
  task: Task;
  project: Project;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function ActivitiesPanel({
  store,
  workspace,
  projects,
}: {
  store: AppStore;
  workspace: Workspace;
  projects: Project[];
}) {
  const [adding, setAdding] = useState(false);

  const projectIds = new Set(projects.map((p) => p.id));

  // Root activities (tag=atividade, no parent, not done)
  const items: ActivityItem[] = store.tasks
    .filter(
      (t) =>
        !t.done &&
        t.tag === "atividade" &&
        t.parentId === null &&
        projectIds.has(t.projectId)
    )
    .map((t) => ({
      task: t,
      project: projects.find((p) => p.id === t.projectId)!,
    }))
    .filter((x) => x.project !== undefined)
    .sort((a, b) => ((a.task.dueDate ?? "9999") < (b.task.dueDate ?? "9999") ? -1 : 1));

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar
        title="Atividades"
        right={
          <span className="text-paper text-[10px] tracking-[0.15em]">
            {items.length}
          </span>
        }
      />
      <div className="px-3 py-2">
        {items.length === 0 && !adding && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            Nenhuma atividade em andamento.
          </p>
        )}

        {items.map(({ task, project }) => (
          <ActivityRow key={task.id} task={task} project={project} store={store} />
        ))}

        {/* Add form */}
        {adding ? (
          <AddActivityForm
            projects={projects}
            store={store}
            workspace={workspace}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            className="mt-1.5 text-[10px] text-muted hover:text-ink underline"
            onClick={() => setAdding(true)}
          >
            + nova atividade
          </button>
        )}
      </div>
    </section>
  );
}

// ── Add activity form ─────────────────────────────────────────────────────────

function AddActivityForm({
  projects,
  store,
  workspace,
  onDone,
}: {
  projects: Project[];
  store: AppStore;
  workspace: Workspace;
  onDone: () => void;
}) {
  const active = projects.filter((p) => !p.archived && p.workspace === workspace);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(active[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");

  const save = () => {
    const t = title.trim();
    if (!t || !projectId) return;
    store.addTask(projectId, null, t, dueDate || null, "atividade");
    setTitle("");
    setDueDate("");
    onDone();
  };

  if (active.length === 0) {
    return (
      <p className="text-[11px] font-serif-note text-muted py-2">
        Nenhum projeto ativo neste workspace.
      </p>
    );
  }

  return (
    <form
      className="mt-2 border border-hairline p-2 space-y-1.5"
      onSubmit={(e) => { e.preventDefault(); save(); }}
    >
      <input
        className="ink-input w-full"
        placeholder="Título da atividade…"
        value={title}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex gap-1.5 flex-wrap">
        <select
          className="ink-input flex-1 min-w-[140px]"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {active.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code ? `${p.code} · ${p.name}` : p.name}
              {" · "}{STATUS_META[p.status].label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="ink-input w-[130px]"
          value={dueDate}
          title="Data da atividade"
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="flex gap-1.5">
        <button className="ink-btn ink-btn-solid text-[10px] flex-1" type="submit" disabled={!title.trim() || !projectId}>
          adicionar
        </button>
        <button className="ink-btn text-[10px]" type="button" onClick={onDone}>
          cancelar
        </button>
      </div>
    </form>
  );
}

// ── Activity row (with subtasks) ──────────────────────────────────────────────

function ActivityRow({
  task,
  project,
  store,
}: {
  task: Task;
  project: Project;
  store: AppStore;
}) {
  const today = todayISO();
  const overdue = task.dueDate && task.dueDate < today;
  const statusMeta = STATUS_META[project.status];

  // Direct children of this activity task
  const subtasks = store.tasks
    .filter((t) => t.parentId === task.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const [expanded, setExpanded] = useState(true);
  const [addingSub, setAddingSub] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDate, setEditDate] = useState(task.dueDate ?? "");

  const done = store.tasks
    .filter((t) => t.parentId === task.id)
    .filter((t) => t.done).length;
  const total = subtasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : null;

  return (
    <div className="py-1.5 hairline-b">
      {/* Main row */}
      <div className="flex items-start gap-2 group">
        <InkCheck
          state="open"
          onToggle={() => store.toggleTask(task.id, true)}
          title="Concluir atividade"
        />
        <div className="flex-1 min-w-0">
          {editing ? (
            <form
              className="flex flex-wrap gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editTitle.trim()) return;
                store.updateTask(task.id, {
                  title: editTitle.trim(),
                  dueDate: editDate || null,
                });
                setEditing(false);
              }}
            >
              <input
                className="ink-input flex-1 min-w-[120px] text-[11px]"
                value={editTitle}
                autoFocus
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <input
                type="date"
                className="ink-input w-[120px] text-[11px]"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
              <button className="ink-btn text-[10px]" type="submit">ok</button>
              <button className="ink-btn text-[10px]" type="button" onClick={() => { setEditTitle(task.title); setEditDate(task.dueDate ?? ""); setEditing(false); }}>×</button>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[12px] leading-snug">{task.title}</span>
                {task.dueDate && (
                  <span className={`text-[9px] tabular-nums ${overdue ? "text-alert font-medium" : "text-muted"}`}>
                    {overdue ? "⚠ " : ""}{fmtShort(task.dueDate)}
                  </span>
                )}
                {subtasks.length > 0 && (
                  <button
                    className="text-[9px] text-muted hover:text-ink"
                    onClick={() => setExpanded((v) => !v)}
                    title={expanded ? "Recolher" : "Expandir"}
                  >
                    {expanded ? "▾" : "▸"} {done}/{total}
                  </button>
                )}
              </div>
              <span className="block text-[9px] uppercase tracking-wider text-muted mt-0.5">
                {project.code ? `${project.code} · ${project.name}` : project.name}
                {" · "}
                <span style={{ color: statusMeta.color }}>{statusMeta.label}</span>
              </span>
              {progress !== null && (
                <div className="mt-1 h-[3px] bg-hairline w-full max-w-[120px]">
                  <div className="h-full bg-ink" style={{ width: `${progress}%` }} />
                </div>
              )}
            </>
          )}
        </div>
        {!editing && (
          <span className="row-actions flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <RowBtn label="+" title="Adicionar subtarefa" onClick={() => { setAddingSub((v) => !v); setExpanded(true); }} />
            <RowBtn label="✎" title="Editar" onClick={() => setEditing(true)} />
            <RowBtn label="×" title="Excluir atividade" danger onClick={() => { if (confirm(`Excluir "${task.title}"?`)) store.deleteTask(task.id); }} />
          </span>
        )}
      </div>

      {/* Subtasks */}
      {expanded && subtasks.length > 0 && (
        <div className="ml-7 mt-1 space-y-0.5">
          {subtasks.map((sub) => (
            <SubtaskRow key={sub.id} task={sub} store={store} />
          ))}
        </div>
      )}

      {/* Add subtask inline */}
      {addingSub && (
        <div className="ml-7 mt-1 flex items-center gap-2">
          <AddInline
            placeholder="nova subtarefa…"
            onAdd={(v) => {
              store.addTask(task.projectId, task.id, v);
              setAddingSub(false);
            }}
          />
          <button className="ink-btn text-[10px]" onClick={() => setAddingSub(false)}>cancelar</button>
        </div>
      )}
    </div>
  );
}

// ── Subtask row ───────────────────────────────────────────────────────────────

function SubtaskRow({ task, store }: { task: Task; store: AppStore }) {
  const today = todayISO();
  const overdue = task.dueDate && !task.done && task.dueDate < today;
  // Build a minimal node for nodeState
  const node = { task, children: [] };
  const state = nodeState(node);

  return (
    <div className="flex items-center gap-1.5 group py-0.5 hairline-b last:border-b-0">
      <span className="text-hairline text-[10px] shrink-0">└</span>
      <InkCheck
        state={state}
        onToggle={() => store.toggleTask(task.id, state !== "done")}
      />
      <span
        className={`flex-1 text-[11px] leading-tight ${
          state === "done" ? "line-through text-muted" : overdue ? "text-alert" : ""
        }`}
      >
        {task.title}
      </span>
      {task.dueDate && !task.done && (
        <span className={`text-[9px] tabular-nums shrink-0 ${overdue ? "text-alert" : "text-muted"}`}>
          {fmtShort(task.dueDate)}
        </span>
      )}
      <span className="row-actions flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <RowBtn
          label="×"
          title="Excluir subtarefa"
          danger
          onClick={() => {
            if (confirm(`Excluir "${task.title}"?`)) store.deleteTask(task.id);
          }}
        />
      </span>
    </div>
  );
}
