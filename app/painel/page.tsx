"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { addDays, fmtLong, fmtShort, todayISO, WEEKDAYS_PT, MONTHS_PT } from "@/lib/dates";
import { projectLeaves, projectProgress } from "@/lib/tree";
import { HEALTH_META, STATUS_META, fmtBRL } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AuthGate } from "@/components/AuthGate";
import { getActivePlannerId, loadPlannerBlocks, loadPlannerConfig } from "@/lib/planner-config";
import type { Workspace } from "@/lib/types";

const subscribeNoop = () => () => {};

export default function PainelPage() {
  if (isSupabaseConfigured) {
    return (
      <AuthGate>
        <Painel mode="supabase" />
      </AuthGate>
    );
  }
  return <Painel mode="mock" />;
}

// ── Gráfico de barras SVG ─────────────────────────────────────────────────────
function BarChart({ data, color = "var(--ink)" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const H = 80, W = 220, barW = Math.floor(W / data.length) - 4;

  return (
    <svg width={W} height={H + 20} className="w-full max-w-[300px]">
      {data.map((d, i) => {
        const barH = Math.round((d.value / max) * H);
        const x = i * (barW + 4) + 2;
        return (
          <g key={i}>
            <rect
              x={x} y={H - barH} width={barW} height={barH}
              fill={color} opacity={d.value === 0 ? 0.12 : 0.85}
            />
            <text
              x={x + barW / 2} y={H + 14}
              textAnchor="middle" fontSize="8" fill="var(--muted)"
            >
              {d.label}
            </text>
            {d.value > 0 && (
              <text
                x={x + barW / 2} y={H - barH - 3}
                textAnchor="middle" fontSize="8" fill="var(--ink)"
              >
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Gráfico de pizza SVG ──────────────────────────────────────────────────────
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-[11px] text-muted font-serif-note">Sem dados</p>;

  const R = 44, cx = 60, cy = 50;
  let angle = -Math.PI / 2;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const pct   = d.value / total;
      const start = angle;
      angle += pct * 2 * Math.PI;
      return { ...d, pct, startAngle: start, endAngle: angle };
    });

  return (
    <div className="flex items-center gap-4">
      <svg width={120} height={100}>
        {slices.map((s, i) => {
          const x1 = cx + R * Math.cos(s.startAngle);
          const y1 = cy + R * Math.sin(s.startAngle);
          const x2 = cx + R * Math.cos(s.endAngle);
          const y2 = cy + R * Math.sin(s.endAngle);
          const large = s.pct > 0.5 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M${cx},${cy} L${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} Z`}
              fill={s.color}
              opacity={0.85}
            />
          );
        })}
      </svg>
      <div className="space-y-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2.5 h-2.5 shrink-0" style={{ background: s.color, opacity: 0.85 }} />
            <span className="text-muted">{s.label}</span>
            <span className="font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Card de estatística ────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-paper border border-hairline p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-1">{label}</p>
      <p className="text-2xl font-semibold" style={accent ? { color: accent } : {}}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted mt-0.5 font-serif-note">{sub}</p>}
    </div>
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────
function Painel({ mode }: { mode: "mock" | "supabase" }) {
  const store = useAppStore(mode);
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const [wsFilter, setWsFilter]         = useState<Workspace | "all">("all");
  const [period, setPeriod]             = useState<"today" | "week" | "month" | "all">("month");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Planner block awareness
  const [blocksLoaded, setBlocksLoaded]       = useState(false);
  const [visibleBlockTypes, setVisibleBlockTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const activeId = getActivePlannerId();
    const blocks   = activeId ? loadPlannerBlocks(activeId) : loadPlannerConfig();
    setVisibleBlockTypes(new Set(blocks.filter((b) => b.visible).map((b) => b.type)));
    setBlocksLoaded(true);
  }, []);

  const has = (type: string) => visibleBlockTypes.has(type);

  const showProjects   = has("projects");
  const showObjectivos = has("objetivo");
  const showFollowups  = has("followups");
  const showActivities = has("activities");
  const showUpcoming   = has("upcoming");
  const showTasks      = has("today") || has("priorities") || has("quick-tasks");
  const showCharts     = showProjects || showTasks;

  const hasAnyContent = showProjects || showObjectivos || showFollowups || showActivities || showUpcoming || showTasks;

  const today    = todayISO();
  const weekAgo  = addDays(today, -7);
  const monthAgo = addDays(today, -30);

  if (!mounted || store.loading) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center">
        <p className="text-[12px] font-serif-note text-muted">carregando dados…</p>
      </main>
    );
  }

  // Projetos filtrados por workspace + status
  const allFiltered = store.projects.filter((p) => {
    if (wsFilter !== "all" && p.workspace !== wsFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  // Separação por kind
  const activeProjetos  = allFiltered.filter((p) => !p.archived && p.kind !== "objetivo");
  const activeObjetivos = allFiltered.filter((p) => !p.archived && p.kind === "objetivo");

  // Tarefas só de projetos (kind !== "objetivo")
  const projetoLeaves  = activeProjetos.flatMap((p) => projectLeaves(store.tasks, p.id));
  const objetivoLeaves = activeObjetivos.flatMap((p) => projectLeaves(store.tasks, p.id));

  const relevantLeaves = [
    ...(showProjects ? projetoLeaves : []),
    ...(showObjectivos ? objetivoLeaves : []),
  ];

  const overdueLeaves  = relevantLeaves.filter((t) => !t.done && t.dueDate && t.dueDate < today);
  const completedToday = relevantLeaves.filter((t) => t.done && t.dueDate === today);

  const openFollowups = store.followups.filter((f) => {
    if (wsFilter !== "all" && f.workspace !== wsFilter) return false;
    return !f.done;
  });

  // Produtividade por dia da semana (últimas 4 semanas)
  const weekdayProd = Array(7).fill(0) as number[];
  relevantLeaves.forEach((t) => {
    if (t.done && t.dueDate && t.dueDate >= monthAgo) {
      const d = new Date(t.dueDate + "T12:00:00").getDay();
      weekdayProd[d]++;
    }
  });
  const weekdayData = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    label: WEEKDAYS_PT[d === 0 ? 6 : d - 1]?.slice(0, 3) ?? "?",
    value: weekdayProd[d],
  }));

  // Distribuição por status (projetos)
  const statusDist = (["andamento", "desenvolvimento", "aguardando", "pausado", "cancelado", "concluido"] as const).map((s) => ({
    label: STATUS_META[s].label.replace("Em ", ""),
    value: activeProjetos.filter((p) => p.status === s).length,
    color: STATUS_META[s].color,
  }));

  // Distribuição por status (objetivos)
  const objetivosStatusDist = (["andamento", "desenvolvimento", "aguardando", "pausado", "cancelado", "concluido"] as const).map((s) => ({
    label: STATUS_META[s].label.replace("Em ", ""),
    value: activeObjetivos.filter((p) => p.status === s).length,
    color: STATUS_META[s].color,
  }));

  // Evolução mensal (últimos 6 meses)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const ym  = d.toISOString().slice(0, 7);
    const label = MONTHS_PT[d.getMonth()].slice(0, 3);
    const value = relevantLeaves.filter((t) => t.done && t.dueDate?.startsWith(ym)).length;
    return { label, value };
  });

  // Tarefas atrasadas por projeto
  const overdueByProject = activeProjetos
    .map((p) => ({
      project: p,
      tasks: projectLeaves(store.tasks, p.id).filter((t) => !t.done && t.dueDate && t.dueDate < today),
    }))
    .filter((e) => e.tasks.length > 0);

  return (
    <main className="min-h-screen bg-kraft">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-paper border-b border-hairline px-4 sm:px-8 py-3 flex items-center gap-3">
        <a href="/" className="ink-btn py-1.5">← Planner</a>
        <h1 className="flex-1 text-[11px] uppercase tracking-[0.3em] font-semibold">
          📊 Painel Gerencial
        </h1>
        <button
          className="ink-btn"
          onClick={() => window.print()}
          title="Imprimir / Exportar PDF"
        >
          🖨 Exportar
        </button>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 space-y-8">

        {/* Filtros */}
        <div className="bg-paper border border-hairline px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-[9px] uppercase tracking-wider text-muted">Filtrar:</span>

          <div className="flex border border-hairline">
            {(["all", "trabalho", "pessoal"] as const).map((w) => {
              const labels = { all: "Todos", trabalho: "Profissional", pessoal: "Pessoal" };
              return (
                <button
                  key={w}
                  className={`text-[9px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
                    wsFilter === w ? "bg-ink text-paper" : "hover:bg-tan-soft"
                  }`}
                  onClick={() => setWsFilter(w)}
                >
                  {labels[w]}
                </button>
              );
            })}
          </div>

          <div className="flex border border-hairline">
            {(["today", "week", "month", "all"] as const).map((p) => {
              const labels = { today: "Hoje", week: "Semana", month: "Mês", all: "Tudo" };
              return (
                <button
                  key={p}
                  className={`text-[9px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
                    period === p ? "bg-ink text-paper" : "hover:bg-tan-soft"
                  }`}
                  onClick={() => setPeriod(p)}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {(showProjects || showObjectivos) && (
            <select
              className="ink-input !w-auto text-[9px] uppercase tracking-wider border border-hairline px-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {(["andamento", "desenvolvimento", "aguardando", "pausado", "cancelado", "concluido"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Estado vazio */}
        {blocksLoaded && !hasAnyContent && (
          <div className="bg-paper border border-hairline px-6 py-12 text-center">
            <p className="text-[28px] mb-4">📭</p>
            <p className="text-[14px] font-semibold text-ink mb-2">Nenhum bloco ativo no planner</p>
            <p className="text-[12px] font-serif-note text-muted max-w-xs mx-auto leading-relaxed">
              Adicione blocos ao seu planner para visualizar dados aqui. Acesse{" "}
              <a href="/construtor" className="underline hover:text-ink">Construir meu Planner</a>{" "}
              para personalizar.
            </p>
          </div>
        )}

        {hasAnyContent && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {showProjects && (
                <StatCard
                  label="Projetos ativos"
                  value={activeProjetos.length}
                  sub={`${allFiltered.filter((p) => p.archived && p.kind !== "objetivo").length} arquivados`}
                />
              )}
              {showObjectivos && (
                <StatCard
                  label="Objetivos ativos"
                  value={activeObjetivos.length}
                  sub={`${allFiltered.filter((p) => p.archived && p.kind === "objetivo").length} arquivados`}
                />
              )}
              {(showProjects || showTasks) && (
                <StatCard
                  label="Tarefas atrasadas"
                  value={overdueLeaves.length}
                  sub="precisam de atenção"
                  accent={overdueLeaves.length > 0 ? "var(--alert)" : "var(--muted)"}
                />
              )}
              {(showProjects || showTasks) && (
                <StatCard
                  label="Concluídas hoje"
                  value={completedToday.length}
                  sub={fmtLong(today).split(",")[0]}
                />
              )}
              {showFollowups && (
                <StatCard
                  label="Acompanhamentos abertos"
                  value={openFollowups.length}
                  sub="pendentes de resposta"
                />
              )}
            </div>

            {/* Gráficos */}
            {showCharts && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-paper border border-hairline p-4">
                  <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Tarefas concluídas por dia da semana</p>
                  <BarChart data={weekdayData} color="var(--ink)" />
                </div>

                {showProjects && (
                  <div className="bg-paper border border-hairline p-4">
                    <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Projetos por status</p>
                    <PieChart data={statusDist} />
                  </div>
                )}

                {showObjectivos && !showProjects && (
                  <div className="bg-paper border border-hairline p-4">
                    <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Objetivos por status</p>
                    <PieChart data={objetivosStatusDist} />
                  </div>
                )}

                <div className="bg-paper border border-hairline p-4">
                  <p className="text-[9px] uppercase tracking-wider text-muted mb-3">Tarefas concluídas por mês</p>
                  <BarChart data={monthlyData} color="var(--tan)" />
                </div>
              </div>
            )}

            {/* Projetos — Progresso Individual */}
            {showProjects && (
              <div className="bg-paper border border-hairline">
                <div className="section-bar">Projetos — Progresso Individual</div>
                <div className="divide-y divide-hairline">
                  {activeProjetos.length === 0 && (
                    <p className="px-4 py-6 text-[11px] font-serif-note text-muted text-center">
                      Nenhum projeto encontrado com os filtros selecionados.
                    </p>
                  )}
                  {activeProjetos.map((p) => {
                    const prog   = projectProgress(store.tasks, p.id);
                    const leaves = projectLeaves(store.tasks, p.id);
                    const overdue = leaves.filter((t) => !t.done && t.dueDate && t.dueDate < today).length;
                    const done   = leaves.filter((t) => t.done).length;
                    return (
                      <div key={p.id} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] tracking-[0.2em] text-muted w-16 shrink-0">{p.code}</span>
                          <span className="flex-1 text-[12px] font-medium">{p.name}</span>
                          <span
                            className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 shrink-0"
                            style={{ background: STATUS_META[p.status].color, color: "#FAF8F3" }}
                          >
                            {STATUS_META[p.status].label}
                          </span>
                          {p.gains && (
                            <span className="text-[10px] text-muted shrink-0">{fmtBRL(p.gains)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 border border-hairline">
                            <div className="h-full bg-ink" style={{ width: `${prog}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums font-medium w-8 text-right">{prog}%</span>
                          <span className="text-[9px] text-muted">{done}/{leaves.length} tarefas</span>
                          {overdue > 0 && (
                            <span className="text-[9px] text-alert font-medium">⚠ {overdue} atrasada{overdue > 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Objetivos — Progresso */}
            {showObjectivos && (
              <div className="bg-paper border border-hairline">
                <div className="section-bar">🎯 Objetivos — Progresso</div>
                <div className="divide-y divide-hairline">
                  {activeObjetivos.length === 0 && (
                    <p className="px-4 py-6 text-[11px] font-serif-note text-muted text-center">
                      Nenhum objetivo encontrado com os filtros selecionados.
                    </p>
                  )}
                  {activeObjetivos.map((p) => {
                    const prog   = projectProgress(store.tasks, p.id);
                    const leaves = projectLeaves(store.tasks, p.id);
                    const done   = leaves.filter((t) => t.done).length;
                    return (
                      <div key={p.id} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[14px] shrink-0">{HEALTH_META[p.health].emoji}</span>
                          <span className="flex-1 text-[12px] font-medium">{p.name}</span>
                          <span
                            className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 shrink-0"
                            style={{ background: STATUS_META[p.status].color, color: "#FAF8F3" }}
                          >
                            {STATUS_META[p.status].label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 border border-hairline">
                            <div className="h-full bg-ink" style={{ width: `${prog}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums font-medium w-8 text-right">{prog}%</span>
                          {leaves.length > 0 && (
                            <span className="text-[9px] text-muted">{done}/{leaves.length} tarefas</span>
                          )}
                        </div>
                        {p.notes && (
                          <p className="mt-1 text-[10px] font-serif-note text-muted leading-snug">{p.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Destaques */}
            {(showProjects || showTasks || showFollowups) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Tarefas atrasadas */}
                {(showProjects || showTasks) && (
                  <div className="bg-paper border border-hairline">
                    <div className="section-bar">⚠ Tarefas Atrasadas</div>
                    <div className="px-4 py-3">
                      {overdueByProject.length === 0 ? (
                        <p className="text-[11px] font-serif-note text-muted py-2">✓ Nenhuma tarefa atrasada.</p>
                      ) : (
                        overdueByProject.map(({ project, tasks }) => (
                          <div key={project.id} className="mb-3">
                            <p className="text-[9px] uppercase tracking-wider text-muted mb-1">
                              {project.code ? `${project.code} · ` : ""}{project.name}
                            </p>
                            {tasks.slice(0, 3).map((t) => (
                              <div key={t.id} className="flex items-center gap-2 py-0.5">
                                <span className="text-alert text-[10px]">▸</span>
                                <span className="flex-1 text-[11px]">{t.title}</span>
                                <span className="text-[9px] text-alert tabular-nums">
                                  {fmtShort(t.dueDate!)}
                                </span>
                              </div>
                            ))}
                            {tasks.length > 3 && (
                              <p className="text-[9px] text-muted mt-0.5">+{tasks.length - 3} mais…</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Próximos acompanhamentos */}
                {showFollowups && (
                  <div className="bg-paper border border-hairline">
                    <div className="section-bar">👁 Próximos Acompanhamentos</div>
                    <div className="px-4 py-3">
                      {openFollowups.length === 0 ? (
                        <p className="text-[11px] font-serif-note text-muted py-2">Sem acompanhamentos abertos.</p>
                      ) : (
                        openFollowups
                          .sort((a, b) => (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1)
                          .slice(0, 8)
                          .map((f) => {
                            const late = f.dueDate && f.dueDate < today;
                            return (
                              <div key={f.id} className="flex items-center gap-2 py-1 hairline-b">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] truncate ${late ? "text-alert font-medium" : ""}`}>
                                    {f.what}
                                  </p>
                                  <p className="text-[9px] text-muted truncate">{f.who}</p>
                                </div>
                                {f.dueDate && (
                                  <span className={`text-[9px] tabular-nums shrink-0 ${late ? "text-alert" : "text-muted"}`}>
                                    {late ? "⚠ " : ""}{fmtShort(f.dueDate)}
                                  </span>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Atividades */}
            {showActivities && (
              <div className="bg-paper border border-hairline">
                <div className="section-bar">📋 Atividades</div>
                <div className="px-4 py-6 text-center">
                  <p className="text-[11px] font-serif-note text-muted">
                    Registre atividades no seu planner para visualizá-las aqui.
                  </p>
                </div>
              </div>
            )}

            {/* Próximas Entregas */}
            {showUpcoming && (
              <div className="bg-paper border border-hairline">
                <div className="section-bar">🔔 Próximas Entregas</div>
                <div className="divide-y divide-hairline">
                  {(() => {
                    const upcoming = relevantLeaves
                      .filter((t) => !t.done && t.dueDate && t.dueDate >= today)
                      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
                      .slice(0, 10);
                    if (upcoming.length === 0) {
                      return (
                        <p className="px-4 py-6 text-[11px] font-serif-note text-muted text-center">
                          Nenhuma entrega próxima.
                        </p>
                      );
                    }
                    return upcoming.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 px-4 py-2">
                        <span className="flex-1 text-[11px]">{t.title}</span>
                        <span className="text-[9px] text-muted tabular-nums shrink-0">{fmtShort(t.dueDate!)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </>
        )}

        <footer className="text-center pt-4">
          <p className="text-[10px] font-serif-note text-muted">
            Dados atualizados em tempo real · {fmtLong(today)}
          </p>
        </footer>
      </div>
    </main>
  );
}
