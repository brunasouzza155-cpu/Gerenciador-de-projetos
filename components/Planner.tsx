"use client";

import { useState } from "react";
import {
  addDays, addMonths, daysInMonth, fromISO, mondayOf, monthStart,
  MONTHS_PT, MONTHS_PT_SHORT, todayISO, WEEKDAYS_PT,
} from "@/lib/dates";
import { projectLeaves } from "@/lib/tree";
import { STATUS_META } from "@/lib/theme";
import type { AppStore } from "@/lib/store";
import type { Project, Task } from "@/lib/types";
import { SectionBar } from "./ui";

type View = "semana" | "mês" | "tri" | "semestre" | "ano";
const VIEWS: View[] = ["semana", "mês", "tri", "semestre", "ano"];

export function Planner({ store, projects }: { store: AppStore; projects: Project[] }) {
  const [view, setView] = useState<View>("semana");
  const [weekOffset, setWeekOffset] = useState(0);
  const today = todayISO();

  // Todas as folhas com data dos projetos visíveis.
  const dated: { task: Task; project: Project }[] = [];
  for (const project of projects) {
    for (const task of projectLeaves(store.tasks, project.id)) {
      if (task.dueDate) dated.push({ task, project });
    }
  }

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar title="Planner" />
      <div className="flex hairline-b">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 text-[9px] uppercase tracking-[0.15em] py-1.5 border-r border-hairline last:border-r-0 ${
              view === v ? "bg-tan font-semibold" : "text-muted hover:text-ink"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="px-3 py-2">
        {view === "semana" && (
          <WeekView
            dated={dated}
            today={today}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
          />
        )}
        {view === "mês" && <MonthView dated={dated} today={today} />}
        {view === "tri" && <TimelineView projects={projects} today={today} months={3} />}
        {view === "semestre" && <TimelineView projects={projects} today={today} months={6} />}
        {view === "ano" && <TimelineView projects={projects} today={today} months={12} />}
      </div>
    </section>
  );
}

