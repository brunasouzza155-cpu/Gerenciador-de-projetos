"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

// ── Date helpers (inline, no external libs) ─────────────────────────────────

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToDate(s: string): Date {
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

function addDaysToISO(date: string, n: number): string {
  const d = isoToDate(date);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 0 = Mon … 6 = Sun */
function getWeekdayIndex(s: string): number {
  const d = isoToDate(s);
  return (d.getDay() + 6) % 7;
}

function monthLabel(s: string): string {
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const [, m] = s.split("-").map(Number);
  return months[m - 1];
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex
  frequency: "daily" | "weekly" | "weekdays";
  completions: string[]; // YYYY-MM-DD[]
  createdAt: string;
}

const STORAGE_KEY = "habitos_data";

const FREQUENCY_LABELS: Record<Habit["frequency"], string> = {
  daily: "Diário",
  weekly: "Semanal",
  weekdays: "Dias úteis",
};

const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const PRESET_COLORS = [
  "#5B8C5A", // sage green
  "#7A6BAE", // muted violet
  "#C47A3A", // amber
  "#9C5148", // alert red
  "#3A7A8C", // teal
  "#8C7A3A", // gold
  "#5A7A8C", // steel blue
  "#8C5A7A", // mauve
];

// ── Storage helpers ──────────────────────────────────────────────────────────

function loadHabits(): Habit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Habit[];
  } catch {
    return [];
  }
}

function saveHabits(habits: Habit[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

// ── Streak calculation ───────────────────────────────────────────────────────

function calcStreak(habit: Habit, today: string): number {
  const set = new Set(habit.completions);
  let streak = 0;
  let cursor = today;

  // If today is not done, check if yesterday was done (streak still valid)
  // Streak = consecutive days going backwards from today (or yesterday if today not done)
  const todayDone = set.has(today);
  if (!todayDone) {
    cursor = addDaysToISO(today, -1);
    if (!set.has(cursor)) return 0;
  }

  while (set.has(cursor)) {
    streak++;
    cursor = addDaysToISO(cursor, -1);
  }
  return streak;
}

// ── Calendar grid (12 weeks × 7 days) ───────────────────────────────────────

interface CalendarDay {
  iso: string | null; // null = padding cell before first real day
  done: boolean;
}

function buildCalendarGrid(habit: Habit, today: string): CalendarDay[][] {
  // 84 days ending today; start = 83 days ago
  const startISO = addDaysToISO(today, -83);
  const completionSet = new Set(habit.completions);

  // Build a flat list of 84 days
  const days: CalendarDay[] = [];
  for (let i = 0; i < 84; i++) {
    const iso = addDaysToISO(startISO, i);
    days.push({ iso, done: completionSet.has(iso) });
  }

  // Group into weeks (columns). Each week = 7 rows (Mon..Sun).
  // Find what weekday startISO falls on
  const startWday = getWeekdayIndex(startISO); // 0=Mon
  // Pad front so first column starts at Monday
  const padded: (CalendarDay | null)[] = [
    ...Array(startWday).fill(null),
    ...days,
  ];

  // Split into columns of 7
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < 12; w++) {
    const col: CalendarDay[] = [];
    for (let r = 0; r < 7; r++) {
      const idx = w * 7 + r;
      const cell = padded[idx];
      col.push(cell ?? { iso: null, done: false });
    }
    weeks.push(col);
  }

  return weeks;
}

function getMonthSpans(weeks: CalendarDay[][]): { label: string; colSpan: number; startCol: number }[] {
  // For each week column, what month does the first non-null day belong to?
  const spans: { label: string; colSpan: number; startCol: number }[] = [];
  let currentLabel = "";
  let currentStart = 0;
  let currentSpan = 0;

  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w].find((d) => d.iso !== null);
    const label = firstDay?.iso ? monthLabel(firstDay.iso) : "";
    if (label !== currentLabel) {
      if (currentLabel) {
        spans.push({ label: currentLabel, colSpan: currentSpan, startCol: currentStart });
      }
      currentLabel = label;
      currentStart = w;
      currentSpan = 1;
    } else {
      currentSpan++;
    }
  }
  if (currentLabel) {
    spans.push({ label: currentLabel, colSpan: currentSpan, startCol: currentStart });
  }
  return spans;
}

