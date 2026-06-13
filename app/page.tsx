"use client";

import { useCallback, useMemo, useState, useSyncExternalStore, useEffect } from "react";
import { addDays, fmtLong, fmtShort, todayISO } from "@/lib/dates";
import { projectLeaves } from "@/lib/tree";
import { STATUS_META, STATUS_ORDER } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import { useModes } from "@/lib/modes";
import type { ProjectStatus } from "@/lib/types";
import { DayDemandsPanel, PrioritiesPanel, TodayPanel } from "@/components/DayColumn";
import { ProjectCard, ProjectForm } from "@/components/ProjectCard";
import { Planner } from "@/components/Planner";
import { FollowupsPanel } from "@/components/FollowupsPanel";
import { SummaryPanel, UpcomingPanel } from "@/components/SummaryColumn";
import { AuthGate, signOut } from "@/components/AuthGate";
import { Sidebar } from "@/components/Sidebar";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  ClockWidget, QuoteWidget, WaterTrackerWidget, HabitsWidget,
  CountdownWidget, ShoppingWidget, ReadingWidget, WeeklyGoalsWidget,
  GoalsWidget, MiniCalendarWidget, ProgressChartWidget, QuickKanbanWidget,
  PomodoroWidget,
} from "@/components/BlockWidgets";
import {
  loadPlannerConfig, loadPlannerBlocks, savePlannerConfig, savePlannerBlocks,
  getActivePlannerId, DEFAULT_BLOCKS, type PlannerBlock,
} from "@/lib/planner-config";

const subscribeNoop = () => () => {};

export default function Page() {
  if (isSupabaseConfigured) {
    return (
      <AuthGate>
        <Home mode="supabase" />
      </AuthGate>
    );
  }
  return <Home mode="mock" />;
}

