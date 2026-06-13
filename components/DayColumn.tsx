"use client";

import { fmtShort, todayISO } from "@/lib/dates";
import { projectLeaves } from "@/lib/tree";
import type { AppStore } from "@/lib/store";
import type { Project, Task, Workspace } from "@/lib/types";
import { AddInline, InkCheck, RowBtn, SectionBar } from "./ui";

export function PrioritiesPanel({
  store,
  workspace,
  viewDate,
}: {
  store: AppStore;
  workspace: Workspace;
  viewDate: string;
}) {
  const items = store.priorities.filter(
    (p) => p.workspace === workspace && p.date === viewDate
  );
  const full = items.length >= 3;

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar
        title="Prioridades e Urgências"
        right={<span>{items.length}/3</span>}
      />
      <div className="px-3 py-2">
        {items.length === 0 && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            O que faria o dia valer a pena?
          </p>
        )}
        {items.map((p, i) => (
          <div
            key={p.id}
            className="group-row flex items-center gap-2 py-1 hairline-b"
          >
            <span className="text-[11px] font-semibold w-4 tabular-nums">
              {i + 1}.
            </span>
            <InkCheck
              state={p.done ? "done" : "open"}
              onToggle={() => store.togglePriority(p.id, !p.done)}
            />
            <span
              className={`flex-1 text-[12px] ${
                p.done ? "line-through text-muted" : "font-medium"
              }`}
            >
              {p.title}
            </span>
            <span className="row-actions">
              <RowBtn
                label="×"
                title="Excluir"
                danger
                onClick={() => store.deletePriority(p.id)}
              />
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
              placeholder="+ prioridade ou urgência…"
              onAdd={(v) =>
                store.addPriority({ workspace, title: v, date: viewDate })
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

export function TodayPanel({
  store,
  workspace,
  projects,
  viewDate,
}: {
  store: AppStore;
  workspace: Workspace;
  projects: Project[];
  viewDate: string;
}) {
  const today = todayISO();
  const isToday = viewDate === today;

  // Tarefas-folha pendentes: se for "hoje" mostra vencidas até hoje; senão só o dia exato.
  const taskItems: { task: Task; project: Project; kind: "task" }[] = [];
  for (const project of projects) {
    for (const task of projectLeaves(store.tasks, project.id)) {
      const due = task.dueDate;
      if (!due || task.done) continue;
      const matches = isToday ? due <= viewDate : due === viewDate;
      if (matches) taskItems.push({ task, project, kind: "task" });
    }
  }
  taskItems.sort((a, b) =>
    a.task.dueDate! < b.task.dueDate! ? -1 : 1
  );

  // Acompanhamentos com data de validação vencendo no dia visualizado.
  const followupsDue = store.followups.filter(
    (f) =>
      !f.done &&
      f.workspace === workspace &&
      f.validationDate &&
      (isToday ? f.validationDate <= viewDate : f.validationDate === viewDate)
  );

  const total = taskItems.length + followupsDue.length;

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar title="Hoje" right={<span>{total}</span>} />
      <div className="px-3 py-2">
        {total === 0 && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            {isToday ? "Nada vencendo hoje. Respire." : "Nenhuma tarefa neste dia."}
          </p>
        )}

        {taskItems.map(({ task, project }) => {
          const overdue = task.dueDate! < today;
          return (
            <div
              key={task.id}
              className="flex items-center gap-2 py-1 hairline-b"
            >
              <InkCheck
                state="open"
                onToggle={() => store.toggleTask(task.id, true)}
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`text-[12px] ${
                    overdue ? "text-alert font-medium" : ""
                  }`}
                >
                  {task.title}
                </span>
                <span className="block text-[9px] uppercase tracking-wider text-muted truncate">
                  {project.code} · {project.name}
                </span>
              </div>
              <span
                className={`text-[10px] tabular-nums ${
                  overdue ? "text-alert font-semibold" : "text-muted"
                }`}
              >
                {overdue ? `⚠ ${fmtShort(task.dueDate!)}` : "hoje"}
              </span>
            </div>
          );
        })}

        {followupsDue.map((f) => {
          const late = f.validationDate! < today;
          return (
            <div
              key={f.id}
              className="flex items-center gap-2 py-1 hairline-b"
            >
              <InkCheck
                state="open"
                onToggle={() => store.updateFollowup(f.id, { done: true })}
                title="Dar baixa"
              />
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] ${late ? "text-alert font-medium" : ""}`}>
                  Validar: {f.what}
                </span>
                <span className="block text-[9px] uppercase tracking-wider text-muted truncate">
                  👁 acompanhamento · {f.who}
                </span>
              </div>
              <span
                className={`text-[10px] tabular-nums ${
                  late ? "text-alert font-semibold" : "text-muted"
                }`}
              >
                {late ? `⚠ ${fmtShort(f.validationDate!)}` : "hoje"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// "Tarefas Rápidas" — quick wins do dia (manuais ou de projetos com data)
// + tarefas da cascata tagadas como "rapida" (apenas no dia atual).
export function DayDemandsPanel({
  store,
  workspace,
  projects,
  viewDate,
}: {
  store: AppStore;
  workspace: Workspace;
  projects: Project[];
  viewDate: string;
}) {
  const today = todayISO();
  const isToday = viewDate === today;

  // Quick wins manuais (sem projeto) agendados para o dia.
  const workspaceItems = store.quickWins.filter(
    (q) => q.workspace === workspace && q.projectId === null && q.date === viewDate
  );

  // Quick wins de projetos com data agendada para o dia.
  const projectIds = new Set(projects.map((p) => p.id));
  const projectItems = store.quickWins.filter(
    (q) =>
      q.workspace === workspace &&
      q.projectId !== null &&
      projectIds.has(q.projectId) &&
      q.date === viewDate
  );

  // Tarefas tagadas como "rapida" — só exibe no dia atual.
  const rapidaTasks = isToday
    ? store.tasks.filter(
        (t) => !t.done && t.tag === "rapida" && projectIds.has(t.projectId)
      )
    : [];

  const doneCount =
    workspaceItems.filter((q) => q.done).length +
    projectItems.filter((q) => q.done).length;
  const total = workspaceItems.length + projectItems.length + rapidaTasks.length;

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar
        title="Tarefas Rápidas"
        right={<span>{doneCount}/{total}</span>}
      />
      <div className="px-3 py-2">
        {/* Tarefas da cascata tagadas como rápidas (só hoje) */}
        {rapidaTasks.map((t) => {
          const proj = projects.find((p) => p.id === t.projectId);
          return (
            <div
              key={t.id}
              className="flex items-center gap-2 py-1 hairline-b"
            >
              <InkCheck
                state="open"
                onToggle={() => store.toggleTask(t.id, true)}
                title="Concluir"
              />
              <span className="flex-1 text-[12px]">{t.title}</span>
              {proj && (
                <span className="text-[9px] uppercase tracking-wider text-muted">
                  {proj.code}
                </span>
              )}
              <span
                className="text-[8px] uppercase tracking-wider px-1 py-0.5 font-medium"
                style={{ background: "#EFE5D4", color: "#8C8578" }}
              >
                RÁPIDA
              </span>
            </div>
          );
        })}

        {/* Quick wins de projetos agendados para este dia */}
        {projectItems.map((q) => {
          const proj = projects.find((p) => p.id === q.projectId);
          return (
            <div
              key={q.id}
              className="group-row flex items-center gap-2 py-1 hairline-b"
            >
              <InkCheck
                state={q.done ? "done" : "open"}
                onToggle={() => store.toggleQuickWin(q.id, !q.done)}
              />
              <span className={`flex-1 text-[12px] ${q.done ? "line-through text-muted" : ""}`}>
                {q.title}
              </span>
              {proj && (
                <span className="text-[9px] uppercase tracking-wider text-muted shrink-0">
                  {proj.code}
                </span>
              )}
              <span className="row-actions">
                <RowBtn
                  label="×"
                  title="Excluir"
                  danger
                  onClick={() => store.deleteQuickWin(q.id)}
                />
              </span>
            </div>
          );
        })}

        {/* Quick wins manuais do workspace */}
        {workspaceItems.map((q) => (
          <div
            key={q.id}
            className="group-row flex items-center gap-2 py-1 hairline-b"
          >
            <InkCheck
              state={q.done ? "done" : "open"}
              onToggle={() => store.toggleQuickWin(q.id, !q.done)}
            />
            <span
              className={`flex-1 text-[12px] ${
                q.done ? "line-through text-muted" : ""
              }`}
            >
              {q.title}
            </span>
            <span className="row-actions">
              <RowBtn
                label="×"
                title="Excluir"
                danger
                onClick={() => store.deleteQuickWin(q.id)}
              />
            </span>
          </div>
        ))}

        {total === 0 && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            {isToday ? "Nenhuma tarefa rápida para hoje." : "Nenhuma tarefa rápida neste dia."}
          </p>
        )}

        <div className="pt-1.5">
          <AddInline
            placeholder="+ tarefa rápida do dia…"
            onAdd={(v) =>
              store.addQuickWin({
                workspace,
                projectId: null,
                title: v,
                date: viewDate,
              })
            }
          />
        </div>
      </div>
    </section>
  );
}
