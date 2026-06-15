"use client";

import { useState } from "react";
import {
  addDays, addMonths, daysInMonth, fromISO, mondayOf, monthStart,
  MONTHS_PT, MONTHS_PT_SHORT, todayISO, WEEKDAYS_PT,
} from "@/lib/dates";
import { projectLeaves } from "@/lib/tree";
import { STATUS_META } from "@/lib/theme";
import type { AppStore } from "@/lib/store";
import type { Project, Task, TaskTag } from "@/lib/types";
import { SectionBar } from "./ui";

type View = "semana" | "mês" | "tri" | "semestre" | "ano";
const VIEWS: View[] = ["semana", "mês", "tri", "semestre", "ano"];

type ItemTag = TaskTag | "quickwin";

interface CalendarItem {
  id: string;
  title: string;
  projectLabel: string;
  tag: ItemTag;
  done: boolean;
  date: string;
}

const TAG_META: Record<string, { label: string; bg: string; color: string }> = {
  rapida:         { label: "RÁPIDA",    bg: "#EFE5D4", color: "#8C7D65" },
  acompanhamento: { label: "ACOMP.",    bg: "#E8EEF4", color: "#51677F" },
  atividade:      { label: "ATIVIDADE", bg: "#E8F4EC", color: "#4D6B57" },
  agenda:         { label: "AGENDA",    bg: "#F0E8F4", color: "#6B4D7F" },
  quickwin:       { label: "WIN",       bg: "#FFF3CD", color: "#8C6D00" },
};

function buildCalendarItems(store: AppStore, projects: Project[]): CalendarItem[] {
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const items: CalendarItem[] = [];

  const childIds = new Set(store.tasks.filter((t) => t.parentId !== null).map((t) => t.parentId!));

  for (const task of store.tasks) {
    const project = projectMap.get(task.projectId);
    if (!project) continue;
    const label = project.code ? `${project.code} · ${project.name}` : project.name;

    if (task.tag === "acompanhamento") {
      if (task.tagDueDate) {
        items.push({ id: task.id, title: task.title, projectLabel: label, tag: "acompanhamento", done: task.done, date: task.tagDueDate });
      }
    } else if (task.tag) {
      // atividade, rapida, agenda — use dueDate
      if (task.dueDate) {
        items.push({ id: task.id, title: task.title, projectLabel: label, tag: task.tag, done: task.done, date: task.dueDate });
      }
    } else if (task.dueDate && !childIds.has(task.id)) {
      // Untagged leaf tasks — original behaviour
      items.push({ id: task.id, title: task.title, projectLabel: label, tag: null, done: task.done, date: task.dueDate });
    }
  }

  // Quick wins with a calendar date
  for (const qw of store.quickWins) {
    if (!qw.date) continue;
    const project = qw.projectId ? projectMap.get(qw.projectId) : null;
    const label = project ? (project.code ? `${project.code} · ${project.name}` : project.name) : "";
    items.push({ id: `qw-${qw.id}`, title: qw.title, projectLabel: label, tag: "quickwin", done: qw.done, date: qw.date });
  }

  return items;
}

export function Planner({ store, projects }: { store: AppStore; projects: Project[] }) {
  const [view, setView] = useState<View>("semana");
  const [weekOffset, setWeekOffset] = useState(0);
  const today = todayISO();

  const calendarItems = buildCalendarItems(store, projects);

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
            items={calendarItems}
            today={today}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
          />
        )}
        {view === "mês" && <MonthView items={calendarItems} today={today} />}
        {view === "tri" && <TimelineView projects={projects} today={today} months={3} />}
        {view === "semestre" && <TimelineView projects={projects} today={today} months={6} />}
        {view === "ano" && <TimelineView projects={projects} today={today} months={12} />}
      </div>
    </section>
  );
}

// SEMANA: lista vertical seg→dom com badges de tag e navegação de semanas.
function WeekView({
  items, today, weekOffset, onWeekChange,
}: {
  items: CalendarItem[];
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
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] uppercase tracking-[0.15em] text-muted">
            {weekLabel}
          </span>
          {weekOffset !== 0 && (
            <button
              className="text-[8px] text-muted underline hover:text-ink leading-none"
              onClick={() => onWeekChange(0)}
              title="Voltar para esta semana"
            >
              ir para hoje
            </button>
          )}
        </div>
        <button
          className="ink-btn py-0.5 px-2 text-[10px]"
          onClick={() => onWeekChange(weekOffset + 1)}
          title="Próxima semana"
        >
          →
        </button>
      </div>

      {WEEKDAYS_PT.map((name, i) => {
        const day = addDays(monday, i);
        const isToday = day === today;
        const dayItems = items.filter((item) => item.date === day);
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
            <div className="flex-1 min-w-0 space-y-0.5">
              {dayItems.length === 0 && <span className="text-[10px] text-hairline">—</span>}
              {dayItems.map((item) => {
                const isOverdue = !item.done && item.date < today;
                const tagMeta = item.tag ? TAG_META[item.tag] : null;
                return (
                  <div key={item.id} className="flex items-baseline gap-1 flex-wrap leading-snug">
                    {tagMeta && (
                      <span
                        className="text-[8px] font-semibold tracking-[0.08em] px-1 py-[1px] rounded-[2px] shrink-0"
                        style={{ background: tagMeta.bg, color: tagMeta.color }}
                      >
                        {tagMeta.label}
                      </span>
                    )}
                    <span
                      className={`text-[11px] truncate ${
                        item.done ? "line-through text-muted" : isOverdue ? "text-alert" : ""
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.projectLabel && (
                      <span className="text-[9px] text-muted shrink-0">
                        · {item.projectLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// MÊS: mini calendário em grade de linhas finas.
function MonthView({ items, today }: { items: CalendarItem[]; today: string }) {
  const first = monthStart(today);
  const total = daysInMonth(today);
  const firstDow = (fromISO(first).getDay() + 6) % 7; // 0 = segunda
  const cells: (string | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: total }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const pendingDays = new Set(
    items.filter((item) => !item.done).map((item) => item.date)
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
                const inRange = ps < mEnd && pe >= m;
                const isDue = dueMonth === m;
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
