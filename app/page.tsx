"use client";

import { useCallback, useMemo, useState, useSyncExternalStore, useEffect } from "react";
import { addDays, fmtLong, fmtShort, todayISO } from "@/lib/dates";
import { projectLeaves } from "@/lib/tree";
import { STATUS_META, STATUS_ORDER } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import type { ProjectStatus } from "@/lib/types";
import { DayDemandsPanel, PrioritiesPanel, TodayPanel } from "@/components/DayColumn";
import { ProjectCard, ProjectForm } from "@/components/ProjectCard";
import { SortableProjectList } from "@/components/SortableProjectList";
import { ObjetivosBlock } from "@/components/ObjetivoCard";
import { Planner } from "@/components/Planner";
import { FollowupsPanel } from "@/components/FollowupsPanel";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { SummaryPanel, UpcomingPanel } from "@/components/SummaryColumn";
import { AuthGate, signOut } from "@/components/AuthGate";
import { Sidebar } from "@/components/Sidebar";
import { WelcomeTutorial } from "@/components/WelcomeTutorial";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  ClockWidget, QuoteWidget, WaterTrackerWidget, HabitsWidget,
  CountdownWidget, ShoppingWidget, ReadingWidget, WeeklyGoalsWidget,
  GoalsWidget, MiniCalendarWidget, ProgressChartWidget, QuickKanbanWidget,
  PomodoroWidget,
} from "@/components/BlockWidgets";
import {
  loadPlannerConfig, loadPlannerBlocks, savePlannerConfig, savePlannerBlocks,
  getActivePlannerId, DEFAULT_BLOCKS, loadPlanners, loadDefaultPlannerMeta,
  type PlannerBlock,
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

function Home({ mode }: { mode: "mock" | "supabase" }) {
  const store = useAppStore(mode);
  // Keep workspace for project filtering (internal, not exposed in sidebar)
  const workspace = "trabalho" as const;

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => todayISO());
  const [plannerBlocks, setPlannerBlocks] = useState<PlannerBlock[]>(DEFAULT_BLOCKS);
  const [activePlannerId, setActivePlannerIdState] = useState<string | null>(null);
  const [plannerName, setPlannerName] = useState("Planner");
  const [showTutorial, setShowTutorial] = useState(false);

  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  // Load planner config + name + check if tutorial should show
  useEffect(() => {
    const aid = getActivePlannerId();
    setActivePlannerIdState(aid);
    if (aid) {
      const ps = loadPlanners();
      const p = ps.find((pl) => pl.id === aid);
      setPlannerName(p?.name ?? "Planner");
      setPlannerBlocks(loadPlannerBlocks(aid));
    } else {
      const meta = loadDefaultPlannerMeta();
      setPlannerName(meta.name);
      setPlannerBlocks(loadPlannerConfig());
    }
    if (!localStorage.getItem("welcome_seen")) {
      setShowTutorial(true);
    }
  }, []);

  const today = todayISO();

  const prevDay = () => setViewDate((d) => addDays(d, -1));
  const nextDay = () => setViewDate((d) => addDays(d, 1));

  const wsProjects = useMemo(
    () =>
      store.projects
        .filter((p) => p.workspace === workspace && p.kind !== "objetivo")
        .sort((a, b) => (a.priorityOrder ?? 0) - (b.priorityOrder ?? 0)),
    [store.projects, workspace]
  );

  const visibleProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wsProjects.filter((p) => {
      if (p.archived !== showArchived) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (q) {
        const inProject = p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
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

  // Dynamic visible blocks
  const activeBlocks = useMemo(
    () => plannerBlocks.filter((b) => b.visible),
    [plannerBlocks]
  );

  const hasProjectsBlock = useMemo(
    () => activeBlocks.some((b) => b.type === "projects"),
    [activeBlocks]
  );

  const col1Blocks = useMemo(
    () => activeBlocks.filter((b) => b.column === 1).sort((a, b) => a.order - b.order),
    [activeBlocks]
  );
  const col2Blocks = useMemo(
    () => activeBlocks.filter((b) => b.column === 2).sort((a, b) => a.order - b.order),
    [activeBlocks]
  );
  const col3Blocks = useMemo(
    () => activeBlocks.filter((b) => b.column === 3).sort((a, b) => a.order - b.order),
    [activeBlocks]
  );

  const handleSwitchPlanner = useCallback((id: string | null) => {
    setActivePlannerIdState(id);
    if (id) {
      const ps = loadPlanners();
      const p = ps.find((pl) => pl.id === id);
      setPlannerName(p?.name ?? "Planner");
      setPlannerBlocks(loadPlannerBlocks(id));
    } else {
      const meta = loadDefaultPlannerMeta();
      setPlannerName(meta.name);
      setPlannerBlocks(loadPlannerConfig());
    }
  }, []);

  const handlePlannerNameChange = useCallback((name: string) => {
    setPlannerName(name);
  }, []);

  const handleBlocksChange = useCallback((blocks: PlannerBlock[]) => {
    setPlannerBlocks(blocks);
    if (activePlannerId) {
      savePlannerBlocks(activePlannerId, blocks);
    } else {
      savePlannerConfig(blocks);
    }
  }, [activePlannerId]);

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
      case "activities":
        return <ActivitiesPanel store={store} workspace={workspace} projects={nonArchived} />;
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
      case "objetivo":
        return <ObjetivosBlock store={store} workspace={workspace} showArchived={showArchived} />;
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

  const hasDayBlocks = col1Blocks.some((b) =>
    ["priorities", "today", "quick-tasks"].includes(b.type)
  );

  return (
    <>
      {/* Welcome tutorial */}
      {showTutorial && mounted && (
        <WelcomeTutorial onClose={() => setShowTutorial(false)} />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePlannerId={activePlannerId}
        onSwitchPlanner={handleSwitchPlanner}
        onBlocksChange={handleBlocksChange}
        onNameChange={handlePlannerNameChange}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />

      <main className="min-h-screen bg-kraft py-4 px-2 sm:py-8 sm:px-4">
        <div className="mx-auto max-w-[1440px] bg-paper border border-hairline px-4 py-6 sm:px-8 sm:py-8 rounded-3xl shadow-[0_4px_40px_rgba(180,140,60,0.1),0_1px_8px_rgba(0,0,0,0.05)]">

          {/* Cabeçalho */}
          <header className="text-center relative">
            <div className="flex items-center justify-between sm:block">
              <button
                className="sm:absolute sm:left-0 sm:top-0 ink-btn py-2 px-3 sm:px-4 text-[12px] shrink-0"
                onClick={() => setSidebarOpen(true)}
                title="Abrir menu"
              >
                ☰ menu
              </button>

              <h1 className="flex-1 text-base sm:text-2xl md:text-3xl font-semibold uppercase tracking-[0.15em] sm:tracking-[0.3em] font-serif-note not-italic px-2 sm:px-24 leading-tight truncate">
                {plannerName}
              </h1>

              {mode === "supabase" ? (
                <button
                  className="sm:absolute sm:right-0 sm:top-0 ink-btn py-2 px-3 sm:px-4 text-[12px] shrink-0"
                  onClick={signOut}
                >
                  sair
                </button>
              ) : (
                <span className="sm:absolute sm:right-0 sm:top-0 text-[9px] uppercase tracking-wider text-muted border border-dashed border-hairline px-2 sm:px-3 py-1.5 rounded-full shrink-0">
                  demo
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-[12px] font-serif-note text-muted mt-1">{fmtLong(today)}</p>

            {/* Status + Busca — alinhados à esquerda */}
            <div className="mt-5 flex items-center gap-2">
              {overdueCount > 0 ? (
                <span className="text-[10px] uppercase tracking-wider text-paper bg-alert px-3 py-1.5 font-semibold rounded-full shrink-0">
                  ⚠ {overdueCount} {overdueCount === 1 ? "atrasada" : "atrasadas"}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-muted border border-hairline px-3 py-1.5 rounded-full shrink-0">
                  ✓ em dia
                </span>
              )}
              <input
                className="ink-input !w-[180px] sm:!w-[240px]"
                placeholder="buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </header>

          {/* Colunas dinâmicas */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1fr] gap-5 items-start">

            {/* Coluna 1 */}
            <div className="flex flex-col gap-4">
              {hasDayBlocks && (
                <div className="bg-paper border border-hairline px-4 py-3 flex items-center justify-between rounded-2xl shadow-sm">
                  <button className="ink-btn py-1.5 px-3" onClick={prevDay}>←</button>
                  <div className="text-center">
                    <p className="text-[12px] font-semibold uppercase tracking-wider">
                      {viewDate === today ? "Hoje" : fmtShort(viewDate)}
                    </p>
                    {viewDate !== today && (
                      <button className="text-[9px] text-muted underline" onClick={() => setViewDate(today)}>
                        voltar para hoje
                      </button>
                    )}
                  </div>
                  <button className="ink-btn py-1.5 px-3" onClick={nextDay}>→</button>
                </div>
              )}
              {col1Blocks.map((block) => {
                const content = renderBlockContent(block);
                if (!content) return null;
                return (
                  <div
                    key={block.id}
                    style={block.accentColor ? { "--section-color": block.accentColor } as React.CSSProperties : undefined}
                  >
                    {content}
                  </div>
                );
              })}
            </div>

            {/* Coluna 2 */}
            <div className="flex flex-col gap-4">
              {col2Blocks.map((block) => {
                const colorStyle = block.accentColor ? { "--section-color": block.accentColor } as React.CSSProperties : undefined;
                if (block.type === "projects") {
                  return (
                    <div key={block.id} className="flex flex-col gap-4" style={colorStyle}>
                      {/* Controles do bloco Projetos */}
                      <div className="flex flex-wrap items-center gap-2">
                        {!creating && (
                          <button className="ink-btn ink-btn-solid text-[10px]" onClick={() => setCreating(true)}>
                            + novo projeto
                          </button>
                        )}
                        <button
                          className={`text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
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
                          const isActive = statusFilter === s;
                          return (
                            <button
                              key={s}
                              className="text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all"
                              style={
                                isActive
                                  ? { background: STATUS_META[s].color, borderColor: STATUS_META[s].color, color: "#FAF8F3" }
                                  : { borderColor: "#D9D2C2", color: STATUS_META[s].color }
                              }
                              onClick={() => setStatusFilter(isActive ? null : s)}
                            >
                              {STATUS_META[s].label} · {n}
                            </button>
                          );
                        })}
                      </div>

                      {/* Formulário de novo projeto */}
                      {creating && (
                        <div>
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
                              kind: "projeto",
                            }}
                            onSave={(data) => { store.addProject(data); setCreating(false); }}
                            onCancel={() => setCreating(false)}
                          />
                        </div>
                      )}

                      {visibleProjects.length === 0 && !creating && (
                        <div className="bg-paper border border-hairline p-6 text-center">
                          <p className="text-[12px] font-serif-note text-muted">
                            {showArchived
                              ? "Nenhum projeto arquivado aqui."
                              : "Nenhum projeto neste filtro."}
                          </p>
                        </div>
                      )}
                      <SortableProjectList projects={visibleProjects} store={store} />
                    </div>
                  );
                }
                const content = renderBlockContent(block);
                if (!content) return null;
                return <div key={block.id} style={colorStyle}>{content}</div>;
              })}
            </div>

            {/* Coluna 3 */}
            <div className="flex flex-col gap-4">
              {col3Blocks.map((block) => {
                const content = renderBlockContent(block);
                if (!content) return null;
                return (
                  <div
                    key={block.id}
                    style={block.accentColor ? { "--section-color": block.accentColor } as React.CSSProperties : undefined}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="mt-10 pt-4 border-t border-hairline text-center">
            <p className="text-[10px] font-serif-note text-muted">
              &ldquo;Um dia de cada vez — mas com o portfólio inteiro à vista.&rdquo;
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
