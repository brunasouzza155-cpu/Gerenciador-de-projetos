"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PomodoroSession {
  id: string;
  label: string;
  duration: number; // minutes
  completedAt: string; // ISO timestamp
  type: "work" | "break";
}

interface PomodoroConfig {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
}

interface PomodoroData {
  config: PomodoroConfig;
  sessions: PomodoroSession[];
}

type Mode = "work" | "short" | "long";

const DEFAULT_CONFIG: PomodoroConfig = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
};

const STORAGE_KEY = "pomodoro_data";

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadData(): PomodoroData {
  if (typeof window === "undefined") {
    return { config: DEFAULT_CONFIG, sessions: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { config: DEFAULT_CONFIG, sessions: [] };
    const parsed = JSON.parse(raw) as Partial<PomodoroData>;
    return {
      config: { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) },
      sessions: parsed.sessions ?? [],
    };
  } catch {
    return { config: DEFAULT_CONFIG, sessions: [] };
  }
}

function saveData(data: PomodoroData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function fmtCompletedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── SVG Ring ──────────────────────────────────────────────────────────────────

function ProgressRing({
  elapsed,
  total,
  running,
}: {
  elapsed: number;
  total: number;
  running: boolean;
}) {
  const r = 110;
  const cx = 130;
  const cy = 130;
  const circumference = 2 * Math.PI * r;
  const progress = total > 0 ? elapsed / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <svg
      width={260}
      height={260}
      className="absolute inset-0"
      style={{ transform: "rotate(-90deg)" }}
    >
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--hairline)"
        strokeWidth={6}
      />
      {/* Progress */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="square"
        style={{
          transition: running ? "stroke-dashoffset 1s linear" : "none",
        }}
      />
    </svg>
  );
}

