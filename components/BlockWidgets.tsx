"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { todayISO, fmtShort, fmtLong, addDays } from "@/lib/dates";

// ── Helper ────────────────────────────────────────────────────────────────────
function isoToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dateDiffDays(a: string, b: string) {
  return Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / 86400000);
}

// ── Clock ─────────────────────────────────────────────────────────────────────
export function ClockWidget() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="bg-paper border border-hairline px-3 py-4 text-center">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">🕐 Relógio</div>
      <p className="text-[28px] font-mono tracking-widest text-ink">{time || "00:00:00"}</p>
      <p className="text-[10px] text-muted mt-1 font-serif-note">{fmtLong(todayISO())}</p>
    </div>
  );
}

// ── Quote of the Day ──────────────────────────────────────────────────────────
const QUOTES = [
  { text: "A disciplina é a ponte entre metas e conquistas.", author: "Jim Rohn" },
  { text: "Comece onde você está. Use o que você tem. Faça o que você pode.", author: "Arthur Ashe" },
  { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
  { text: "Não espere por uma crise para descobrir o que é importante na sua vida.", author: "Platão" },
  { text: "A persistência realiza o impossível.", author: "Provérbio" },
  { text: "Foco no processo, não no resultado.", author: "Anônimo" },
  { text: "Um passo de cada vez ainda te leva aonde você quer ir.", author: "Anônimo" },
  { text: "Planeje seu trabalho e trabalhe seu plano.", author: "Napoleon Hill" },
  { text: "Organização é a arte de criar espaço para o que realmente importa.", author: "Anônimo" },
  { text: "Produtividade não é sobre fazer mais coisas — é sobre fazer as coisas certas.", author: "Cal Newport" },
  { text: "O tempo que você aproveita desperdiçando não é tempo desperdiçado.", author: "Bertrand Russell" },
  { text: "Cada dia é uma nova oportunidade de fazer melhor.", author: "Anônimo" },
];

export function QuoteWidget() {
  const quote = useMemo(() => {
    const dayOfYear = Math.floor(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return QUOTES[dayOfYear % QUOTES.length];
  }, []);
  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">💬 Frase do Dia</div>
      <p className="text-[12px] font-serif-note leading-relaxed text-ink italic">
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className="text-[10px] text-muted mt-2 text-right">— {quote.author}</p>
    </div>
  );
}

// ── Water Tracker ─────────────────────────────────────────────────────────────
const WATER_KEY = "water_tracker";
interface WaterData { date: string; glasses: number; goal: number; }

export function WaterTrackerWidget() {
  const [data, setData] = useState<WaterData>({ date: todayISO(), glasses: 0, goal: 8 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATER_KEY);
      if (raw) {
        const saved: WaterData = JSON.parse(raw);
        if (saved.date === todayISO()) setData(saved);
        else setData({ date: todayISO(), glasses: 0, goal: saved.goal });
      }
    } catch {}
  }, []);

  const save = (d: WaterData) => {
    setData(d);
    try { localStorage.setItem(WATER_KEY, JSON.stringify(d)); } catch {}
  };

  const pct = Math.min(100, Math.round((data.glasses / data.goal) * 100));

  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">💧 Hidratação</div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold">{data.glasses} / {data.goal} copos</span>
        <span className="text-[10px] text-muted">{pct}%</span>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-hairline rounded-full overflow-hidden mb-3">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: "var(--tan)" }}
        />
      </div>
      {/* Glass grid */}
      <div className="flex flex-wrap gap-1 mb-3">
        {Array.from({ length: data.goal }).map((_, i) => (
          <button
            key={i}
            onClick={() => save({ ...data, glasses: i < data.glasses ? i : i + 1 })}
            title={i < data.glasses ? "Desmarcar" : "Beber"}
            className={`text-[16px] transition-all ${i < data.glasses ? "opacity-100" : "opacity-25 hover:opacity-60"}`}
          >
            💧
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          className="ink-btn text-[10px] flex-1"
          onClick={() => save({ ...data, glasses: Math.max(0, data.glasses - 1) })}
        >
          − copo
        </button>
        <button
          className="ink-btn ink-btn-solid text-[10px] flex-1"
          onClick={() => save({ ...data, glasses: Math.min(data.goal, data.glasses + 1) })}
        >
          + copo
        </button>
      </div>
      {data.glasses >= data.goal && (
        <p className="text-[10px] text-center mt-2 font-serif-note text-muted">
          ✓ Meta de hidratação atingida!
        </p>
      )}
    </div>
  );
}

// ── Habits Widget (compact) ───────────────────────────────────────────────────
const HABITS_KEY = "habitos_data";
interface HabitEntry { id: string; name: string; emoji: string; color: string; completions: string[]; }

export function HabitsWidget() {
  const [habits, setHabits] = useState<HabitEntry[]>([]);
  const today = todayISO();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HABITS_KEY);
      if (raw) setHabits(JSON.parse(raw));
    } catch {}
  }, []);

  const toggle = (id: string) => {
    setHabits((hs) => {
      const updated = hs.map((h) => {
        if (h.id !== id) return h;
        const done = h.completions.includes(today);
        return {
          ...h,
          completions: done
            ? h.completions.filter((d) => d !== today)
            : [...h.completions, today],
        };
      });
      try { localStorage.setItem(HABITS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  if (habits.length === 0) {
    return (
      <div className="bg-paper border border-hairline px-3 py-4">
        <div className="section-bar -mx-3 -mt-4 mb-3 px-3">🔄 Hábitos</div>
        <p className="text-[11px] text-muted font-serif-note text-center py-2">
          Nenhum hábito cadastrado.{" "}
          <a href="/habitos" className="underline hover:text-ink">Criar hábitos</a>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">🔄 Hábitos</div>
      <div className="space-y-1.5">
        {habits.map((h) => {
          const done = h.completions.includes(today);
          // Streak: count consecutive days ending today
          let streak = 0;
          let d = today;
          while (h.completions.includes(d)) {
            streak++;
            d = addDays(d, -1);
          }
          return (
            <div key={h.id} className="flex items-center gap-2">
              <button
                onClick={() => toggle(h.id)}
                className={`w-5 h-5 border flex items-center justify-center text-[10px] transition-all flex-shrink-0 ${
                  done ? "border-ink bg-ink text-paper" : "border-hairline hover:border-ink"
                }`}
              >
                {done ? "✓" : ""}
              </button>
              <span className="text-[13px]">{h.emoji}</span>
              <span className={`flex-1 text-[12px] ${done ? "line-through text-muted" : ""}`}>{h.name}</span>
              {streak > 0 && (
                <span className="text-[9px] text-muted border border-hairline px-1">
                  🔥 {streak}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <a href="/habitos" className="mt-2 block text-[9px] text-muted text-right hover:text-ink">
        gerenciar hábitos →
      </a>
    </div>
  );
}

// ── Countdown ─────────────────────────────────────────────────────────────────
const COUNTDOWN_KEY = "countdown_data";
interface CountdownEvent { id: string; name: string; emoji: string; date: string; }

export function CountdownWidget() {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", emoji: "⏳", date: "" });
  const today = todayISO();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COUNTDOWN_KEY);
      if (raw) setEvents(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (updated: CountdownEvent[]) => {
    setEvents(updated);
    try { localStorage.setItem(COUNTDOWN_KEY, JSON.stringify(updated)); } catch {}
  };

  const upcoming = events
    .map((e) => ({ ...e, days: dateDiffDays(today, e.date) }))
    .filter((e) => e.days >= 0)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">⏳ Contagem Regressiva</div>
      {upcoming.length === 0 && !adding && (
        <p className="text-[11px] text-muted font-serif-note text-center py-1">
          Nenhum evento cadastrado.
        </p>
      )}
      <div className="space-y-2 mb-2">
        {upcoming.map((e) => (
          <div key={e.id} className="flex items-center gap-2 border border-hairline px-2 py-1.5">
            <span className="text-[16px]">{e.emoji}</span>
            <div className="flex-1">
              <p className="text-[11px] font-medium">{e.name}</p>
              <p className="text-[9px] text-muted">{fmtShort(e.date)}</p>
            </div>
            <div className="text-right">
              <p className="text-[16px] font-semibold leading-none">{e.days}</p>
              <p className="text-[8px] text-muted">{e.days === 1 ? "dia" : "dias"}</p>
            </div>
            <button
              className="text-[10px] text-muted hover:text-alert"
              onClick={() => save(events.filter((ev) => ev.id !== e.id))}
            >×</button>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="border border-hairline p-2 space-y-1.5">
          <div className="flex gap-1.5">
            <input
              className="ink-input w-10 text-center"
              value={form.emoji}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              maxLength={2}
            />
            <input
              className="ink-input flex-1"
              placeholder="Nome do evento…"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <input
            type="date"
            className="ink-input w-full"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <div className="flex gap-1.5">
            <button
              className="ink-btn ink-btn-solid flex-1 text-[10px]"
              disabled={!form.name || !form.date}
              onClick={() => {
                save([...events, { id: `ev_${Date.now()}`, ...form }]);
                setForm({ name: "", emoji: "⏳", date: "" });
                setAdding(false);
              }}
            >
              adicionar
            </button>
            <button className="ink-btn text-[10px]" onClick={() => setAdding(false)}>cancelar</button>
          </div>
        </div>
      ) : (
        <button className="w-full ink-btn text-[10px]" onClick={() => setAdding(true)}>
          + novo evento
        </button>
      )}
    </div>
  );
}

// ── Shopping List ─────────────────────────────────────────────────────────────
const SHOPPING_KEY = "shopping_list";
interface ShoppingItem { id: string; name: string; done: boolean; }

export function ShoppingWidget() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHOPPING_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (updated: ShoppingItem[]) => {
    setItems(updated);
    try { localStorage.setItem(SHOPPING_KEY, JSON.stringify(updated)); } catch {}
  };

  const add = () => {
    const name = input.trim();
    if (!name) return;
    save([...items, { id: `sh_${Date.now()}`, name, done: false }]);
    setInput("");
  };

  const toggle = (id: string) =>
    save(items.map((i) => i.id === id ? { ...i, done: !i.done } : i));

  const remove = (id: string) => save(items.filter((i) => i.id !== id));

  const clearDone = () => save(items.filter((i) => !i.done));

  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">🛒 Lista de Compras</div>
      <div className="space-y-1 mb-2 max-h-40 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <button
              onClick={() => toggle(item.id)}
              className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center text-[9px] ${
                item.done ? "border-ink bg-ink text-paper" : "border-hairline hover:border-ink"
              }`}
            >
              {item.done ? "✓" : ""}
            </button>
            <span className={`flex-1 text-[12px] ${item.done ? "line-through text-muted" : ""}`}>
              {item.name}
            </span>
            <button className="text-[10px] text-muted hover:text-alert" onClick={() => remove(item.id)}>×</button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[11px] text-muted font-serif-note text-center py-1">Lista vazia.</p>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          className="ink-input flex-1 text-[11px]"
          placeholder="Adicionar item…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="ink-btn text-[10px]" onClick={add}>+</button>
      </div>
      {items.some((i) => i.done) && (
        <button className="mt-1.5 w-full text-[9px] text-muted hover:text-ink underline" onClick={clearDone}>
          limpar concluídos
        </button>
      )}
    </div>
  );
}

// ── Reading Widget (compact) ──────────────────────────────────────────────────
const LEITURAS_KEY = "leituras_data";
interface BookEntry { id: string; title: string; author: string; emoji: string; status: string; currentPage: number; totalPages: number; }

export function ReadingWidget() {
  const [current, setCurrent] = useState<BookEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEITURAS_KEY);
      if (raw) {
        const all: BookEntry[] = JSON.parse(raw);
        setCurrent(all.filter((b) => b.status === "lendo"));
      }
    } catch {}
  }, []);

  if (current.length === 0) {
    return (
      <div className="bg-paper border border-hairline px-3 py-4">
        <div className="section-bar -mx-3 -mt-4 mb-3 px-3">📚 Leituras</div>
        <p className="text-[11px] text-muted font-serif-note text-center py-1">
          Nenhum livro em leitura.{" "}
          <a href="/leituras" className="underline hover:text-ink">Ver biblioteca</a>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">📚 Leituras</div>
      <div className="space-y-2">
        {current.map((b) => {
          const pct = b.totalPages > 0 ? Math.round((b.currentPage / b.totalPages) * 100) : 0;
          return (
            <div key={b.id} className="border border-hairline p-2">
              <div className="flex items-start gap-2">
                <span className="text-[18px] leading-none">{b.emoji}</span>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold leading-tight">{b.title}</p>
                  <p className="text-[9px] text-muted">{b.author}</p>
                </div>
                <span className="text-[10px] text-muted">{pct}%</span>
              </div>
              {b.totalPages > 0 && (
                <div className="mt-1.5 h-1.5 bg-hairline rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, background: "var(--tan)" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <a href="/leituras" className="mt-2 block text-[9px] text-muted text-right hover:text-ink">
        ver todas as leituras →
      </a>
    </div>
  );
}

// ── Weekly Goals ──────────────────────────────────────────────────────────────
const WEEKLY_KEY = "weekly_goals";
interface WeeklyGoal { id: string; title: string; done: boolean; }

export function WeeklyGoalsWidget() {
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WEEKLY_KEY);
      if (raw) setGoals(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (updated: WeeklyGoal[]) => {
    setGoals(updated);
    try { localStorage.setItem(WEEKLY_KEY, JSON.stringify(updated)); } catch {}
  };

  const add = () => {
    const title = input.trim();
    if (!title) return;
    save([...goals, { id: `wg_${Date.now()}`, title, done: false }]);
    setInput("");
  };

  const done = goals.filter((g) => g.done).length;
  const total = goals.length;

  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">📋 Metas da Semana</div>
      {total > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-hairline rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${(done / total) * 100}%`, background: "var(--tan)" }}
            />
          </div>
          <span className="text-[10px] text-muted">{done}/{total}</span>
        </div>
      )}
      <div className="space-y-1 mb-2 max-h-36 overflow-y-auto">
        {goals.map((g) => (
          <div key={g.id} className="flex items-center gap-2">
            <button
              onClick={() => save(goals.map((gl) => gl.id === g.id ? { ...gl, done: !gl.done } : gl))}
              className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center text-[9px] ${
                g.done ? "border-ink bg-ink text-paper" : "border-hairline hover:border-ink"
              }`}
            >
              {g.done ? "✓" : ""}
            </button>
            <span className={`flex-1 text-[12px] ${g.done ? "line-through text-muted" : ""}`}>{g.title}</span>
            <button className="text-[10px] text-muted hover:text-alert" onClick={() => save(goals.filter((gl) => gl.id !== g.id))}>×</button>
          </div>
        ))}
        {goals.length === 0 && (
          <p className="text-[11px] text-muted font-serif-note text-center py-1">Nenhuma meta esta semana.</p>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          className="ink-input flex-1 text-[11px]"
          placeholder="Nova meta…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="ink-btn text-[10px]" onClick={add}>+</button>
      </div>
    </div>
  );
}

// ── Goals Widget (compact – links to /metas) ──────────────────────────────────
const METAS_KEY = "metas_data";
interface MetaEntry { id: string; title: string; emoji: string; horizon: string; done: boolean; subtasks: { done: boolean }[]; }

export function GoalsWidget() {
  const [metas, setMetas] = useState<MetaEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(METAS_KEY);
      if (raw) setMetas(JSON.parse(raw));
    } catch {}
  }, []);

  const active = metas.filter((m) => !m.done).slice(0, 5);

  if (active.length === 0) {
    return (
      <div className="bg-paper border border-hairline px-3 py-4">
        <div className="section-bar -mx-3 -mt-4 mb-3 px-3">🌟 Metas</div>
        <p className="text-[11px] text-muted font-serif-note text-center py-1">
          Nenhuma meta ativa.{" "}
          <a href="/metas" className="underline hover:text-ink">Criar metas</a>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">🌟 Metas</div>
      <div className="space-y-2">
        {active.map((m) => {
          const total = m.subtasks.length;
          const done = m.subtasks.filter((s) => s.done).length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <div key={m.id} className="flex items-center gap-2">
              <span className="text-[14px]">{m.emoji}</span>
              <div className="flex-1">
                <p className="text-[11px]">{m.title}</p>
                {total > 0 && (
                  <div className="h-1 bg-hairline rounded-full overflow-hidden mt-0.5">
                    <div className="h-full" style={{ width: `${pct}%`, background: "var(--tan)" }} />
                  </div>
                )}
              </div>
              <span className="text-[9px] text-muted border border-hairline px-1">{m.horizon}</span>
            </div>
          );
        })}
      </div>
      <a href="/metas" className="mt-2 block text-[9px] text-muted text-right hover:text-ink">
        ver todas as metas →
      </a>
    </div>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
export function MiniCalendarWidget({ viewDate }: { viewDate: string }) {
  const today = todayISO();
  const [current, setCurrent] = useState(() => {
    const [y, m] = (viewDate || today).split("-").map(Number);
    return { year: y, month: m };
  });

  const firstDay = new Date(current.year, current.month - 1, 1);
  const daysInMonth = new Date(current.year, current.month, 0).getDate();
  // Monday-first: 0=Mon ... 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = new Date(current.year, current.month - 1, 1).toLocaleString("pt-BR", { month: "long" });

  const prev = () => setCurrent((c) => {
    const m = c.month === 1 ? 12 : c.month - 1;
    const y = c.month === 1 ? c.year - 1 : c.year;
    return { year: y, month: m };
  });
  const next = () => setCurrent((c) => {
    const m = c.month === 12 ? 1 : c.month + 1;
    const y = c.month === 12 ? c.year + 1 : c.year;
    return { year: y, month: m };
  });

  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">📅 Mini Calendário</div>
      <div className="flex items-center justify-between mb-2">
        <button className="ink-btn py-0.5 px-1.5 text-[10px]" onClick={prev}>←</button>
        <span className="text-[11px] font-semibold capitalize">
          {monthName} {current.year}
        </span>
        <button className="ink-btn py-0.5 px-1.5 text-[10px]" onClick={next}>→</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <div key={i} className="text-[8px] text-muted font-semibold py-0.5">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = `${current.year}-${String(current.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = iso === today;
          const isView = iso === viewDate;
          return (
            <div
              key={i}
              className={`text-[10px] py-0.5 leading-tight ${
                isToday ? "bg-ink text-paper font-semibold" :
                isView ? "bg-tan-soft font-semibold" :
                "text-ink hover:bg-tan-soft/50"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Progress Chart ─────────────────────────────────────────────────────────────
export function ProgressChartWidget({
  projects,
}: {
  projects: { name: string; health: number; status: string }[];
}) {
  const active = projects.filter((p) => p.status === "andamento").slice(0, 6);
  if (active.length === 0) {
    return (
      <div className="bg-paper border border-hairline px-3 py-4">
        <div className="section-bar -mx-3 -mt-4 mb-3 px-3">📈 Progresso</div>
        <p className="text-[11px] text-muted font-serif-note text-center py-2">
          Nenhum projeto em andamento.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">📈 Progresso</div>
      <div className="space-y-2">
        {active.map((p, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px]">{p.name}</span>
              <span className="text-[9px] text-muted">{p.health}%</span>
            </div>
            <div className="h-1.5 bg-hairline rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${p.health}%`,
                  background: p.health >= 70 ? "#5E8C6A" : p.health >= 40 ? "var(--tan)" : "#9C5148",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quick Kanban ─────────────────────────────────────────────────────────────
const KANBAN_KEY = "quick_kanban";
interface KanbanCard { id: string; title: string; col: "todo" | "doing" | "done"; }

const COLS: { key: KanbanCard["col"]; label: string }[] = [
  { key: "todo",  label: "A fazer" },
  { key: "doing", label: "Fazendo" },
  { key: "done",  label: "Feito" },
];

export function QuickKanbanWidget() {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [input, setInput] = useState("");
  const [col, setCol] = useState<KanbanCard["col"]>("todo");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KANBAN_KEY);
      if (raw) setCards(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (updated: KanbanCard[]) => {
    setCards(updated);
    try { localStorage.setItem(KANBAN_KEY, JSON.stringify(updated)); } catch {}
  };

  const add = () => {
    const title = input.trim();
    if (!title) return;
    save([...cards, { id: `kn_${Date.now()}`, title, col }]);
    setInput("");
  };

  const move = (id: string, to: KanbanCard["col"]) =>
    save(cards.map((c) => c.id === id ? { ...c, col: to } : c));

  const remove = (id: string) => save(cards.filter((c) => c.id !== id));

  return (
    <div className="bg-paper border border-hairline px-3 py-4">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">🗂 Kanban Rápido</div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {COLS.map(({ key, label }) => (
          <div key={key}>
            <p className="text-[8px] uppercase tracking-wider text-muted mb-1 text-center">{label}</p>
            <div className="space-y-1 min-h-[40px]">
              {cards.filter((c) => c.col === key).map((c) => (
                <div key={c.id} className="border border-hairline px-1.5 py-1 text-[10px] group relative">
                  <p className="pr-3">{c.title}</p>
                  <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
                    {COLS.filter((cl) => cl.key !== key).map((cl) => (
                      <button
                        key={cl.key}
                        className="text-[8px] text-muted hover:text-ink"
                        title={`Mover para ${cl.label}`}
                        onClick={() => move(c.id, cl.key)}
                      >
                        →
                      </button>
                    ))}
                    <button className="text-[8px] text-muted hover:text-alert" onClick={() => remove(c.id)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        <select
          className="ink-input text-[10px] w-24"
          value={col}
          onChange={(e) => setCol(e.target.value as KanbanCard["col"])}
        >
          {COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input
          className="ink-input flex-1 text-[10px]"
          placeholder="Nova tarefa…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="ink-btn text-[10px]" onClick={add}>+</button>
      </div>
    </div>
  );
}

// ── Pomodoro Widget (compact) ──────────────────────────────────────────────────
export function PomodoroWidget() {
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const total = mode === "work" ? 25 * 60 : 5 * 60;
  const pct = ((total - secs) / total) * 100;
  const r = 36;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          setRunning(false);
          const next = mode === "work" ? "break" : "work";
          setMode(next);
          return next === "work" ? 25 * 60 : 5 * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode]);

  const reset = () => {
    setRunning(false);
    setSecs(mode === "work" ? 25 * 60 : 5 * 60);
  };

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="bg-paper border border-hairline px-3 py-4 text-center">
      <div className="section-bar -mx-3 -mt-4 mb-3 px-3">🍅 Pomodoro</div>
      <div className="flex justify-center mb-2">
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={r} fill="none" stroke="var(--hairline)" strokeWidth="4" />
          <circle
            cx="45" cy="45" r={r}
            fill="none"
            stroke={mode === "work" ? "var(--ink)" : "var(--tan)"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            transform="rotate(-90 45 45)"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
          <text x="45" y="49" textAnchor="middle" fontSize="16" fontFamily="monospace" fill="var(--ink)">
            {mm}:{ss}
          </text>
        </svg>
      </div>
      <div className="flex justify-center gap-1.5 mb-2">
        {(["work", "break"] as const).map((m) => (
          <button
            key={m}
            className={`text-[9px] px-2 py-0.5 border ${mode === m ? "border-ink bg-ink text-paper" : "border-hairline text-muted hover:border-ink"}`}
            onClick={() => { setMode(m); setRunning(false); setSecs(m === "work" ? 25 * 60 : 5 * 60); }}
          >
            {m === "work" ? "Foco" : "Pausa"}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 justify-center">
        <button
          className="ink-btn ink-btn-solid text-[10px] px-4"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "⏸ Pausar" : "▶ Iniciar"}
        </button>
        <button className="ink-btn text-[10px]" onClick={reset}>↺</button>
      </div>
      <a href="/pomodoro" className="mt-2 block text-[9px] text-muted hover:text-ink">
        abrir tela cheia →
      </a>
    </div>
  );
}