// SEMANA: lista vertical seg→dom, hoje destacado, com navegação de semanas.
function WeekView({
  dated, today, weekOffset, onWeekChange,
}: {
  dated: { task: Task; project: Project }[];
  today: string;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
}) {
  const monday = addDays(mondayOf(today), weekOffset * 7);
  const sunday = addDays(monday, 6);
  const weekLabel =
    weekOffset === 0
      ? "Esta semana"
      : weekOffset === 1
      ? "Próxima semana"
      : weekOffset === -1
      ? "Semana passada"
      : `${monday.slice(8)}/${monday.slice(5, 7)} – ${sunday.slice(8)}/${sunday.slice(5, 7)}`;

  return (
    <div>
      {/* Navegação de semana */}
      <div className="flex items-center justify-between mb-2 -mx-1">
        <button
          className="ink-btn py-0.5 px-2 text-[10px]"
          onClick={() => onWeekChange(weekOffset - 1)}
          title="Semana anterior"
        >
          ←
        </button>
        <span className="text-[9px] uppercase tracking-[0.15em] text-muted">
          {weekLabel}
        </span>
        {weekOffset !== 0 ? (
          <button
            className="ink-btn py-0.5 px-2 text-[10px]"
            onClick={() => onWeekChange(0)}
            title="Voltar para esta semana"
          >
            hoje
          </button>
        ) : (
          <button
            className="ink-btn py-0.5 px-2 text-[10px]"
            onClick={() => onWeekChange(weekOffset + 1)}
            title="Próxima semana"
          >
            →
          </button>
        )}
      </div>

      {WEEKDAYS_PT.map((name, i) => {
        const day = addDays(monday, i);
        const isToday = day === today;
        const items = dated.filter((d) => d.task.dueDate === day);
        return (
          <div key={day} className={`flex gap-2 py-1 hairline-b ${isToday ? "bg-tan-soft -mx-1 px-1" : ""}`}>
            <div className="w-10 shrink-0">
              <span className={`text-[9px] uppercase tracking-wider ${isToday ? "font-bold" : "text-muted"}`}>
                {name}
              </span>
              <span className={`block text-[11px] tabular-nums ${isToday ? "font-bold" : ""}`}>
                {day.slice(8)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {items.length === 0 && <span className="text-[10px] text-hairline">—</span>}
              {items.map(({ task, project }) => (
                <div key={task.id} className="text-[11px] leading-snug truncate">
                  <span className={task.done ? "line-through text-muted" : !task.done && day < today ? "text-alert" : ""}>
                    {task.title}
                  </span>
                  <span className="text-[9px] text-muted">
                    {" · "}{project.code ? `${project.code} · ${project.name}` : project.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// MÊS: mini calendário em grade de linhas finas.
function MonthView({ dated, today }: { dated: { task: Task; project: Project }[]; today: string }) {
  const first = monthStart(today);
  const total = daysInMonth(today);
  const firstDow = (fromISO(first).getDay() + 6) % 7; // 0 = segunda
  const cells: (string | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: total }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const pendingDays = new Set(
    dated.filter((d) => !d.task.done).map((d) => d.task.dueDate!)
  );

  const d = fromISO(today);
  return (
    <div>
      <div className="text-center text-[10px] uppercase tracking-[0.25em] mb-1.5">
        {MONTHS_PT[d.getMonth()]} {d.getFullYear()}
      </div>
      <div className="grid grid-cols-7 border-t border-l border-hairline">
        {WEEKDAYS_PT.map((w) => (
          <div key={w} className="text-center text-[8px] uppercase tracking-wider text-muted py-0.5 border-r border-b border-hairline">
            {w[0]}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square border-r border-b border-hairline" />;
          const isToday = day === today;
          const has = pendingDays.has(day);
          const late = has && day < today;
          return (
            <div
              key={i}
              className={`aspect-square border-r border-b border-hairline flex flex-col items-center justify-center text-[10px] tabular-nums ${
                isToday ? "bg-ink text-paper font-bold" : has ? "bg-tan-soft" : ""
              }`}
              title={has ? "Há entrega pendente neste dia" : undefined}
            >
              {Number(day.slice(8))}
              {has && (
                <span
                  className="block w-1 h-1 mt-0.5"
                  style={{ background: late ? "#9C5148" : isToday ? "#FAF8F3" : "#1C1B18" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// TRI / SEMESTRE / ANO: linha do tempo horizontal por projeto.
function TimelineView({
  projects,
  today,
  months,
}: {
  projects: Project[];
  today: string;
  months: number;
}) {
  const start = monthStart(today);
  const cols = Array.from({ length: months }, (_, i) => addMonths(start, i));
  const end = addMonths(start, months);

  const active = projects.filter((p) => p.startDate || p.dueDate);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[280px]">
        {/* Cabeçalho de meses */}
        <div className="flex hairline-b pb-0.5 mb-1">
          <div className="w-16 shrink-0" />
          {cols.map((m) => (
            <div key={m} className="flex-1 text-center text-[8px] uppercase tracking-wider text-muted">
              {MONTHS_PT_SHORT[fromISO(m).getMonth()]}
            </div>
          ))}
        </div>
        {active.map((p) => {
          const meta = STATUS_META[p.status];
          const ps = p.startDate ?? p.dueDate!;
          const pe = p.dueDate ?? p.startDate!;
          const dueMonth = p.dueDate ? monthStart(p.dueDate) : null;
          return (
            <div key={p.id} className="flex items-center py-1 hairline-b">
              <div className="w-16 shrink-0 text-[9px] uppercase tracking-wider truncate" title={p.name}>
                {p.code}
              </div>
              {cols.map((m) => {
                const mEnd = addMonths(m, 1);
                const inRange = ps < mEnd && pe >= m; // projeto atravessa este mês
                const isDue = dueMonth === m; // mês da entrega: cor cheia
                return (
                  <div key={m} className="flex-1 h-3 border-r border-hairline last:border-r-0 px-[1px] flex items-center">
                    {inRange && (
                      <div
                        className="w-full"
                        style={{
                          height: isDue ? 10 : 4,
                          background: meta.color,
                          opacity: isDue ? 1 : 0.45,
                        }}
                        title={isDue ? `Entrega: ${p.name}` : p.name}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {active.some((p) => p.dueDate && monthStart(p.dueDate) >= end) && (
          <p className="text-[9px] text-muted font-serif-note pt-1">
            * projetos com entrega além do período mostram só a barra do andamento.
          </p>
        )}
      </div>
    </div>
  );
}
