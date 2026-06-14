"use client";

import { useState } from "react";
import { diffDays, fmtShort, todayISO } from "@/lib/dates";
import type { AppStore } from "@/lib/store";
import type { Followup, Project, Task, Workspace } from "@/lib/types";
import { InkCheck, RowBtn, SectionBar } from "./ui";

// Acompanhamentos: coisas que dependem de outras pessoas,
// mais tarefas da cascata marcadas com tag="acompanhamento".

export function FollowupsPanel({
  store,
  workspace,
  projects,
}: {
  store: AppStore;
  workspace: Workspace;
  projects: Project[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = todayISO();

  const items = store.followups
    .filter((f) => f.workspace === workspace && !f.done)
    .sort((a, b) =>
      (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1
    );

  // Tarefas tagadas como "acompanhamento" dos projetos visíveis.
  const projectIds = new Set(projects.map((p) => p.id));
  const taskFollowups: { task: Task; project: Project }[] = store.tasks
    .filter(
      (t) => !t.done && t.tag === "acompanhamento" && projectIds.has(t.projectId)
    )
    .map((t) => ({
      task: t,
      project: projects.find((p) => p.id === t.projectId)!,
    }))
    .filter((x) => x.project !== undefined)
    .sort((a, b) =>
      (a.task.tagDueDate ?? "9999") < (b.task.tagDueDate ?? "9999") ? -1 : 1
    );

  const projectLabel = (id: string | null) => {
    if (!id) return null;
    const p = projects.find((pr) => pr.id === id);
    if (!p) return null;
    return p.code ? `${p.code} · ${p.name}` : p.name;
  };

  const total = items.length + taskFollowups.length;

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar
        title="Acompanhamentos"
        right={
          <button
            className="text-paper underline underline-offset-2 text-[10px] tracking-[0.15em]"
            onClick={() => {
              setFormOpen(!formOpen);
              setEditingId(null);
            }}
          >
            + novo
          </button>
        }
      />
      <div className="px-3 py-2">
        {formOpen && (
          <FollowupForm
            workspace={workspace}
            projects={projects}
            onSave={(data) => {
              store.addFollowup(data);
              setFormOpen(false);
            }}
            onCancel={() => setFormOpen(false)}
          />
        )}

        {total === 0 && !formOpen && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            Ninguém te devendo resposta.
          </p>
        )}

        {/* Tarefas tagadas como acompanhamento (virtuais — vêm da cascata) */}
        {taskFollowups.map(({ task, project }) => {
          const late =
            task.tagDueDate !== null && task.tagDueDate < today;
          return (
            <div key={`t-${task.id}`} className="group-row py-1.5 hairline-b">
              <div className="flex items-start gap-2">
                <InkCheck
                  state="open"
                  onToggle={() => store.toggleTask(task.id, true)}
                  title="Marcar como concluída"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px]">
                    <span
                      className="text-[8px] uppercase tracking-wider px-1 py-0.5 mr-1 font-medium align-middle"
                      style={{ background: "#E8EEF4", color: "#51677F" }}
                    >
                      TAREFA
                    </span>
                    {task.title}
                  </span>
                  <span className="block text-[9px] uppercase tracking-wider text-muted">
                    {project.code ? `${project.code} · ${project.name}` : project.name}
                    {task.tagDueDate && !late && (
                      <span> · cobrar em {fmtShort(task.tagDueDate)}</span>
                    )}
                  </span>
                </div>
                {late && (
                  <span className="text-[9px] font-bold tracking-[0.15em] text-paper bg-alert px-1.5 py-0.5 shrink-0">
                    COBRAR
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Acompanhamentos manuais */}
        {items.map((f) => {
          const waiting = Math.max(0, diffDays(f.sinceDate, today));
          const late = f.dueDate !== null && f.dueDate < today;
          const hasValidation = f.validationDate !== null;
          const validationLate =
            hasValidation && f.validationDate! < today;

          if (editingId === f.id) {
            return (
              <FollowupForm
                key={f.id}
                workspace={workspace}
                projects={projects}
                initial={f}
                onSave={(data) => {
                  store.updateFollowup(f.id, data);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            );
          }

          return (
            <div key={f.id} className="group-row py-1.5 hairline-b">
              <div className="flex items-start gap-2">
                <InkCheck
                  state="open"
                  onToggle={() => store.updateFollowup(f.id, { done: true })}
                  title="Dar baixa"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px]">
                    <strong>{f.who}</strong> — {f.what}
                  </span>
                  <span className="block text-[9px] uppercase tracking-wider text-muted">
                    {projectLabel(f.projectId) && <span>{projectLabel(f.projectId)} · </span>}
                    esperando há {waiting}{" "}
                    {waiting === 1 ? "dia" : "dias"}
                    {f.dueDate && !late && (
                      <span> · cobrar até {fmtShort(f.dueDate)}</span>
                    )}
                    {hasValidation && (
                      <span
                        className={
                          validationLate ? "text-alert" : ""
                        }
                      >
                        {" · "}validar em {fmtShort(f.validationDate!)}
                      </span>
                    )}
                  </span>
                </div>
                {late && (
                  <span className="text-[9px] font-bold tracking-[0.15em] text-paper bg-alert px-1.5 py-0.5 shrink-0">
                    COBRAR
                  </span>
                )}
                <span className="row-actions flex gap-1 shrink-0">
                  <RowBtn
                    label="✎"
                    title="Editar"
                    onClick={() => {
                      setEditingId(f.id);
                      setFormOpen(false);
                    }}
                  />
                  <RowBtn
                    label="×"
                    title="Excluir"
                    danger
                    onClick={() => store.deleteFollowup(f.id)}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FollowupForm({
  workspace,
  projects,
  initial,
  onSave,
  onCancel,
}: {
  workspace: Workspace;
  projects: Project[];
  initial?: Followup;
  onSave: (data: Omit<Followup, "id" | "done">) => void;
  onCancel: () => void;
}) {
  const [who, setWho] = useState(initial?.who ?? "");
  const [what, setWhat] = useState(initial?.what ?? "");
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [validationDate, setValidationDate] = useState(
    initial?.validationDate ?? ""
  );

  return (
    <form
      className="border border-hairline bg-tan-soft/60 p-2 mb-2 flex flex-col gap-2 text-[11px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!who.trim() || !what.trim()) return;
        onSave({
          workspace,
          projectId: projectId || null,
          who: who.trim(),
          what: what.trim(),
          sinceDate: initial?.sinceDate ?? todayISO(),
          dueDate: dueDate || null,
          validationDate: validationDate || null,
        });
      }}
    >
      <input
        className="ink-input"
        placeholder="quem? (pessoa ou área)"
        value={who}
        onChange={(e) => setWho(e.target.value)}
        autoFocus
      />
      <input
        className="ink-input"
        placeholder="o quê está sendo aguardado?"
        value={what}
        onChange={(e) => setWhat(e.target.value)}
      />
      <select
        className="ink-input"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
      >
        <option value="">sem projeto</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} — {p.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <label className="flex flex-col gap-0.5 flex-1">
          <span className="text-[9px] uppercase tracking-wider text-muted">
            Cobrar até
          </span>
          <input
            type="date"
            className="ink-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-0.5 flex-1">
          <span className="text-[9px] uppercase tracking-wider text-muted">
            Validar em
          </span>
          <input
            type="date"
            className="ink-input"
            title="Aparecerá no painel 'Hoje' nesta data"
            value={validationDate}
            onChange={(e) => setValidationDate(e.target.value)}
          />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="ink-btn" onClick={onCancel}>
          cancelar
        </button>
        <button type="submit" className="ink-btn ink-btn-solid">
          salvar
        </button>
      </div>
    </form>
  );
}