// ── Toast notification ────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper px-5 py-3 text-[12px] uppercase tracking-widest shadow-lg animate-fade-up"
      style={{ minWidth: 220, textAlign: "center" }}
    >
      {message}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PomodoroPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<PomodoroData>({ config: DEFAULT_CONFIG, sessions: [] });

  // Timer state
  const [mode, setMode] = useState<Mode>("work");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_CONFIG.workMinutes * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [label, setLabel] = useState("");
  const [workSessionsCompleted, setWorkSessionsCompleted] = useState(0);

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<PomodoroConfig>(DEFAULT_CONFIG);

  // Refs to avoid stale closures in interval
  const secondsLeftRef = useRef(secondsLeft);
  const elapsedRef = useRef(elapsedSeconds);
  const runningRef = useRef(running);
  const modeRef = useRef(mode);
  secondsLeftRef.current = secondsLeft;
  elapsedRef.current = elapsedSeconds;
  runningRef.current = running;
  modeRef.current = mode;

  // Mount & load
  useEffect(() => {
    const loaded = loadData();
    setData(loaded);
    setDraftConfig(loaded.config);
    setSecondsLeft(loaded.config.workMinutes * 60);
    setMounted(true);
  }, []);

  // Total seconds for the current mode
  const totalSeconds = useCallback(
    (m: Mode, cfg: PomodoroConfig) => {
      if (m === "work") return cfg.workMinutes * 60;
      if (m === "short") return cfg.shortBreakMinutes * 60;
      return cfg.longBreakMinutes * 60;
    },
    []
  );

  const currentTotal = totalSeconds(mode, data.config);

  // Complete a session
  const completeSession = useCallback(
    (completedMode: Mode, completedConfig: PomodoroConfig, completedLabel: string, elapsed: number) => {
      const isWork = completedMode === "work";
      const durationMins = Math.round(elapsed / 60) || 1;

      const session: PomodoroSession = {
        id: crypto.randomUUID(),
        label: completedLabel.trim() || (isWork ? "Sessão de foco" : "Pausa"),
        duration: durationMins,
        completedAt: new Date().toISOString(),
        type: isWork ? "work" : "break",
      };

      setData((prev) => {
        const updated: PomodoroData = {
          ...prev,
          sessions: [session, ...prev.sessions],
        };
        saveData(updated);
        return updated;
      });

      if (isWork) {
        setWorkSessionsCompleted((prev) => {
          const next = prev + 1;
          // decide next break
          const useLong = next % completedConfig.sessionsUntilLongBreak === 0;
          const nextMode: Mode = useLong ? "long" : "short";
          setToast(useLong ? "🍅 Hora de uma pausa longa!" : "🍅 Sessão concluída! Faça uma pausa.");
          setMode(nextMode);
          setSecondsLeft(totalSeconds(nextMode, completedConfig));
          setElapsedSeconds(0);
          return next;
        });
      } else {
        setToast("☕ Pausa encerrada. Hora de focar!");
        setMode("work");
        setSecondsLeft(totalSeconds("work", completedConfig));
        setElapsedSeconds(0);
      }

      setRunning(false);
      setLabel("");

      // flash title
      const orig = document.title;
      let flashes = 0;
      const iv = setInterval(() => {
        document.title = flashes % 2 === 0 ? "✅ Concluído! — Pomodoro" : orig;
        flashes++;
        if (flashes >= 6) {
          clearInterval(iv);
          document.title = orig;
        }
      }, 500);
    },
    [totalSeconds]
  );

  // Tick
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Will complete — schedule async to avoid setState during render
          setTimeout(() => {
            completeSession(modeRef.current, data.config, label, elapsedRef.current + 1);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, data.config, label]);

  // Switch mode manually
  function switchMode(m: Mode) {
    setMode(m);
    setRunning(false);
    setSecondsLeft(totalSeconds(m, data.config));
    setElapsedSeconds(0);
  }

  function handleStartPause() {
    setRunning((r) => !r);
  }

  function handleReset() {
    setRunning(false);
    setSecondsLeft(totalSeconds(mode, data.config));
    setElapsedSeconds(0);
  }

  function handleSkip() {
    setRunning(false);
    const isWork = mode === "work";
    if (isWork) {
      const next: Mode =
        (workSessionsCompleted + 1) % data.config.sessionsUntilLongBreak === 0
          ? "long"
          : "short";
      setMode(next);
      setSecondsLeft(totalSeconds(next, data.config));
    } else {
      setMode("work");
      setSecondsLeft(totalSeconds("work", data.config));
    }
    setElapsedSeconds(0);
  }

  function saveConfig() {
    const updated: PomodoroData = { ...data, config: draftConfig };
    setData(updated);
    saveData(updated);
    // reset timer to reflect new durations
    setRunning(false);
    setSecondsLeft(totalSeconds(mode, draftConfig));
    setElapsedSeconds(0);
    setSettingsOpen(false);
  }

  // Session stats
  const today = todayISO();
  const todaySessions = data.sessions.filter(
    (s) => s.completedAt.slice(0, 10) === today
  );
  const todayFocusMins = todaySessions
    .filter((s) => s.type === "work")
    .reduce((sum, s) => sum + s.duration, 0);
  const todayFocusCount = todaySessions.filter((s) => s.type === "work").length;
  const allTimeMins = data.sessions
    .filter((s) => s.type === "work")
    .reduce((sum, s) => sum + s.duration, 0);

  const modeLabels: Record<Mode, string> = {
    work: "Foco",
    short: "Pausa curta",
    long: "Pausa longa",
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center">
        <p className="text-[12px] font-serif-note text-muted">carregando…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-kraft">
      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-paper border-b border-hairline px-4 sm:px-8 py-3 flex items-center gap-3">
        <a href="/" className="ink-btn py-1.5">← Voltar</a>
        <h1 className="flex-1 text-[11px] uppercase tracking-[0.3em] font-semibold">
          🍅 Pomodoro
        </h1>
        <button
          className="ink-btn py-1.5"
          onClick={() => {
            setSettingsOpen((o) => !o);
            setDraftConfig(data.config);
          }}
        >
          ⚙ Configurar
        </button>
      </header>

      <div className="max-w-[680px] mx-auto px-4 sm:px-8 py-8 space-y-6">

        {/* Settings panel */}
        {settingsOpen && (
          <div className="bg-paper border border-hairline animate-fade-up">
            <div className="section-bar">Configurações</div>
            <div className="px-4 py-4 grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-muted">Foco (min)</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  className="ink-input"
                  value={draftConfig.workMinutes}
                  onChange={(e) =>
                    setDraftConfig((c) => ({ ...c, workMinutes: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-muted">Pausa curta (min)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  className="ink-input"
                  value={draftConfig.shortBreakMinutes}
                  onChange={(e) =>
                    setDraftConfig((c) => ({ ...c, shortBreakMinutes: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-muted">Pausa longa (min)</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  className="ink-input"
                  value={draftConfig.longBreakMinutes}
                  onChange={(e) =>
                    setDraftConfig((c) => ({ ...c, longBreakMinutes: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-muted">Sessões até pausa longa</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="ink-input"
                  value={draftConfig.sessionsUntilLongBreak}
                  onChange={(e) =>
                    setDraftConfig((c) => ({ ...c, sessionsUntilLongBreak: Number(e.target.value) }))
                  }
                />
              </label>
            </div>
            <div className="px-4 pb-4 flex gap-2">
              <button className="ink-btn-solid ink-btn" onClick={saveConfig}>
                Salvar
              </button>
              <button
                className="ink-btn"
                onClick={() => setSettingsOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Timer card */}
        <div className="bg-paper border border-hairline">
          {/* Mode tabs */}
          <div className="flex border-b border-hairline">
            {(["work", "short", "long"] as Mode[]).map((m) => (
              <button
                key={m}
                className={`flex-1 text-[9px] uppercase tracking-[0.18em] py-2.5 px-2 transition-colors ${
                  mode === m ? "bg-ink text-paper" : "text-muted hover:bg-tan-soft"
                }`}
                onClick={() => switchMode(m)}
              >
                {modeLabels[m]}
              </button>
            ))}
          </div>

          {/* Timer display */}
          <div className="flex flex-col items-center py-10 px-4 gap-6">
            {/* Ring + countdown */}
            <div className="relative w-[260px] h-[260px] flex items-center justify-center">
              <ProgressRing
                elapsed={elapsedSeconds}
                total={currentTotal}
                running={running}
              />
              <div className="relative z-10 flex flex-col items-center gap-1">
                <span
                  className="font-mono text-[64px] leading-none font-light tracking-tight text-ink tabular-nums"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmtTime(secondsLeft)}
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted font-serif-note">
                  {modeLabels[mode]}
                </span>
                {/* Sessions dot indicators */}
                <div className="flex gap-1.5 mt-2">
                  {Array.from({ length: data.config.sessionsUntilLongBreak }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 border border-ink"
                      style={{
                        background:
                          i < workSessionsCompleted % data.config.sessionsUntilLongBreak ||
                          (workSessionsCompleted > 0 &&
                            workSessionsCompleted % data.config.sessionsUntilLongBreak === 0)
                            ? "var(--ink)"
                            : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Label input — shown when not running and mode is work */}
            {!running && mode === "work" && (
              <div className="w-full max-w-xs animate-fade-up">
                <input
                  type="text"
                  className="ink-input text-center text-[12px]"
                  placeholder="O que você vai fazer?"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !running) handleStartPause();
                  }}
                />
              </div>
            )}
            {running && label && (
              <p className="text-[11px] text-muted font-serif-note italic max-w-xs text-center">
                {label}
              </p>
            )}

            {/* Controls */}
            <div className="flex gap-3 items-center">
              <button
                className="ink-btn text-[11px] px-4 py-2"
                onClick={handleReset}
                title="Reiniciar"
              >
                ↺ Reset
              </button>
              <button
                className="ink-btn-solid ink-btn text-[13px] px-8 py-3"
                onClick={handleStartPause}
              >
                {running ? "⏸ Pausar" : secondsLeft === currentTotal ? "▶ Iniciar" : "▶ Continuar"}
              </button>
              <button
                className="ink-btn text-[11px] px-4 py-2"
                onClick={handleSkip}
                title="Pular"
              >
                ⏭ Pular
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-paper border border-hairline p-4 text-center">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-1">Foco hoje</p>
            <p className="text-xl font-semibold">{fmtHM(todayFocusMins)}</p>
          </div>
          <div className="bg-paper border border-hairline p-4 text-center">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-1">Sessões hoje</p>
            <p className="text-xl font-semibold">{todayFocusCount}</p>
          </div>
          <div className="bg-paper border border-hairline p-4 text-center">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-1">Total histórico</p>
            <p className="text-xl font-semibold">{fmtHM(allTimeMins)}</p>
          </div>
        </div>

        {/* Session history */}
        <div className="bg-paper border border-hairline">
          <div className="section-bar">
            <span>Histórico de hoje</span>
            {todaySessions.length > 0 && (
              <button
                className="text-[8px] tracking-wider opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => {
                  const updated: PomodoroData = {
                    ...data,
                    sessions: data.sessions.filter((s) => s.completedAt.slice(0, 10) !== today),
                  };
                  setData(updated);
                  saveData(updated);
                }}
              >
                Limpar hoje
              </button>
            )}
          </div>

          {todaySessions.length === 0 ? (
            <p className="px-4 py-6 text-[11px] font-serif-note text-muted text-center">
              Nenhuma sessão concluída hoje. Vamos lá!
            </p>
          ) : (
            <div className="divide-y divide-hairline">
              {todaySessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-[10px]" title={s.type === "work" ? "Foco" : "Pausa"}>
                    {s.type === "work" ? "🍅" : "☕"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] truncate">{s.label}</p>
                  </div>
                  <span className="text-[10px] text-muted shrink-0">{s.duration}min</span>
                  <span className="text-[10px] text-muted tabular-nums shrink-0">
                    {fmtCompletedAt(s.completedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All-time sessions (collapsible, last 20) */}
        {data.sessions.filter((s) => s.completedAt.slice(0, 10) !== today).length > 0 && (
          <details className="bg-paper border border-hairline">
            <summary className="section-bar cursor-pointer select-none list-none flex items-center justify-between">
              <span>Sessões anteriores</span>
              <span className="text-[8px] opacity-60">▸</span>
            </summary>
            <div className="divide-y divide-hairline">
              {data.sessions
                .filter((s) => s.completedAt.slice(0, 10) !== today)
                .slice(0, 20)
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-[10px]">
                      {s.type === "work" ? "🍅" : "☕"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] truncate">{s.label}</p>
                      <p className="text-[9px] text-muted">
                        {new Date(s.completedAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted shrink-0">{s.duration}min</span>
                    <span className="text-[10px] text-muted tabular-nums shrink-0">
                      {fmtCompletedAt(s.completedAt)}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
