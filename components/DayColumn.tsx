"use client";

import { fmtShort, todayISO } from "@/lib/dates";
import { projectLeaves } from "@/lib/tree";
import type { AppStore } from "@/lib/store";
import type { Project, Task, Workspace } from "@/lib/types";
import { AddInline, InkCheck, RowBtn, SectionBar } from "./ui";

// Coluna 1: o dia de hoje — prioridades (máx. 3), vencimentos e demandas.

export function PrioritiesPanel({ store, workspace }: { store: AppStore; workspace: Workspace }) {
  const today = todayISO();
  const items = store.priorities.filter((p) => p.workspace === workspace && p.date === today);
  const full = items.length >= 3;

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar title="Prioridades do dia" right={<span>{items.length}/3</span>} />
      <div className="px-3 py-2">
        {items.length === 0 && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            O que faria o dia valer a pena?
          </p>
        )}
        {items.map((p, i) => (
          <div key={p.id} className="group-row flex items-center gap-2 py-1 hairline-b">
            <span className="text-[11px] font-semibold w-4 tabular-nums">{i + 1}.</span>
            <InkCheck state={p.done ? "done" : "open"} onToggle={() => store.togglePriority(p.id, !p.done)} />
            <span className={`flex-1 text-[12px] ${p.done ? "line-through text-muted" : "font-medium"}`}>
              {p.title}
            </span>
            <span className="row-actions">
              <RowBtn label="×" title="Excluir" danger onClick={() => store.deletePriority(p.id)} />
            </span>
          </div>
        ))}
        <div className="pt-1.5">
          {full ? (
            <p className="text-[10px] text-muted font-serif-note">
              Três é o limite — foco no que importa.
            </p>
          ) : (
            <AddInline
              placeholder="+ prioridade…"
              onAdd={(v) => store.addPriority({ workspace, title: v, date: today })}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export function TodayPanel({
  store,
  projects,
}: {
  store: AppStore;
  projects: Project[];
}) {
  const today = todayISO();
  // Folhas pendentes vencendo hoje ou atrasadas, dos projetos visíveis do workspace.
  const items: { task: Task; project: Project }[] = [];
  for (const project of projects) {
    for (const task of projectLeaves(store.tasks, project.id)) {
      if (!task.done && task.dueDate && task.dueDate <= today) {
        items.push({ task, project });
      }
    }
  }
  items.sort((a, b) => (a.task.dueDate! < b.task.dueDate! ? -1 : 1));

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar title="Hoje" right={<span>{items.length}</span>} />
      <div className="px-3 py-2">
        {items.length === 0 && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            Nada vencendo hoje. Respire.
          </p>
        )}
        {items.map(({ task, project }) => {
          const overdue = task.dueDate! < today;
          return (
            <div key={task.id} className="flex items-center gap-2 py-1 hairline-b">
              <InkCheck state="open" onToggle={() => store.toggleTask(task.id, true)} />
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] ${overdue ? "text-alert font-medium" : ""}`}>
                  {task.title}
                </span>
                <span className="block text-[9px] uppercase tracking-wider text-muted truncate">
                  {project.code} · {project.name}
                </span>
              </div>
              <span className={`text-[10px] tabular-nums ${overdue ? "text-alert font-semibold" : "text-muted"}`}>
                {overdue ? `⚠ ${fmtShort(task.dueDate!)}` : "hoje"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DayDemandsPanel({ store, workspace }: { store: AppStore; workspace: Workspace }) {
  const today = todayISO();
  const items = store.quickWins.filter(
    (q) => q.workspace === workspace && q.projectId === null && q.date === today
  );

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar title="Quick wins & demandas do dia" right={<span>{items.filter((i) => i.done).length}/{items.length}</span>} />
      <div className="px-3 py-2">
        {items.map((q) => (
          <div key={q.id} className="group-row flex items-center gap-2 py-1 hairline-b">
            <InkCheck state={q.done ? "done" : "open"} onToggle={() => store.toggleQuickWin(q.id, !q.done)} />
            <span className={`flex-1 text-[12px] ${q.done ? "line-through text-muted" : ""}`}>
              {q.title}
            </span>
            <span className="row-actions">
              <RowBtn label="×" title="Excluir" danger onClick={() => store.deleteQuickWin(q.id)} />
            </span>
          </div>
        ))}
        <div className="pt-1.5">
          <AddInline
            placeholder="+ nova demanda…"
            onAdd={(v) =>
              store.addQuickWin({ workspace, projectId: null, title: v, date: today })
            }
          />
        </div>
      </div>
    </section>
  );
}
