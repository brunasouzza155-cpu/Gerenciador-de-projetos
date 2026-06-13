"use client";

import { useState } from "react";
import { fmtFull } from "@/lib/dates";
import { buildTree, projectProgress } from "@/lib/tree";
import { fmtBRL, HEALTH_META, STATUS_META, STATUS_ORDER } from "@/lib/theme";
import type { AppStore } from "@/lib/store";
import type { Health, Project, ProjectStatus } from "@/lib/types";
import { AddInline, RowBtn } from "./ui";
import { TaskTree } from "./TaskTree";

export function ProjectCard({ project, store }: { project: Project; store: AppStore }) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);

  const meta = STATUS_META[project.status];
  const progress = projectProgress(store.tasks, project.id);
  const tree = buildTree(store.tasks, project.id);

  return (
    <div
      className="bg-paper border border-hairline shadow-[2px_2px_0_rgba(28,27,24,0.06)]"
      style={{ borderLeft: `4px solid ${meta.color}` }}
    >
      {/* Cabeçalho do card */}
      <div className="px-3 pt-2.5 pb-2 hairline-b">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] tracking-[0.2em] text-muted">{project.code}</span>
          <button
            className="font-semibold text-[13px] uppercase tracking-wide text-left"
            onClick={() => setOpen(!open)}
            title={open ? "Recolher cascata" : "Expandir cascata"}
          >
            {project.name} <span className="text-muted text-[10px]">{open ? "▾" : "▸"}</span>
          </button>
          <span title={HEALTH_META[project.health].label} className="text-[11px]">
            {HEALTH_META[project.health].emoji}
          </span>
          <span
            className="ml-auto text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5"
            style={{ color: "#FAF8F3", background: meta.color }}
          >
            {meta.label}
          </span>
        </div>

        {/* Barra de progresso fina */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-[5px] border border-hairline">
            <div className="h-full bg-ink" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] tabular-nums font-medium">{progress}%</span>
        </div>

        {/* Linha de dados rápidos */}
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted">
          {project.startDate && <span>início {fmtFull(project.startDate)}</span>}
          {project.dueDate && <span>previsão {fmtFull(project.dueDate)}</span>}
          {project.stoppedDate && (
            <span className="text-alert">parado em {fmtFull(project.stoppedDate)}</span>
          )}
          {project.gains != null && <span>ganhos {fmtBRL(project.gains)}</span>}
          {project.fte != null && <span>{project.fte} FTE</span>}
        </div>

        {project.notes && (
          <p className="mt-1.5 text-[11px] font-serif-note text-muted leading-snug">
            {project.notes}
          </p>
        )}

        <div className="mt-2 flex gap-2">
          <button className="ink-btn" onClick={() => setEditing(!editing)}>
            {editing ? "fechar edição" : "editar dados do projeto"}
          </button>
          {!project.archived &&
            (project.status === "concluido" || project.status === "cancelado") && (
              <button
                className="ink-btn"
                onClick={() => store.updateProject(project.id, { archived: true })}
              >
                arquivar
              </button>
            )}
          {project.archived && (
            <button
              className="ink-btn"
              onClick={() => store.updateProject(project.id, { archived: false })}
            >
              desarquivar
            </button>
          )}
          <button
            className="ink-btn ml-auto text-alert border-alert"
            onClick={() => {
              if (confirm(`Excluir o projeto "${project.name}" e todas as suas tarefas? Essa ação não tem volta.`)) {
                store.deleteProject(project.id);
              }
            }}
          >
            excluir
          </button>
        </div>

        {editing && (
          <ProjectForm
            initial={project}
            onSave={(data) => {
              store.updateProject(project.id, data);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        )}
      </div>

      {/* Cascata */}
      {open && (
        <div className="px-3 py-2">
          <TaskTree nodes={tree} store={store} />
          <div className="pt-1.5">
            <AddInline
              placeholder="+ nova tarefa… (Enter para salvar)"
              onAdd={(v) => store.addTask(project.id, null, v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Formulário inline com TODOS os campos do projeto.
export function ProjectForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<Project, "id" | "createdAt" | "updatedAt"> & Partial<Project>;
  onSave: (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    code: initial.code,
    name: initial.name,
    status: initial.status as ProjectStatus,
    health: initial.health as Health,
    startDate: initial.startDate ?? "",
    dueDate: initial.dueDate ?? "",
    stoppedDate: initial.stoppedDate ?? "",
    gains: initial.gains?.toString() ?? "",
    fte: initial.fte?.toString() ?? "",
    notes: initial.notes,
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const showStopped = f.status === "pausado" || f.status === "cancelado";

  return (
    <form
      className="mt-2 border border-hairline bg-tan-soft/60 p-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.name.trim()) return;
        onSave({
          workspace: initial.workspace,
          code: f.code.trim(),
          name: f.name.trim(),
          status: f.status,
          health: f.health,
          startDate: f.startDate || null,
          dueDate: f.dueDate || null,
          stoppedDate: showStopped ? f.stoppedDate || null : null,
          gains: f.gains ? Number(f.gains) : null,
          fte: f.fte ? Number(f.fte) : null,
          notes: f.notes,
          archived: initial.archived ?? false,
        });
      }}
    >
      <label className="flex flex-col gap-0.5">
        <span className="text-muted uppercase tracking-wider text-[9px]">Código</span>
        <input className="ink-input" value={f.code} onChange={(e) => set("code", e.target.value)} />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted uppercase tracking-wider text-[9px]">Nome</span>
        <input className="ink-input" value={f.name} onChange={(e) => set("name", e.target.value)} required />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted uppercase tracking-wider text-[9px]">Status</span>
        <select className="ink-input" value={f.status} onChange={(e) => set("status", e.target.value)}>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted uppercase tracking-wider text-[9px]">Farol de saúde</span>
        <select
          className="ink-input"
          value={String(f.health)}
          onChange={(e) => setF((p) => ({ ...p, health: Number(e.target.value) as Health }))}
        >
          <option value="0">🟢 Saudável</option>
          <option value="1">🟡 Atenção</option>
          <option value="2">🔴 Crítico</option>
        </select>
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted uppercase tracking-wider text-[9px]">Data de início</span>
        <input type="date" className="ink-input" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted uppercase tracking-wider text-[9px]">Data prevista</span>
        <input type="date" className="ink-input" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
      </label>
      {showStopped && (
        <label className="flex flex-col gap-0.5">
          <span className="text-muted uppercase tracking-wider text-[9px]">Data em que parou</span>
          <input type="date" className="ink-input" value={f.stoppedDate} onChange={(e) => set("stoppedDate", e.target.value)} />
        </label>
      )}
      <label className="flex flex-col gap-0.5">
        <span className="text-muted uppercase tracking-wider text-[9px]">Ganhos (R$)</span>
        <input type="number" min="0" step="any" className="ink-input" value={f.gains} onChange={(e) => set("gains", e.target.value)} />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted uppercase tracking-wider text-[9px]">FTE</span>
        <input type="number" min="0" step="0.1" className="ink-input" value={f.fte} onChange={(e) => set("fte", e.target.value)} />
      </label>
      <label className="col-span-2 flex flex-col gap-0.5">
        <span className="text-muted uppercase tracking-wider text-[9px]">Notas / riscos / decisões</span>
        <textarea className="ink-input" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </label>
      <div className="col-span-2 flex gap-2 justify-end">
        <button type="button" className="ink-btn" onClick={onCancel}>cancelar</button>
        <button type="submit" className="ink-btn ink-btn-solid">salvar</button>
      </div>
    </form>
  );
}
