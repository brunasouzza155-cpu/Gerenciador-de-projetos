"use client";

import { useState } from "react";
import { diffDays, fmtShort, todayISO } from "@/lib/dates";
import type { AppStore } from "@/lib/store";
import type { Followup, Project, Workspace } from "@/lib/types";
import { InkCheck, RowBtn, SectionBar } from "./ui";

// Acompanhamentos: coisas que dependem de outras pessoas.
// Mostra há quantos dias espera; prazo estourado vira "COBRAR" em vermelho.

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
    .sort((a, b) => (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1);

  const projectName = (id: string | null) =>
    id ? projects.find((p) => p.id === id)?.code ?? null : null;

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar
        title="Acompanhamentos"
        right={
          <button
            className="text-paper underline underline-offset-2 text-[10px] tracking-[0.15em]"
            onClick={() => { setFormOpen(!formOpen); setEditingId(null); }}
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
            onSave={(data) => { store.addFollowup(data); setFormOpen(false); }}
            onCancel={() => setFormOpen(false)}
          />
        )}
        {items.length === 0 && !formOpen && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            Ninguém te devendo resposta.
          </p>
        )}
        {items.map((f) => {
          const waiting = Math.max(0, diffDays(f.sinceDate, today));
          const late = f.dueDate !== null && f.dueDate < today;
          const code = projectName(f.projectId);
          if (editingId === f.id) {
            return (
              <FollowupForm
                key={f.id}
                workspace={workspace}
                projects={projects}
                initial={f}
                onSave={(data) => { store.updateFollowup(f.id, data); setEditingId(null); }}
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
                    {code && <span>{code} · </span>}
                    esperando há {waiting} {waiting === 1 ? "dia" : "dias"}
                    {f.dueDate && !late && <span> · retorno até {fmtShort(f.dueDate)}</span>}
                  </span>
                </div>
                {late && (
                  <span className="text-[9px] font-bold tracking-[0.15em] text-paper bg-alert px-1.5 py-0.5">
                    COBRAR
                  </span>
                )}
                <span className="row-actions flex gap-1">
                  <RowBtn label="✎" title="Editar" onClick={() => { setEditingId(f.id); setFormOpen(false); }} />
                  <RowBtn label="×" title="Excluir" danger onClick={() => store.deleteFollowup(f.id)} />
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
        });
      }}
    >
      <input className="ink-input" placeholder="quem? (pessoa ou área)" value={who} onChange={(e) => setWho(e.target.value)} autoFocus />
      <input className="ink-input" placeholder="o quê está sendo aguardado?" value={what} onChange={(e) => setWhat(e.target.value)} />
      <div className="flex gap-2">
        <select className="ink-input flex-1" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">sem projeto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
        <input type="date" className="ink-input w-[130px]" title="prazo de retorno" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="ink-btn" onClick={onCancel}>cancelar</button>
        <button type="submit" className="ink-btn ink-btn-solid">salvar</button>
      </div>
    </form>
  );
}