// ── Edit mode block wrapper ───────────────────────────────────────────────────
function BlockWrapper({
  block,
  editMode,
  onHide,
  children,
}: {
  block: PlannerBlock;
  editMode: boolean;
  onHide: (id: string) => void;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (!editMode) return <>{children}</>;
  return (
    <div className="relative">
      {children}
      <div className="absolute top-0 inset-x-0 bottom-0 pointer-events-none border-2 border-dashed border-tan opacity-60 z-10" />
      <div className="absolute top-1 right-1 z-20 pointer-events-auto">
        <button
          className="bg-paper border border-hairline text-[10px] px-1.5 py-0.5 hover:border-ink shadow-sm"
          onClick={() => setMenuOpen((o) => !o)}
        >
          ⋯
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-0.5 bg-paper border border-hairline shadow-lg z-30 min-w-[140px]"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <div className="px-2 py-1 border-b border-hairline text-[9px] uppercase tracking-wider text-muted">
              {block.emoji} {block.label}
            </div>
            <button
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-tan-soft/40 flex items-center gap-2"
              onClick={() => { onHide(block.id); setMenuOpen(false); }}
            >
              <span>○</span> Ocultar bloco
            </button>
            <a
              href="/construtor"
              className="block px-3 py-1.5 text-[11px] hover:bg-tan-soft/40"
            >
              🏗 Editar no builder
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Home({ mode }: { mode: "mock" | "supabase" }) {
  const store = useAppStore(mode);
  const { modes, activeMode, setActiveModeId, setModes } = useModes();
  const workspace = activeMode.workspace;

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [viewDate, setViewDate] = useState(() => todayISO());
  const [editMode, setEditMode] = useState(false);
  const [plannerBlocks, setPlannerBlocks] = useState<PlannerBlock[]>(DEFAULT_BLOCKS);
  const [activePlannerId, setActivePlannerIdState] = useState<string | null>(null);

  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  // Load planner blocks on mount
  useEffect(() => {
    const aid = getActivePlannerId();
    setActivePlannerIdState(aid);
    if (aid) {
      setPlannerBlocks(loadPlannerBlocks(aid));
    } else {
      setPlannerBlocks(loadPlannerConfig());
    }
  }, []);

  const today = todayISO();

  const prevDay = () => setViewDate((d) => addDays(d, -1));
  const nextDay = () => setViewDate((d) => addDays(d, 1));

  const wsProjects = useMemo(
    () => store.projects.filter((p) => p.workspace === workspace),
    [store.projects, workspace]
  );

  const visibleProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wsProjects.filter((p) => {
      if (p.archived !== showArchived) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (q) {
        const inProject =
          p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
        const inTasks = store.tasks.some(
          (t) => t.projectId === p.id && t.title.toLowerCase().includes(q)
        );
        if (!inProject && !inTasks) return false;
      }
      return true;
    });
  }, [wsProjects, showArchived, statusFilter, search, store.tasks]);

  const overdueCount = useMemo(() => {
    let n = 0;
    for (const p of wsProjects.filter((p) => !p.archived)) {
      for (const t of projectLeaves(store.tasks, p.id)) {
        if (!t.done && t.dueDate && t.dueDate < today) n++;
      }
    }
    return n;
  }, [wsProjects, store.tasks, today]);

  const countByStatus = (s: ProjectStatus) =>
    wsProjects.filter((p) => p.status === s && p.archived === showArchived).length;

  const handleModeChange = (m: typeof activeMode) => {
    setActiveModeId(m.id);
    setStatusFilter(null);
    setShowArchived(false);
  };

  // Dynamic visible blocks respecting active mode
  const activeBlocks = useMemo(() => {
    return plannerBlocks.filter((b) => {
      if (!b.visible) return false;
      if (b.visibleModes && b.visibleModes.length > 0 && !b.visibleModes.includes(activeMode.id)) return false;
      return true;
    });
  }, [plannerBlocks, activeMode]);

  const col1Blocks = useMemo(() =>
    activeBlocks.filter((b) => b.column === 1).sort((a, b) => a.order - b.order),
    [activeBlocks]
  );
  const col2Blocks = useMemo(() =>
    activeBlocks.filter((b) => b.column === 2).sort((a, b) => a.order - b.order),
    [activeBlocks]
  );
  const col3Blocks = useMemo(() =>
    activeBlocks.filter((b) => b.column === 3).sort((a, b) => a.order - b.order),
    [activeBlocks]
  );

  const handleHideBlock = useCallback((id: string) => {
    setPlannerBlocks((bs) => {
      const updated = bs.map((b) => b.id === id ? { ...b, visible: false } : b);
      if (activePlannerId) savePlannerBlocks(activePlannerId, updated);
      else savePlannerConfig(updated);
      return updated;
    });
  }, [activePlannerId]);

  const exitEditMode = () => {
    setEditMode(false);
  };

  // Render block content by type
  const renderBlockContent = (block: PlannerBlock) => {
    const nonArchived = wsProjects.filter((p) => !p.archived);
    switch (block.type) {
      case "priorities":
        return <PrioritiesPanel store={store} workspace={workspace} viewDate={viewDate} />;
      case "today":
        return <TodayPanel store={store} workspace={workspace} projects={nonArchived} viewDate={viewDate} />;
      case "quick-tasks":
        return <DayDemandsPanel store={store} workspace={workspace} projects={nonArchived} viewDate={viewDate} />;
      case "planner":
        return <Planner store={store} projects={nonArchived} />;
      case "upcoming":
        return <UpcomingPanel store={store} projects={nonArchived} />;
      case "followups":
        return <FollowupsPanel store={store} workspace={workspace} projects={nonArchived} />;
      case "summary":
        return <SummaryPanel store={store} workspace={workspace} projects={nonArchived} />;
      case "goals":
        return <GoalsWidget />;
      case "pomodoro":
        return <PomodoroWidget />;
      case "countdown":
        return <CountdownWidget />;
      case "clock":
        return <ClockWidget />;
      case "quote":
        return <QuoteWidget />;
      case "water-tracker":
        return <WaterTrackerWidget />;
      case "habits":
        return <HabitsWidget />;
      case "mini-calendar":
        return <MiniCalendarWidget viewDate={viewDate} />;
      case "shopping":
        return <ShoppingWidget />;
      case "reading":
        return <ReadingWidget />;
      case "weekly-goals":
        return <WeeklyGoalsWidget />;
      case "progress-chart":
        return <ProgressChartWidget projects={nonArchived} />;
      case "quick-kanban":
        return <QuickKanbanWidget />;
      default:
        return null;
    }
  };

  if (!mounted || store.loading) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center">
        {store.loading && (
          <p className="text-[12px] font-serif-note text-muted">abrindo o caderno…</p>
        )}
      </main>
    );
  }

  if (store.loadError) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center px-4">
        <div className="bg-paper border border-hairline p-6 max-w-sm text-center">
          <p className="text-[12px] text-alert font-medium">
            Não consegui carregar seus dados.
          </p>
          <p className="text-[11px] font-serif-note text-muted mt-1">{store.loadError}</p>
          <button className="ink-btn mt-4" onClick={() => location.reload()}>
            tentar de novo
          </button>
        </div>
      </main>
    );
  }

  // Column 1: day nav always shows when there are day-related blocks
  const hasDayBlocks = col1Blocks.some((b) =>
    ["priorities", "today", "quick-tasks"].includes(b.type)
  );

  return (
    <>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode((f) => !f)}
        activeMode={activeMode}
        modes={modes}
        onModeChange={handleModeChange}
        onModesChange={setModes}
      />

      {/* Edit mode banner */}
      {editMode && (
        <div className="fixed top-0 inset-x-0 z-50 bg-ink text-paper text-[11px] py-2 flex items-center justify-center gap-3">
          <span className="uppercase tracking-wider">Modo de edição ativo</span>
          <span className="text-muted opacity-60">— clique em ⋯ para ocultar blocos</span>
          <button
            className="border border-paper/30 px-3 py-0.5 hover:bg-paper/10 ml-2"
            onClick={exitEditMode}
          >
            ✓ concluir edição
          </button>
          <a href="/construtor" className="border border-paper/30 px-3 py-0.5 hover:bg-paper/10 text-[10px]">
            🏗 builder completo →
          </a>
        </div>
      )}

      <main
        className={`min-h-screen bg-kraft py-4 px-2 sm:py-8 sm:px-6 transition-all ${focusMode ? "focus-mode" : ""} ${editMode ? "pt-10" : ""}`}
      >
        <div className="mx-auto max-w-[1400px] bg-paper border border-hairline shadow-[0_2px_24px_rgba(28,27,24,0.12)] px-3 py-5 sm:px-8 sm:py-8">

          {/* Cabeçalho */}
          <header className="text-center relative">
            <button
              className="absolute left-0 top-0 ink-btn py-1.5 px-2.5"
              onClick={() => setSidebarOpen(true)}
              title="Abrir menu"
            >
              ☰
            </button>

            <h1 className="text-lg sm:text-xl font-semibold uppercase tracking-[0.35em]">
              Planner
            </h1>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted mt-0.5">
              {activeMode.name}
            </p>
            <p className="text-[12px] font-serif-note text-muted mt-1">{fmtLong(today)}</p>

            {/* Linha de utilidades */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {overdueCount > 0 ? (
                <span className="text-[10px] uppercase tracking-wider text-paper bg-alert px-2 py-1 font-semibold">
                  ⚠ {overdueCount} {overdueCount === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-muted border border-hairline px-2 py-1">
                  ✓ em dia
                </span>
              )}
              <input
                className="ink-input !w-[180px] sm:!w-[220px]"
                placeholder="buscar projeto ou tarefa…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className={`ink-btn ${showArchived ? "ink-btn-solid" : ""}`}
                onClick={() => setShowArchived(!showArchived)}
                title="Mostrar projetos arquivados"
              >
                arquivados
              </button>
              <button className="ink-btn ink-btn-solid" onClick={() => setCreating(!creating)}>
                + novo projeto
              </button>
              <button
                className={`ink-btn ${editMode ? "ink-btn-solid" : ""}`}
                onClick={() => setEditMode((e) => !e)}
                title="Editar blocos do planner"
              >
                {editMode ? "✎ editando" : "✎ editar"}
              </button>
              <button
                className={`ink-btn ${focusMode ? "ink-btn-solid" : ""}`}
                onClick={() => setFocusMode((f) => !f)}
                title={focusMode ? "Sair do modo foco" : "Modo foco"}
              >
                {focusMode ? "⊙ foco" : "⊙ foco"}
              </button>
              {mode === "supabase" ? (
                <button className="ink-btn" onClick={signOut} title="Fechar o caderno">
                  sair
                </button>
              ) : (
                <span
                  className="text-[9px] uppercase tracking-wider text-muted border border-dashed border-hairline px-2 py-1"
                  title="Sem banco de dados: nada é salvo de verdade ainda"
                >
                  modo demonstração
                </span>
              )}
            </div>

            {/* Filtros por status */}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <button
                className={`text-[9px] uppercase tracking-wider px-2 py-1 border ${
                  statusFilter === null
                    ? "border-ink bg-ink text-paper"
                    : "border-hairline text-muted hover:border-ink hover:text-ink"
                }`}
                onClick={() => setStatusFilter(null)}
              >
                todos · {wsProjects.filter((p) => p.archived === showArchived).length}
              </button>
              {STATUS_ORDER.map((s) => {
                const n = countByStatus(s);
                if (n === 0) return null;
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    className="text-[9px] uppercase tracking-wider px-2 py-1 border"
                    style={
                      active
                        ? { background: STATUS_META[s].color, borderColor: STATUS_META[s].color, color: "#FAF8F3" }
                        : { borderColor: "#D9D2C2", color: STATUS_META[s].color }
                    }
                    onClick={() => setStatusFilter(active ? null : s)}
                  >
                    {STATUS_META[s].label} · {n}
                  </button>
                );
              })}
            </div>
          </header>

          {/* Formulário de novo projeto */}
          {creating && (
            <div className="mt-5 max-w-xl mx-auto">
              <div className="section-bar">Novo projeto</div>
              <ProjectForm
                initial={{
                  workspace,
                  code: "",
                  name: "",
                  status: "andamento",
                  health: 0,
                  startDate: today,
                  dueDate: null,
                  stoppedDate: null,
                  gains: null,
                  fte: null,
                  notes: "",
                  archived: false,
                }}
                onSave={(data) => { store.addProject(data); setCreating(false); }}
                onCancel={() => setCreating(false)}
              />
            </div>
          )}

          {/* Colunas dinâmicas */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1fr] gap-4 items-start">

            {/* Coluna 1 */}
            <div className="flex flex-col gap-4">
              {/* Navegação de data — sempre visível se houver blocos de dia */}
              {hasDayBlocks && (
                <div className="bg-paper border border-hairline px-3 py-2 flex items-center justify-between">
                  <button className="ink-btn py-1 px-2.5" onClick={prevDay} title="Dia anterior">←</button>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wider">
                      {viewDate === today ? "Hoje" : fmtShort(viewDate)}
                    </p>
                    {viewDate !== today && (
                      <button className="text-[9px] text-muted underline" onClick={() => setViewDate(today)}>
                        voltar para hoje
                      </button>
                    )}
                  </div>
                  <button className="ink-btn py-1 px-2.5" onClick={nextDay} title="Próximo dia">→</button>
                </div>
              )}

              {col1Blocks.map((block) => {
                const content = renderBlockContent(block);
                if (!content) return null;
                return (
                  <BlockWrapper key={block.id} block={block} editMode={editMode} onHide={handleHideBlock}>
                    {content}
                  </BlockWrapper>
                );
              })}

              {editMode && col1Blocks.length === 0 && (
                <div className="border border-dashed border-hairline py-6 text-center text-[11px] text-muted font-serif-note">
                  Coluna 1 vazia —{" "}
                  <a href="/construtor" className="underline">adicionar blocos</a>
                </div>
              )}
            </div>

            {/* Coluna 2 — Projetos */}
            <div className="flex flex-col gap-4">
              {col2Blocks.map((block) => {
                if (block.type === "projects") {
                  return (
                    <BlockWrapper key={block.id} block={block} editMode={editMode} onHide={handleHideBlock}>
                      <>
                        {visibleProjects.length === 0 && (
                          <div className="bg-paper border border-hairline p-6 text-center">
                            <p className="text-[12px] font-serif-note text-muted">
                              {showArchived
                                ? "Nenhum projeto arquivado aqui."
                                : "Nenhum projeto neste filtro. Crie um com '+ novo projeto'."}
                            </p>
                          </div>
                        )}
                        {visibleProjects.map((p) => (
                          <ProjectCard key={p.id} project={p} store={store} />
                        ))}
                      </>
                    </BlockWrapper>
                  );
                }
                const content = renderBlockContent(block);
                if (!content) return null;
                return (
                  <BlockWrapper key={block.id} block={block} editMode={editMode} onHide={handleHideBlock}>
                    {content}
                  </BlockWrapper>
                );
              })}

              {editMode && col2Blocks.length === 0 && (
                <div className="border border-dashed border-hairline py-6 text-center text-[11px] text-muted font-serif-note">
                  Coluna 2 vazia —{" "}
                  <a href="/construtor" className="underline">adicionar blocos</a>
                </div>
              )}
            </div>

            {/* Coluna 3 */}
            <div className="flex flex-col gap-4">
              {col3Blocks.map((block) => {
                const content = renderBlockContent(block);
                if (!content) return null;
                return (
                  <BlockWrapper key={block.id} block={block} editMode={editMode} onHide={handleHideBlock}>
                    {content}
                  </BlockWrapper>
                );
              })}

              {editMode && col3Blocks.length === 0 && (
                <div className="border border-dashed border-hairline py-6 text-center text-[11px] text-muted font-serif-note">
                  Coluna 3 vazia —{" "}
                  <a href="/construtor" className="underline">adicionar blocos</a>
                </div>
              )}
            </div>
          </div>

          <footer className="mt-8 pt-3 border-t border-hairline text-center">
            <p className="text-[10px] font-serif-note text-muted">
              &ldquo;Um dia de cada vez — mas com o portfólio inteiro à vista.&rdquo;
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
