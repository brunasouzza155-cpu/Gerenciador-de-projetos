"use client";

import { useState } from "react";
import { fmtFull, fromISO, MONTHS_PT, monthStart, todayISO } from "@/lib/dates";
import { projectLeaves, projectProgress } from "@/lib/tree";
import { fmtBRL } from "@/lib/theme";
import type { AppStore } from "@/lib/store";
import type { Project, Task, Workspace } from "@/lib/types";
import { SectionBar } from "./ui";

// Coluna 3 (parte de baixo): próximas entregas + resumo do portfólio.

export function UpcomingPanel({
  store,
  projects,
}: {
  store: AppStore;
  projects: Project[];
}) {
  const today = todayISO();
  const items: { task: Task; project: Project }[] = [];
  for (const project of projects) {
    for (const task of projectLeaves(store.tasks, project.id)) {
      if (!task.done && task.dueDate && task.dueDate >= today) {
        items.push({ task, project });
      }
    }
  }
  items.sort((a, b) => (a.task.dueDate! < b.task.dueDate! ? -1 : 1));
  const top = items.slice(0, 7);

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar title="Próximas entregas" />
      <div className="px-3 py-2">
        {top.length === 0 && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            Sem entregas futuras com data.
          </p>
        )}
        {top.map(({ task, project }) => (
          <div key={task.id} className="flex items-baseline gap-2 py-1 hairline-b">
            <span className={`text-[10px] tabular-nums w-12 shrink-0 ${task.dueDate === today ? "font-bold" : "text-muted"}`}>
              {fmtFull(task.dueDate!)}
            </span>
            <span className="flex-1 text-[11px] leading-snug min-w-0 truncate">{task.title}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted shrink-0">{project.code}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Card de resumo com borda preta grossa, estilo "TOTAL SAVINGS".
export function SummaryPanel({
  store,
  workspace,
  projects,
}: {
  store: AppStore;
  workspace: Workspace;
  projects: Project[];
}) {
  const month = monthStart(todayISO());
  const goal = store.goals.find((g) => g.workspace === workspace && g.month === month);
  const [editing, setEditing] = useState(false);
  const [goalText, setGoalText] = useState(goal?.goal ?? "");
  const [howText, setHowText] = useState(goal?.how ?? "");

  const active = projects.filter(
    (p) => p.status !== "concluido" && p.status !== "cancelado"
  );
  const avg =
    active.length === 0
      ? 0
      : Math.round(
          active.reduce((sum, p) => sum + projectProgress(store.tasks, p.id), 0) /
            active.length
        );
  const gains = projects.reduce((s, p) => s + (p.gains ?? 0), 0);
  const fte = projects.reduce((s, p) => s + (p.fte ?? 0), 0);
  const monthName = MONTHS_PT[fromISO(month).getMonth()];

  return (
    <section className="bg-paper border-2 border-ink">
      <SectionBar title="Resumo do portfólio" />
      <div className="px-3 py-2">
        <Row label="Projetos ativos" value={String(active.length)} />
        <Row label="Progresso médio" value={`${avg}%`} />
        <Row label="Ganhos somados" value={gains > 0 ? fmtBRL(gains) : "—"} />
        <Row label="FTE somado" value={fte > 0 ? fte.toFixed(1) : "—"} />

        <div className="mt-2 pt-2 border-t-2 border-ink">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.2em] font-semibold">
              Meta de {monthName}
            </span>
            <button
              className="text-[9px] uppercase tracking-wider text-muted underline underline-offset-2"
              onClick={() => {
                setGoalText(goal?.goal ?? "");
                setHowText(goal?.how ?? "");
                setEditing(!editing);
              }}
            >
              {editing ? "fechar" : "editar"}
            </button>
          </div>
          {editing ? (
            <form
              className="mt-1.5 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                store.saveGoal({ workspace, month, goal: goalText.trim(), how: howText.trim() });
                setEditing(false);
              }}
            >
              <input
                className="ink-input"
                placeholder="qual é a meta do mês?"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                autoFocus
              />
              <textarea
                className="ink-input"
                rows={2}
                placeholder="como alcançar?"
                value={howText}
                onChange={(e) => setHowText(e.target.value)}
              />
              <button type="submit" className="ink-btn ink-btn-solid self-end">salvar</button>
            </form>
          ) : goal && goal.goal ? (
            <div className="mt-1">
              <p className="text-[12px] font-medium leading-snug">{goal.goal}</p>
              {goal.how && (
                <p className="text-[11px] font-serif-note text-muted leading-snug mt-0.5">
                  {goal.how}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] font-serif-note text-muted mt-1">
              Sem meta definida para este mês.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 hairline-b">
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}