// ── Add Habit Form ───────────────────────────────────────────────────────────

interface AddHabitFormProps {
  onAdd: (h: Habit) => void;
  onCancel: () => void;
}

function AddHabitForm({ onAdd, onCancel }: AddHabitFormProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✅");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [frequency, setFrequency] = useState<Habit["frequency"]>("daily");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const habit: Habit = {
      id: crypto.randomUUID(),
      name: name.trim(),
      emoji: emoji.trim() || "✅",
      color,
      frequency,
      completions: [],
      createdAt: todayISO(),
    };
    onAdd(habit);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-paper border border-hairline p-4 flex flex-col gap-3">
      <div className="section-bar">Novo hábito</div>

      <div className="grid grid-cols-[1fr_auto] gap-3 items-end pt-1">
        <div>
          <label className="block text-[9px] uppercase tracking-[0.18em] text-muted mb-1">
            Nome do hábito
          </label>
          <input
            className="ink-input"
            placeholder="ex: Meditar, Ler 20 min, Exercício…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="w-16">
          <label className="block text-[9px] uppercase tracking-[0.18em] text-muted mb-1">
            Emoji
          </label>
          <input
            className="ink-input text-center text-base"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
          />
        </div>
      </div>

      <div>
        <label className="block text-[9px] uppercase tracking-[0.18em] text-muted mb-2">
          Frequência
        </label>
        <div className="flex gap-2">
          {(["daily", "weekdays", "weekly"] as Habit["frequency"][]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`ink-btn text-[9px] ${frequency === f ? "ink-btn-solid" : ""}`}
            >
              {FREQUENCY_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[9px] uppercase tracking-[0.18em] text-muted mb-2">
          Cor
        </label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ background: c, width: 22, height: 22, border: color === c ? "2px solid var(--ink)" : "2px solid transparent", flexShrink: 0 }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-[22px] h-[22px] cursor-pointer border border-hairline bg-transparent p-0"
            title="Cor personalizada"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="ink-btn ink-btn-solid">
          Adicionar hábito
        </button>
        <button type="button" className="ink-btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Contribution Calendar ────────────────────────────────────────────────────

function ContributionCalendar({ habit, today }: { habit: Habit; today: string }) {
  const weeks = useMemo(() => buildCalendarGrid(habit, today), [habit, today]);
  const monthSpans = useMemo(() => getMonthSpans(weeks), [weeks]);

  const CELL_SIZE = 11;
  const CELL_GAP = 2;
  const ROW_LABEL_W = 26;
  const cellUnit = CELL_SIZE + CELL_GAP;

  return (
    <div className="overflow-x-auto">
      <div style={{ display: "inline-block", minWidth: "fit-content" }}>
        {/* Month labels row */}
        <div
          style={{
            display: "flex",
            paddingLeft: ROW_LABEL_W,
            gap: CELL_GAP,
            marginBottom: 3,
          }}
        >
          {monthSpans.map((span, i) => (
            <div
              key={i}
              style={{
                width: span.colSpan * cellUnit - CELL_GAP,
                fontSize: 9,
                color: "var(--muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                userSelect: "none",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {span.colSpan >= 2 ? span.label : ""}
            </div>
          ))}
        </div>

        {/* Grid: 7 rows × 12 cols */}
        <div style={{ display: "flex", gap: CELL_GAP }}>
          {/* Weekday label column */}
          <div style={{ display: "flex", flexDirection: "column", gap: CELL_GAP, width: ROW_LABEL_W }}>
            {WEEKDAY_NAMES.map((name, i) => (
              <div
                key={i}
                style={{
                  height: CELL_SIZE,
                  fontSize: 8,
                  color: "var(--muted)",
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 4,
                  userSelect: "none",
                }}
              >
                {/* Only show Mon, Wed, Fri, Sun to avoid cramping */}
                {[0, 2, 4, 6].includes(i) ? name : ""}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: CELL_GAP }}>
              {week.map((day, di) => {
                if (day.iso === null) {
                  return (
                    <div
                      key={di}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        background: "transparent",
                      }}
                    />
                  );
                }
                const isToday = day.iso === today;
                return (
                  <div
                    key={di}
                    title={day.iso}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background: day.done ? habit.color : "var(--hairline)",
                      opacity: day.done ? 1 : 0.6,
                      outline: isToday ? `1.5px solid var(--ink)` : undefined,
                      outlineOffset: isToday ? 1 : undefined,
                      cursor: "default",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Habit Card ───────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit;
  today: string;
  onToggleToday: (id: string) => void;
  onDelete: (id: string) => void;
}

function HabitCard({ habit, today, onToggleToday, onDelete }: HabitCardProps) {
  const streak = useMemo(() => calcStreak(habit, today), [habit, today]);
  const doneTodaySet = useMemo(() => new Set(habit.completions), [habit.completions]);
  const doneToday = doneTodaySet.has(today);
  const totalDone = habit.completions.length;

  return (
    <div className="bg-paper border border-hairline animate-fade-up">
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: habit.color,
              flexShrink: 0,
            }}
          />
          <span className="text-base leading-none" style={{ flexShrink: 0 }}>
            {habit.emoji}
          </span>
          <span className="text-[13px] font-medium truncate">{habit.name}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted border border-hairline px-1.5 py-0.5 ml-1 whitespace-nowrap flex-shrink-0">
            {FREQUENCY_LABELS[habit.frequency]}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Streak */}
          <div className="flex items-center gap-1" title="Sequência atual">
            <span className="text-[9px] uppercase tracking-wider text-muted">🔥</span>
            <span className="text-[12px] font-semibold" style={{ color: streak > 0 ? habit.color : "var(--muted)" }}>
              {streak}d
            </span>
          </div>

          {/* Total */}
          <div className="text-[9px] text-muted whitespace-nowrap hidden sm:block" title="Total de dias concluídos">
            {totalDone} total
          </div>

          {/* Mark done button */}
          <button
            className={`ink-btn text-[9px] ${doneToday ? "ink-btn-solid" : ""}`}
            style={doneToday ? { background: habit.color, borderColor: habit.color, color: "#FDFCFA" } : {}}
            onClick={() => onToggleToday(habit.id)}
            title={doneToday ? "Marcar como não feito hoje" : "Marcar como feito hoje"}
          >
            {doneToday ? "✓ feito" : "marcar feito"}
          </button>

          {/* Delete */}
          <button
            className="ink-btn text-[9px] text-alert border-alert hover:bg-alert hover:text-paper hover:border-alert"
            style={{ borderColor: "var(--alert)", color: "var(--alert)" }}
            onClick={() => {
              if (confirm(`Remover o hábito "${habit.name}"? Esta ação não pode ser desfeita.`)) {
                onDelete(habit.id);
              }
            }}
            title="Remover hábito"
          >
            ×
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="px-3 py-3">
        <ContributionCalendar habit={habit} today={today} />
      </div>

      {/* Footer stats */}
      <div
        className="px-3 py-2 flex items-center gap-4"
        style={{ borderTop: "1px solid var(--hairline)" }}
      >
        <span className="text-[9px] uppercase tracking-wider text-muted">
          Sequência atual:{" "}
          <span className="font-semibold" style={{ color: streak > 0 ? habit.color : "var(--muted)" }}>
            {streak} {streak === 1 ? "dia" : "dias"}
          </span>
        </span>
        <span className="text-[9px] uppercase tracking-wider text-muted">
          Total:{" "}
          <span className="font-semibold text-ink">{totalDone} {totalDone === 1 ? "dia" : "dias"}</span>
        </span>
        <span className="text-[9px] uppercase tracking-wider text-muted">
          Criado em:{" "}
          <span className="font-serif-note">{habit.createdAt}</span>
        </span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HabitosPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const today = useMemo(() => todayISO(), []);

  // Load from localStorage on mount
  useEffect(() => {
    setHabits(loadHabits());
    setMounted(true);
  }, []);

  // Persist whenever habits change (but not before mount)
  useEffect(() => {
    if (!mounted) return;
    saveHabits(habits);
  }, [habits, mounted]);

  function handleAdd(habit: Habit) {
    setHabits((prev) => [...prev, habit]);
    setShowForm(false);
  }

  function handleToggleToday(id: string) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const set = new Set(h.completions);
        if (set.has(today)) {
          set.delete(today);
        } else {
          set.add(today);
        }
        return { ...h, completions: Array.from(set).sort() };
      })
    );
  }

  function handleDelete(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  const totalDoneToday = useMemo(
    () => habits.filter((h) => h.completions.includes(today)).length,
    [habits, today]
  );

  if (!mounted) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center">
        <p className="text-[12px] font-serif-note text-muted">carregando hábitos…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-kraft">
      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 bg-paper border-b border-hairline flex items-center justify-between px-4 py-2"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <Link
          href="/"
          className="ink-btn text-[10px]"
          style={{ display: "inline-block" }}
        >
          ← Voltar
        </Link>

        <div className="text-center flex-1 mx-4">
          <h1 className="text-[11px] sm:text-[13px] font-semibold uppercase tracking-[0.28em]">
            🔄 Hábitos
          </h1>
          {habits.length > 0 && (
            <p className="text-[9px] font-serif-note text-muted mt-0.5">
              {totalDoneToday} de {habits.length} {habits.length === 1 ? "hábito" : "hábitos"} concluídos hoje
            </p>
          )}
        </div>

        <button
          className="ink-btn ink-btn-solid text-[10px]"
          onClick={() => setShowForm((f) => !f)}
        >
          {showForm ? "× cancelar" : "+ novo"}
        </button>
      </header>

      {/* Page content */}
      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8 flex flex-col gap-4">

        {/* Form to add habit */}
        {showForm && (
          <AddHabitForm
            onAdd={handleAdd}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Empty state */}
        {habits.length === 0 && !showForm && (
          <div className="bg-paper border border-hairline px-6 py-12 text-center">
            <p className="text-3xl mb-3">🌱</p>
            <p className="text-[14px] font-serif-note text-muted italic">
              Nenhum hábito registrado ainda.
            </p>
            <p className="text-[11px] text-muted mt-1 mb-5">
              Adicione um hábito para começar a rastrear seu progresso.
            </p>
            <button
              className="ink-btn ink-btn-solid"
              onClick={() => setShowForm(true)}
            >
              + Adicionar primeiro hábito
            </button>
          </div>
        )}

        {/* Today's progress bar */}
        {habits.length > 0 && (
          <div className="bg-paper border border-hairline px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-[0.18em] text-muted">
                Progresso de hoje
              </span>
              <span className="text-[11px] font-semibold">
                {totalDoneToday}/{habits.length}
              </span>
            </div>
            <div
              className="w-full bg-tan-soft"
              style={{ height: 4 }}
            >
              <div
                style={{
                  height: "100%",
                  width: habits.length > 0 ? `${(totalDoneToday / habits.length) * 100}%` : "0%",
                  background: totalDoneToday === habits.length ? "#5B8C5A" : "var(--ink)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            {totalDoneToday === habits.length && habits.length > 0 && (
              <p className="text-[10px] font-serif-note text-muted italic mt-1.5 text-center">
                ✨ Todos os hábitos concluídos hoje!
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        {habits.length > 0 && (
          <div
            className="flex items-center gap-2 px-1"
            style={{ opacity: 0.6 }}
          >
            <span className="text-[9px] uppercase tracking-wider text-muted">Calendário:</span>
            <div style={{ width: 10, height: 10, background: "var(--hairline)" }} />
            <span className="text-[9px] text-muted">não feito</span>
            <div style={{ width: 10, height: 10, background: "var(--ink)" }} />
            <span className="text-[9px] text-muted">feito (cor do hábito)</span>
            <div
              style={{
                width: 10,
                height: 10,
                background: "var(--hairline)",
                outline: "1.5px solid var(--ink)",
                outlineOffset: 1,
              }}
            />
            <span className="text-[9px] text-muted">hoje</span>
          </div>
        )}

        {/* Habit cards */}
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            today={today}
            onToggleToday={handleToggleToday}
            onDelete={handleDelete}
          />
        ))}

        {/* Footer */}
        {habits.length > 0 && (
          <footer className="pt-4 border-t border-hairline text-center">
            <p className="text-[10px] font-serif-note text-muted">
              "A consistência pequena diária vence o esforço grande e irregular."
            </p>
          </footer>
        )}
      </div>
    </main>
  );
}
